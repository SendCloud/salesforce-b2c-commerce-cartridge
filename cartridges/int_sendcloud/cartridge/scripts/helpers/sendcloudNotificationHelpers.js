'use strict';

var Logger = require('dw/system/Logger');
var sendcloudLog = Logger.getLogger('sendcloud', 'sendcloud');

/**
 * Verifies if the signature of this request is valid.
 * @param {Object} req - The SFRA request object
 * @returns {boolean} If the signature is valid
 */
function validateSignature(req) {
    // If no custom object is present or if it is configured to not validate the signature this means that
    // a new integration will be set up and we will receive messages that contain details of this new integration
    // which will contain a new signature. Until that is received we cannot validate signatures.
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var connectionObj = CustomObjectMgr.getCustomObject('SendcloudConnection', 'CONNECTION');
    if (connectionObj && connectionObj.custom.allowNewIntegration.value === 'DISABLED') {
        // determine secret key
        var secretKey = connectionObj.custom.secretKey;
        if (!secretKey) {
            sendcloudLog.warn('Secret key is not configured on SendcloudConnection custom object.');
        }

        // calculate the signature
        var Encoding = require('dw/crypto/Encoding');
        var Mac = require('dw/crypto/Mac');
        var mac = new Mac(Mac.HMAC_SHA_256);
        var calculatedSignature = Encoding.toHex(mac.digest(req.body, secretKey));

        // validate the signature
        return calculatedSignature === req.httpHeaders['sendcloud-signature'];
    }
    return true;
}
module.exports.validateSignature = validateSignature;

/**
 * Stores the notification message as a custom object.
 * @param {Object} notificationJson - The JSON of the notification to store
 * @param {string} id - The ID for the custom object, optional, defaults to a generated ID
 * @returns {Object} Status indicating if the message was stored successfully
 */
function storeNotification(notificationJson, id) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');
    var UUIDUtils = require('dw/util/UUIDUtils');

    var notification;
    try {
        notification = JSON.parse(notificationJson);
    } catch (e) {
        sendcloudLog.error('Parsing of Sendcloud notification \'{0}\' has failed: {1}.', notificationJson, e);
        return {
            error: true,
            errorCode: 'invalid.request.body'
        };
    }

    var timestamp = (notification.timestamp || new Date().getTime()).toFixed(0);
    var customObjectId = id || (timestamp + '_' + UUIDUtils.createUUID());

    Transaction.wrap(function () {
        var notificationObj = CustomObjectMgr.getCustomObject('SendcloudNotification', customObjectId) || CustomObjectMgr.createCustomObject('SendcloudNotification', customObjectId);
        notificationObj.custom.message = notificationJson;
        notificationObj.custom.processStatus = 'NEW';
        notificationObj.custom.timestamp = timestamp;
    });

    return {
        error: false
    };
}
module.exports.storeNotification = storeNotification;

/**
 * Process a SendcloudNotification of type 'integration_credentials'.
 * @param {Object} notification - The notification message to process
 * @returns {Object} Status object indicating if the processing was successful
 */
function processIntegrationCredentialsNotification(notification) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');

    // store the credentials in a custom object
    Transaction.wrap(function () {
        var connectionObj = CustomObjectMgr.getCustomObject('SendcloudConnection', 'CONNECTION') || CustomObjectMgr.createCustomObject('SendcloudConnection', 'CONNECTION');
        connectionObj.custom.integrationID = notification.integration_id;
        connectionObj.custom.publicKey = notification.public_key;
        connectionObj.custom.secretKey = notification.secret_key;
        connectionObj.custom.allowNewIntegration = 'DISABLED';

        // write warning to log
        sendcloudLog.warn('Sendcloud credentials have changed for integration ID {0}', connectionObj.custom.integrationID.toFixed(0));
    });

    return {
        success: true,
        updateNotification: true
    };
}

/**
 * Process a SendcloudNotification of type 'integration_connected' or 'integration_updated'.
 * @param {Object} notification - The notification message to process
 * @returns {Object} Status object indicating if the processing was successful
 */
function processIntegrationConnectedNotification(notification) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');

    // store the details in a custom object
    Transaction.wrap(function () {
        var connectionObj = CustomObjectMgr.getCustomObject('SendcloudConnection', 'CONNECTION') || CustomObjectMgr.createCustomObject('SendcloudConnection', 'CONNECTION');
        connectionObj.custom.integrationID = notification.integration.id;
        connectionObj.custom.servicePointEnabled = notification.integration.service_point_enabled;
        connectionObj.custom.servicePointCarriers = notification.integration.service_point_carriers;

        // write warning to log
        sendcloudLog.warn('Sendcloud integration has changed: {0}', JSON.stringify(notification));
    });

    return {
        success: true,
        updateNotification: true
    };
}

