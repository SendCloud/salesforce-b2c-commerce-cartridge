'use strict';

/* global describe beforeEach it */

var assert = require('chai').assert;
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

/**
 * Returns an object with an oterator function for the specified array.
 * This canbe used as mock for dw.util.Collection.
 * @param {Array} items - The items for the list
 * @returns {Object} An object with iterator function
 */
function getList(items) {
    return {
        length: items.length,
        iterator: function () {
            var i = 0;
            return {
                hasNext: function () {
                    return i < items.length;
                },
                next: function () {
                    return items[i++];
                }
            };
        }
    };
}

describe('sendcloudNotificationHelpers', function () {
    var sitePreferences = {};
    var inTransaction = false;
    var createdCustomObject = null;
    var connectionCustomObject = null;
    var notificationCustomObject = null;
    var order = null;
    var warnings = [];
    var errors = [];

    var macDigestSpy = sinon.spy(function () { return 'BYTES_' + this.algorithm; });
    var Mac = function (algorithm) { this.algorithm = algorithm; };
    Mac.HMAC_SHA_256 = 'HmacSHA256';
    Mac.prototype.digest = macDigestSpy;

    var sendcloudNotificationHelpers = proxyquire('../../../../../cartridges/int_sendcloud/cartridge/scripts/helpers/sendcloudNotificationHelpers', {
        'dw/object/CustomObjectMgr': {
            createCustomObject: function (type, keyValue) {
                createdCustomObject = {
                    ID: keyValue,
                    custom: {},
                    test: {
                        type: type,
                        inTransaction: inTransaction
                    }
                };
                return createdCustomObject;
            },
            getCustomObject: function (type, keyValue) {
                if (type === 'SendcloudConnection' && keyValue === 'CONNECTION') {
                    return connectionCustomObject;
                }
                if (type === 'SendcloudNotification') {
                    return notificationCustomObject;
                }
                return null;
            }
        },
        'dw/crypto/Encoding': {
            toHex: function (bytes) {
                if (bytes === 'BYTES_HmacSHA256') return 'SIGNATURE';
                return null;
            }
        },
        'dw/crypto/Mac': Mac,
        'dw/system/Transaction': {
            wrap: function (func) {
                inTransaction = true;
                var result = func();
                inTransaction = false;
                return result;
            }
        },
        'dw/util/UUIDUtils': {
            createUUID: function () {
                return 'NEW_UUID';
            }
        },
        'dw/order/OrderMgr': {
            getOrder: function () {
                return order;
            }
        },
        'dw/util/StringUtils': {
            encodeBase64: function (input) {
                return 'BASE64ENCODED_' + input;
            }
        },
        'dw/system/Site': {
            current: {
                getCustomPreferenceValue: function (key) {
                    return sitePreferences[key];
                }
            }
        },
        'dw/system/Logger': {
            getLogger: function () {
                return {
                    error: function (msg, arg) {
                        if (arg) msg = msg.replace('{0}', arg); // eslint-disable-line no-param-reassign
                        errors.push(msg);
                    },
                    warn: function (msg, arg) {
                        if (arg) msg = msg.replace('{0}', arg); // eslint-disable-line no-param-reassign
                        warnings.push(msg);
                    },
                    info: function () {}
                };
            }
        },
        '*/cartridge/scripts/order/orderHelpers': {
            addOrderNotes: function (lineItemCtnr, title, message) {
                lineItemCtnr.notes.push({
                    title: title,
                    message: message
                });
            }
        }
    });

    beforeEach(function () {
        sitePreferences = {};
        createdCustomObject = null;
        order = null;
        connectionCustomObject = null;
        notificationCustomObject = null;
        macDigestSpy.reset();
        warnings = [];
        errors = [];
    });

    describe('validateSignature', function () {
        it('Should return true if no connection custom object is present', function () {
            var req = {};
            var result = sendcloudNotificationHelpers.validateSignature(req);
            assert.isTrue(result, 'Result is not correct');
        });

        it('Should return true if connection custom object is present but validation is disabled until next job run', function () {
            connectionCustomObject = { custom: { allowNewIntegration: { value: 'ENABLED_UNTIL_NEXT_JOB_RUN' } } };
            var req = {};
            var result = sendcloudNotificationHelpers.validateSignature(req);
            assert.isTrue(result, 'Result is not correct');
        });

        it('Should return true if connection custom object is present but validation is disabled until the integration is established', function () {
            connectionCustomObject = { custom: { allowNewIntegration: { value: 'ENABLED_UNTIL_INTEGRATION_ESTABLISHED' } } };
            var req = {};
            var result = sendcloudNotificationHelpers.validateSignature(req);
            assert.isTrue(result, 'Result is not correct');
        });

        it('Should return true if connection custom object is present and validation is not disabled and signature is correct', function () {
            connectionCustomObject = {
                custom: {
                    allowNewIntegration: { value: 'DISABLED' },
                    secretKey: 'SECRET_KEY'
                }
            };
            var req = {
                body: 'BODY',
                httpHeaders: {
                    'sendcloud-signature': 'SIGNATURE'
                }
            };
            var result = sendcloudNotificationHelpers.validateSignature(req);
            assert.isTrue(result, 'Result is not correct');
            assert.isTrue(macDigestSpy.withArgs('BODY', 'SECRET_KEY').calledOnce, 'Mac.digest should be called once with correct arguments');
        });

        it('Should return false if connection custom object is present and validation is not disabled and signature is not correct', function () {
            connectionCustomObject = {
                custom: {
                    allowNewIntegration: { value: 'DISABLED' },
                    secretKey: ''
                }
            };
            var req = {
                body: 'BODY',
                httpHeaders: {
                    'sendcloud-signature': 'OTHERSIGNATURE'
                }
            };
            var result = sendcloudNotificationHelpers.validateSignature(req);
            assert.isFalse(result, 'Result is not correct');
            assert.isTrue(macDigestSpy.withArgs('BODY', '').calledOnce, 'Mac.digest should be called once with correct arguments');
            assert.equal(warnings.length, 1, 'A warning should be logged');
            assert.notEqual(warnings[0].indexOf('Secret key is not configured'), -1, 'The logged warning is not correct');
        });
    });

    describe('storeNotification', function () {
        it('Should return error if body is not valid JSON', function () {
            var notificationJson = '{';
            var result = sendcloudNotificationHelpers.storeNotification(notificationJson);
            assert.isNotNull(result, 'Result should not be null');
            assert.isTrue(result.error, 'An error should be returned');
            assert.equal(result.errorCode, 'invalid.request.body', 'Unexpected errorCode');
            assert.equal(errors.length, 1, 'An error should be logged');
        });

        it('Should create custom object if body is valid JSON without timestamp', function () {
            var notificationJson = '{ "test": true }';
            var result = sendcloudNotificationHelpers.storeNotification(notificationJson);
            assert.isNotNull(result, 'Result should not be null');
            assert.isFalse(result.error, 'An error should not be returned');
            assert.isNotNull(createdCustomObject, 'Custom object should be created');
            assert.equal(createdCustomObject.test.type, 'SendcloudNotification', 'Custom object should be of type SendcloudNotification');
            assert.isTrue(createdCustomObject.test.inTransaction, 'Custom object should be created in a transaction');
            assert.equal(createdCustomObject.ID, createdCustomObject.custom.timestamp + '_NEW_UUID', 'ID of created custom object should be a combination of timestamp and a new UUID');
            assert.equal(createdCustomObject.custom.message, notificationJson, 'Message of created custom object is not correct');
            assert.equal(createdCustomObject.custom.processStatus, 'NEW', 'Process status of created custom object is not correct');
            assert.equal(createdCustomObject.custom.timestamp.length, 13, 'Timestamp of created custom object is not correct');
        });

        it('Should create custom object if body is valid JSON with timestamp', function () {
            var notificationJson = '{ "test": true, "timestamp": 1525271885993 }';
            var result = sendcloudNotificationHelpers.storeNotification(notificationJson);
            assert.isNotNull(result, 'Result should not be null');
            assert.isFalse(result.error, 'An error should not be returned');
            assert.isNotNull(createdCustomObject, 'Custom object should be created');
            assert.equal(createdCustomObject.test.type, 'SendcloudNotification', 'Custom object should be of type SendcloudNotification');
            assert.isTrue(createdCustomObject.test.inTransaction, 'Custom object should be created in a transaction');
            assert.equal(createdCustomObject.ID, '1525271885993_NEW_UUID', 'ID of created custom object should be a combination of timestamp and a new UUID');
            assert.equal(createdCustomObject.custom.message, notificationJson, 'Message of created custom object is not correct');
            assert.equal(createdCustomObject.custom.processStatus, 'NEW', 'Process status of created custom object is not correct');
            assert.equal(createdCustomObject.custom.timestamp, '1525271885993', 'Timestamp of created custom object is not correct');
        });

        it('Should update custom object if custom object exists', function () {
            notificationCustomObject = { custom: {} };
            var customObjectId = 'CO_ID';
            var notificationJson = '{ "test": true }';
            var result = sendcloudNotificationHelpers.storeNotification(notificationJson, customObjectId);
            assert.isNotNull(result, 'Result should not be null');
            assert.isFalse(result.error, 'An error should not be returned');
            assert.isNull(createdCustomObject, 'Custom object should not be created');
            assert.equal(notificationCustomObject.custom.message, notificationJson, 'Message of created custom object is not correct');
            assert.equal(notificationCustomObject.custom.processStatus, 'NEW', 'Process status of created custom object is not correct');
            assert.equal(notificationCustomObject.custom.timestamp.length, 13, 'Timestamp of created custom object is not correct');
        });
    });

    describe('processNotification', function () {
        it('For action `integration_credentials` values should be set to new custom object if custom object does not exist', function () {
            var notification = {
                action: 'integration_credentials',
                integration_id: 123,
                public_key: 'PUBLIC_KEY',
                secret_key: 'SECRET_KEY'
            };
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isTrue(result.success, 'Result.success is not correct');
            assert.isTrue(result.updateNotification, 'Result.updateNotification is not correct');
            assert.isNotNull(createdCustomObject, 'New custom object should be created');
            assert.equal(createdCustomObject.custom.integrationID, 123, 'Attribute integrationID is not correct on connection custom object');
            assert.equal(createdCustomObject.custom.publicKey, 'PUBLIC_KEY', 'Attribute publicKey is not correct on connection custom object');
            assert.equal(createdCustomObject.custom.secretKey, 'SECRET_KEY', 'Attribute secretKey is not correct on connection custom object');
            assert.equal(createdCustomObject.custom.allowNewIntegration, 'DISABLED', 'Attribute allowNewIntegration is not correct on connection custom object');
            assert.equal(warnings.length, 1, 'A warning should be logged');
            assert.notEqual(warnings[0].indexOf('Sendcloud credentials have changed for integration ID'), -1, 'The warning is not correct');
        });

        it('For action `integration_credentials` values should be set to existing custom object if custom object does exist', function () {
            connectionCustomObject = { custom: {} };
            var notification = {
                action: 'integration_credentials',
                integration_id: 123,
                public_key: 'PUBLIC_KEY',
                secret_key: 'SECRET_KEY'
            };
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isTrue(result.success, 'Result.success is not correct');
            assert.isTrue(result.updateNotification, 'Result.updateNotification is not correct');
            assert.isNull(createdCustomObject, 'New custom object should not be created');
            assert.equal(connectionCustomObject.custom.integrationID, 123, 'Attribute integrationID is not correct on connection custom object');
            assert.equal(connectionCustomObject.custom.publicKey, 'PUBLIC_KEY', 'Attribute publicKey is not correct on connection custom object');
            assert.equal(connectionCustomObject.custom.secretKey, 'SECRET_KEY', 'Attribute secretKey is not correct on connection custom object');
            assert.equal(warnings.length, 1, 'A warning should be logged');
            assert.notEqual(warnings[0].indexOf('Sendcloud credentials have changed for integration ID'), -1, 'The warning is not correct');
        });

        it('For action `integration_connected` values should be set to new custom object if custom object does not exist', function () {
            var notification = {
                action: 'integration_connected',
                integration: {
                    id: 123,
                    service_point_enabled: true,
                    service_point_carriers: ['aa', 'bb']
                }
            };
            var stringifiedNotification = JSON.stringify(notification);
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isTrue(result.success, 'Result.success is not correct');
            assert.isTrue(result.updateNotification, 'Result.updateNotification is not correct');
            assert.isNotNull(createdCustomObject, 'New custom object should be created');
            assert.equal(createdCustomObject.custom.integrationID, 123, 'Attribute integrationID is not correct on connection custom object');
            assert.isTrue(createdCustomObject.custom.servicePointEnabled, 'Attribute servicePointEnabled is not correct on connection custom object');
            assert.deepEqual(createdCustomObject.custom.servicePointCarriers, ['aa', 'bb'], 'Attribute servicePointCarriers is not correct on connection custom object');
            assert.equal(warnings.length, 1, 'A warning should be logged');
            assert.notEqual(warnings[0].indexOf(stringifiedNotification), -1, 'The warning should contain the message');
        });

        it('For action `integration_connected` values should be set to existing custom object if custom object does exist', function () {
            connectionCustomObject = { custom: {} };
            var notification = {
                action: 'integration_connected',
                integration: {
                    id: 123,
                    service_point_enabled: false,
                    service_point_carriers: []
                }
            };
            var stringifiedNotification = JSON.stringify(notification);
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isTrue(result.success, 'Result.success is not correct');
            assert.isTrue(result.updateNotification, 'Result.updateNotification is not correct');
            assert.isNull(createdCustomObject, 'New custom object should not be created');
            assert.equal(connectionCustomObject.custom.integrationID, 123, 'Attribute integrationID is not correct on connection custom object');
            assert.isFalse(connectionCustomObject.custom.servicePointEnabled, 'Attribute servicePointEnabled is not correct on connection custom object');
            assert.deepEqual(connectionCustomObject.custom.servicePointCarriers, [], 'Attribute servicePointCarriers is not correct on connection custom object');
            assert.equal(warnings.length, 1, 'A warning should be logged');
            assert.notEqual(warnings[0].indexOf(stringifiedNotification), -1, 'The warning should contain the message');
        });

        it('For action `integration_deleted` a log entry should be written and a custom object should be created if site preference is enabled', function () {
            sitePreferences.sendcloudCheckoutImportShippingMethods = true;
            var notification = {
                action: 'integration_deleted',
                test: 'TEST'
            };
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isTrue(result.success, 'Result.success is not correct');
            assert.isTrue(result.updateNotification, 'Result.updateNotification is not correct');
            assert.isTrue(result.updateCheckoutConfiguration, 'Result.updateCheckoutConfiguration is not correct');
            assert.isNotNull(createdCustomObject, 'New custom object should be created');
            assert.equal(createdCustomObject.test.type, 'SendcloudNotification', 'Custom object should be of type SendcloudNotification');
            assert.isTrue(createdCustomObject.test.inTransaction, 'Custom object should be created in a transaction');
            assert.equal(createdCustomObject.ID, 'CHECKOUT_CONFIGURATION', 'ID of created custom object is not correct');
            assert.equal(createdCustomObject.custom.message, '{ "action": "delete_checkout_configuration" }', 'Message of created custom object is not correct');
            assert.equal(createdCustomObject.custom.processStatus, 'NEW', 'Process status of created custom object is not correct');
            assert.equal(createdCustomObject.custom.timestamp.length, 13, 'Timestamp of created custom object is not correct');
            assert.equal(warnings.length, 1, 'A warning should be logged');
            assert.equal(warnings[0], 'Sendcloud integration has been deleted', 'The warning is not correct');
        });

        it('For action `integration_deleted` a log entry should be written and no custom object should be created if site preference is disabled', function () {
            sitePreferences.sendcloudCheckoutImportShippingMethods = false;
            var notification = {
                action: 'integration_deleted',
                test: 'TEST'
            };
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isTrue(result.success, 'Result.success is not correct');
            assert.isTrue(result.updateNotification, 'Result.updateNotification is not correct');
            assert.isFalse(result.updateCheckoutConfiguration, 'Result.updateCheckoutConfiguration is not correct');
            assert.isNull(createdCustomObject, 'New custom object should not be created');
            assert.equal(warnings.length, 1, 'A warning should be logged');
            assert.equal(warnings[0], 'Sendcloud integration has been deleted', 'The warning is not correct');
        });

        it('For action `parcel_status_changed` a warning should be logged if no parcel data is present', function () {
            var notification = {
                action: 'parcel_status_changed'
            };
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isFalse(result.success, 'Result.success is not correct');
            assert.equal(warnings.length, 1, 'A warning should be logged');
            assert.notEqual(warnings[0].indexOf('received without an order_number'), -1, 'The warning is not correct');
        });

        it('For action `parcel_status_changed` a warning should be logged if no order number is present', function () {
            var notification = {
                action: 'parcel_status_changed',
                parcel: {
                    order_number: ''
                }
            };
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isFalse(result.success, 'Result.success is not correct');
            assert.equal(warnings.length, 1, 'A warning should be logged');
            assert.notEqual(warnings[0].indexOf('received without an order_number'), -1, 'The warning is not correct');
        });

        it('For action `parcel_status_changed` a warning should be logged if order number cannot be found', function () {
            order = null;
            var notification = {
                action: 'parcel_status_changed',
                parcel: {
                    order_number: '123'
                }
            };
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isFalse(result.success, 'Result.success is not correct');
            assert.equal(warnings.length, 1, 'A warning should be logged');
            assert.notEqual(warnings[0].indexOf('unknown order_number'), -1, 'The warning is not correct');
        });

        it('For action `parcel_status_changed` a warning should be logged if shipment UUID cannot be found', function () {
            order = {
                shipments: getList([
                    { custom: {} },
                    { custom: {} }
                ])
            };
            var notification = {
                action: 'parcel_status_changed',
                parcel: {
                    order_number: '123',
                    shipment_uuid: 'abc'
                }
            };
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isFalse(result.success, 'Result.success is not correct');
            assert.equal(warnings.length, 1, 'A warning should be logged');
            assert.notEqual(warnings[0].indexOf('unknown shipment UUID'), -1, 'The warning is not correct');
        });

        it('For action `parcel_status_changed` status and tracking number should be stored on shipment if order and shipment exist', function () {
            sitePreferences = { sendcloudLogApiOrderNotes: false };
            var shipment = { custom: { sendcloudShipmentUUID: 'abc' } };
            order = {
                shipments: getList([
                    { custom: { sendcloudShipmentUUID: 'def' } },
                    shipment
                ]),
                notes: []
            };
            var notification = {
                action: 'parcel_status_changed',
                parcel: {
                    order_number: '123',
                    shipment_uuid: 'abc',
                    status: { id: 456 },
                    tracking_number: 'TRACKNR',
                    tracking_url: 'TRACKURL'
                }
            };
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isTrue(result.success, 'Result.success is not correct');
            assert.isTrue(result.updateNotification, 'Result.updateNotification is not correct');
            assert.equal(warnings.length, 0, 'A warning should not be logged');
            assert.equal(shipment.custom.sendcloudStatus, 456, 'The sendcloudStatus is not correct');
            assert.equal(shipment.custom.sendcloudTrackingNumber, 'TRACKNR', 'The sendcloudTrackingNumber is not correct');
            assert.equal(shipment.custom.sendcloudTrackingUrl, 'TRACKURL', 'The sendcloudTrackingUrl is not correct');
            assert.equal(order.notes.length, 0, 'Note should not be added');
        });

        it('For action `parcel_status_changed` status and tracking number should be stored on shipment if order and default shipment exist', function () {
            sitePreferences = { sendcloudLogApiOrderNotes: true };
            var shipment = { custom: { sendcloudShipmentUUID: 'abc' } };
            order = {
                defaultShipment: shipment,
                shipments: getList([
                    shipment
                ]),
                notes: []
            };
            var notification = {
                action: 'parcel_status_changed',
                parcel: {
                    order_number: '123',
                    shipment_uuid: 'abc',
                    status: { id: 456 },
                    tracking_number: 'TRACKNR',
                    tracking_url: 'TRACKURL'
                }
            };
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isTrue(result.success, 'Result.success is not correct');
            assert.isTrue(result.updateNotification, 'Result.updateNotification is not correct');
            assert.equal(warnings.length, 0, 'A warning should not be logged');
            assert.equal(shipment.custom.sendcloudStatus, 456, 'The sendcloudStatus is not correct');
            assert.equal(shipment.custom.sendcloudTrackingNumber, 'TRACKNR', 'The sendcloudTrackingNumber is not correct');
            assert.equal(shipment.custom.sendcloudTrackingUrl, 'TRACKURL', 'The sendcloudTrackingUrl is not correct');
            assert.equal(order.notes.length, 1, 'Note should be added');
            assert.equal(order.notes[0].title, 'Sendcloud notification: parcel status changed', 'Order title is not correct');
            assert.equal(order.notes[0].message, JSON.stringify(notification, null, '  '), 'Order message is not correct');
        });

        it('For action `put_checkout_configuration` correct values should be returned when site preference is enabled', function () {
            sitePreferences = {
                sendcloudCheckoutImportShippingMethods: true
            };
            var notification = {
                action: 'put_checkout_configuration',
                payload: 'TEST'
            };
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isTrue(result.success, 'Result.success is not correct');
            assert.isFalse(result.updateNotification, 'Result.updateNotification is not correct');
            assert.isTrue(result.updateCheckoutConfiguration, 'Result.updateCheckoutConfiguration is not correct');
            assert.isNull(createdCustomObject, 'New custom object should not be created');
            assert.equal(warnings.length, 0, 'No warning should be logged');
        });

        it('For action `put_checkout_configuration` correct values should be returned when site preference is disabled', function () {
            sitePreferences = {
                sendcloudCheckoutImportShippingMethods: false
            };
            var notification = {
                action: 'put_checkout_configuration',
                payload: 'TEST'
            };
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isTrue(result.success, 'Result.success is not correct');
            assert.isTrue(result.updateNotification, 'Result.updateNotification is not correct');
            assert.isFalse(result.updateCheckoutConfiguration, 'Result.updateCheckoutConfiguration is not correct');
            assert.isNull(createdCustomObject, 'New custom object should not be created');
            assert.equal(warnings.length, 0, 'No warning should be logged');
        });

        it('For action `delete_checkout_configuration` correct values should be returned when site preference is enabled', function () {
            sitePreferences = {
                sendcloudCheckoutImportShippingMethods: true
            };
            var notification = {
                action: 'delete_checkout_configuration'
            };
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isTrue(result.success, 'Result.success is not correct');
            assert.isFalse(result.updateNotification, 'Result.updateNotification is not correct');
            assert.isTrue(result.updateCheckoutConfiguration, 'Result.updateCheckoutConfiguration is not correct');
            assert.isNull(createdCustomObject, 'New custom object should not be created');
            assert.equal(warnings.length, 0, 'No warning should be logged');
        });

        it('For action `delete_checkout_configuration` correct values should be returned when site preference is disabled', function () {
            sitePreferences = {
                sendcloudCheckoutImportShippingMethods: false
            };
            var notification = {
                action: 'delete_checkout_configuration'
            };
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isTrue(result.success, 'Result.success is not correct');
            assert.isTrue(result.updateNotification, 'Result.updateNotification is not correct');
            assert.isFalse(result.updateCheckoutConfiguration, 'Result.updateCheckoutConfiguration is not correct');
            assert.isNull(createdCustomObject, 'New custom object should not be created');
            assert.equal(warnings.length, 0, 'No warning should be logged');
        });

        it('For unknown actions no action should be taken', function () {
            var notification = {
                action: 'dummy'
            };
            var result = sendcloudNotificationHelpers.processNotification(notification);
            assert.isNotNull(result, 'Result is not correct');
            assert.isTrue(result.success, 'Result.success is not correct');
            assert.isTrue(result.updateNotification, 'Result.updateNotification is not correct');
            assert.isNull(createdCustomObject, 'New custom object should not be created');
            assert.equal(warnings.length, 0, 'No warning should be logged');
        });
    });
});
