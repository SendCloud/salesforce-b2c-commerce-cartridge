'use strict';

var SERVICE_ID = 'int_sendcloud.http.post.exportOrder';

var Logger = require('dw/system/Logger');
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');
var sendcloudLog = Logger.getLogger('sendcloud', 'sendcloud');

/**
 * Returns the service callback.
 * @param {boolean} sendcloudLogApiOrderNotes - if API requests and responses should be logged as notes on the orders
 * @returns {dw.svc.ServiceCallback} The service callback
 */
function serviceCallback(sendcloudLogApiOrderNotes) {
    return {
        /**
         * Creates a request object to be used when calling the service.
         * @param {dw.svc.HTTPService} service - Service being executed
         * @param {Object} orderBatch - The batch of orders+shipments to export
         * @returns {string} Request body
         */
        createRequest: function (service, orderBatch) {
            // determine credentials
            var CustomObjectMgr = require('dw/object/CustomObjectMgr');
            var connectionObj = CustomObjectMgr.getCustomObject('SendcloudConnection', 'CONNECTION');
            if (!connectionObj) {
                throw new Error('Connection to Sendcloud is not configured');
            }

            // set correct ID in URL
            var url = service.getURL().replace('{id}', connectionObj.custom.integrationID);
            service.setURL(url);

            // set headers
            service.setRequestMethod('POST');
            service.addHeader('Authorization', 'Basic ' + StringUtils.encodeBase64(connectionObj.custom.publicKey + ':' + connectionObj.custom.secretKey));
            service.addHeader('Content-Type', 'application/json');
            service.addHeader('Accept', 'application/json');

            // create models
            var ShipmentModel = require('*/cartridge/models/sendcloud/shipment');
            var orderHelpers = require('*/cartridge/scripts/order/orderHelpers');
            var shipments = [];
            var keys = Object.keys(orderBatch);
            for (var i = 0; i < keys.length; i++) {
                var orderAndShipment = orderBatch[keys[i]];
                var shipmentModel = new ShipmentModel(orderAndShipment.order, orderAndShipment.shipment);

                if (!shipmentModel.isEmpty) {
                    sendcloudLog.info('Exporting order: ' + orderAndShipment.order.orderNo);
                    shipments.push(shipmentModel);
                    if (sendcloudLogApiOrderNotes) {
                        orderHelpers.addOrderNotes(orderAndShipment.order, 'Sendcloud shipment \'' + (orderAndShipment.shipment.ID) + '\' - request', JSON.stringify(shipmentModel, null, '  '));
                    }
                }
            }

            return JSON.stringify(shipments);
        },

        /**
         * Creates a response object from a successful service call.
         * @param {dw.svc.HTTPService} service - Service being executed
         * @param {dw.net.HTTPClient} client - The underlying HTTPClient object that made the HTTP call
         * @returns {Object} Object to return in the service call's Result
         */
        parseResponse: function (service, client) {
            return JSON.parse(client.text);
        },

        /**
         * Allows filtering communication URL, request, and response log messages.
         * @param {string} message - Original log message
         * @returns {string} Message to be logged
         */
        filterLogMessage: function (message) {
            var data;
            try {
                data = JSON.parse(message);
            } catch (e) {
                // not valid JSON, probably the URL
                return message;
            }

            if (data && data.length) {
                for (var i = 0; i < data; i++) {
                    var value = data[i];
                    if (value.address) value.address = '***';
                    if (value.address_2) value.address_2 = '***';
                    if (value.company_name) value.company_name = '***';
                    if (value.email) value.email = '***';
                    if (value.house_number) value.house_number = '***';
                    if (value.name) value.name = '***';
                    if (value.postal_code) value.postal_code = '***';
                    if (value.telephone) value.telephone = '***';
                    if (value.to_post_number) value.to_post_number = '***';
                }
            }

            return JSON.stringify(data);
        },

        /**
         * Mocks the remote portion of the service call.
         *
         * @param {dw.svc.HTTPService} service - Service being executed
         * @param {Object} requestObj - Request object returned by createRequest
         * @returns {Object} Mock response, to be sent to parseResponse
         */
        mockCall: function (service, requestObj) {
            var UUIDUtils = require('dw/util/UUIDUtils');
            var requestData = JSON.parse(requestObj);
            var responseObj = requestData.map(function (shipment) {
                if (shipment.name.toLowerCase().indexOf('sendclouderror') === -1) {
                    return {
                        external_order_id: shipment.external_order_id,
                        external_shipment_id: shipment.external_shipment_id,
                        shipment_uuid: UUIDUtils.createUUID(),
                        status: 'created'
                    };
                }
                return {
                    error: {
                        name: [
                            'Mock call is simulating an error'
                        ]
                    },
                    external_order_id: shipment.external_order_id,
                    external_shipment_id: shipment.external_shipment_id,
                    status: 'error'
                };
            });
            return {
                statusCode: 200,
                statusMessage: 'OK',
                text: JSON.stringify(responseObj)
            };
        }
    };
}

/**
 * Exports orders to Sendcloud API
 * @param {Object} orderBatch - The batch of orders+shipments to export
 * @returns {Object} The service response
 */
function exportOrders(orderBatch) {
    var sendcloudLogApiOrderNotes = Site.current.getCustomPreferenceValue('sendcloudLogApiOrderNotes');

    var service = LocalServiceRegistry.createService(SERVICE_ID, serviceCallback(sendcloudLogApiOrderNotes));
    var callResult = service.call(orderBatch);
    var responseObj = callResult.object;

    if (sendcloudLogApiOrderNotes) {
        var orderHelpers = require('*/cartridge/scripts/order/orderHelpers');
        var errorNote = callResult.ok ? null : JSON.stringify({
            status: callResult.status,
            errorMessage: callResult.errorMessage,
            msg: callResult.msg,
            unavailableReason: callResult.unavailableReason
        }, null, '  ');

        var orderAndShipment;
        if (errorNote) {
            // log same error on all orders
            for (var i = 0; i < orderBatch.length; i++) {
                orderAndShipment = orderBatch[i];
                orderHelpers.addOrderNotes(orderAndShipment.order, 'Sendcloud shipment \'' + (orderAndShipment.shipment.ID) + '\' - error', errorNote);
            }
        } else {
            // log partial response for each shipment
            for (var j = 0; j < responseObj.length; j++) {
                var data = responseObj[j];
                orderAndShipment = orderBatch[data.external_shipment_id];
                if (orderAndShipment) {
                    orderHelpers.addOrderNotes(orderAndShipment.order, 'Sendcloud shipment \'' + (orderAndShipment.shipment.ID) + '\' - response', JSON.stringify(data, null, '  '));
                }
            }
        }
    }

    if (callResult.ok) {
        return {
            error: false,
            response: callResult.object,
            circuitBroken: false
        };
    } else if (callResult.unavailableReason === 'CIRCUIT_BROKEN') {
        sendcloudLog.error('Circuit breaker for Sendcloud order export service activated with message {0}, status: {1}', callResult.errorMessage, callResult.status);
        return {
            error: true,
            circuitBroken: true
        };
    }
    sendcloudLog.error('Error calling Sendcloud order export service with message {0}, status: {1} and reason: {2}', callResult.msg, callResult.status, callResult.unavailableReason);
    return {
        error: true,
        circuitBroken: false
    };
}

exports.exportOrders = exportOrders;