/**
 * Process a SendcloudNotification of type 'integration_deleted'.
 * @returns {Object} Status object indicating if the processing was successful
 */
function processIntegrationDeletedNotification() {
    var Site = require('dw/system/Site');
    var importShippingMethods = Site.current.getCustomPreferenceValue('sendcloudCheckoutImportShippingMethods') || false;

    // write warning to log
    sendcloudLog.warn('Sendcloud integration has been deleted');

    // delete connection details if present
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var connectionObj = CustomObjectMgr.getCustomObject('SendcloudConnection', 'CONNECTION');
    if (connectionObj) {
        var Transaction = require('dw/system/Transaction');
        Transaction.wrap(function () {
            CustomObjectMgr.remove(connectionObj);
        });
    }

    // checkout configuration also needs to be deleted if so configured
    if (importShippingMethods) {
        storeNotification('{ "action": "delete_checkout_configuration" }', 'CHECKOUT_CONFIGURATION');
    }
    return {
        success: true,
        updateNotification: true,
        updateCheckoutConfiguration: importShippingMethods
    };
}

/**
 * Process a SendcloudNotification of type 'parcel_status_changed'.
 * @param {Object} notification The notification message to process
 * @returns {boolean} If the processing was successful
 */
function processParcelStatusChangedNotification(notification) {
    // lookup order
    var parcelData = notification.parcel;
    if (!parcelData || !parcelData.order_number) {
        sendcloudLog.warn('Notification of type \'parcel_status_changed\' is received without an order_number');
        return {
            success: false
        };
    }

    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(parcelData.order_number);
    if (!order) {
        sendcloudLog.warn('Notification of type \'parcel_status_changed\' is received with an unknown order_number: {0}', parcelData.order_number);
        return {
            success: false
        };
    }

    // find shipment
    var shipment = null;
    if (order.shipments.length === 1) {
        // in case of single shipment just use that one
        shipment = order.defaultShipment;
    } else {
        var shipments = order.shipments.iterator();
        while (shipments.hasNext()) {
            var shpmt = shipments.next();
            if (shpmt.custom.sendcloudShipmentUUID === parcelData.shipment_uuid) {
                shipment = shpmt;
                break;
            }
        }
    }

    if (!shipment) {
        sendcloudLog.warn('Notification of type \'parcel_status_changed\' is received for order {0} with an unknown shipment UUID: {1}', parcelData.order_number, parcelData.shipment_uuid);
        return {
            success: false
        };
    }

    // update some custom attributes
    var Transaction = require('dw/system/Transaction');
    Transaction.wrap(function () {
        if (parcelData.status && typeof parcelData.status.id === 'number') {
            shipment.custom.sendcloudStatus = parcelData.status.id;
        }
        if (parcelData.tracking_number) {
            shipment.custom.sendcloudTrackingNumber = parcelData.tracking_number;
            shipment.custom.sendcloudTrackingUrl = parcelData.tracking_url;
        }
    });

    // log the notification as a note on the order, if so configured
    var Site = require('dw/system/Site');
    var logApiOrderNotes = Site.current.getCustomPreferenceValue('sendcloudLogApiOrderNotes');
    if (logApiOrderNotes) {
        var orderHelpers = require('*/cartridge/scripts/order/orderHelpers');
        orderHelpers.addOrderNotes(order, 'Sendcloud notification: parcel status changed', JSON.stringify(notification, null, '  '));
    }

    return {
        success: true,
        updateNotification: true
    };
}

/**
 * Process a Sendcloud notification.
 * @param {Object} notification - The notification message to process
 * @returns {Object} Status object indicating if the processing was successful
 */
function processNotification(notification) {
    switch (notification.action) {
        case 'integration_credentials':
            return processIntegrationCredentialsNotification(notification);
        case 'integration_connected':
        case 'integration_updated':
            return processIntegrationConnectedNotification(notification);
        case 'integration_deleted':
            return processIntegrationDeletedNotification();
        case 'parcel_status_changed':
            return processParcelStatusChangedNotification(notification);
        case 'put_checkout_configuration':
        case 'delete_checkout_configuration':
            var Site = require('dw/system/Site');
            var importShippingMethods = Site.current.getCustomPreferenceValue('sendcloudCheckoutImportShippingMethods') || false;
            // we do not process this notificatino here, but in following step of this job
            if (!importShippingMethods) {
                sendcloudLog.info('Importing of Sendcloud checkout configuration is disabled on this instance, skipping `{0}` notification', notification.action);
            }
            return {
                success: true,
                // do not update custom object if checkout configuration needs to be updated, as that will be done in other job step
                updateNotification: !importShippingMethods,
                updateCheckoutConfiguration: importShippingMethods
            };
        default:
            // unsupported notification: return true so custom object will be removed
            return {
                success: true,
                updateNotification: true
            };
    }
}
module.exports.processNotification = processNotification;
