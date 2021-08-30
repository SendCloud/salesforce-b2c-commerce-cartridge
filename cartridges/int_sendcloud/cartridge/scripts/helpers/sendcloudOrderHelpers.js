'use strict';

var Logger = require('dw/system/Logger');
var Site = require('dw/system/Site');
var Transaction = require('dw/system/Transaction');
var sendcloudLog = Logger.getLogger('sendcloud', 'sendcloud');

/**
 * Exports the specified orders to Sendcloud.
 * @param {Object} orderBatch - The batch of orders+shipments to export
 * @param {Array} failedOrderNos - A list of order numbers of orders of which at least one shipment did not export successfully
 * @returns {Object} Export status for this batch
 */
function exportOrderBatch(orderBatch, failedOrderNos) {
    sendcloudLog.info('Exporting batch of {0} orders to Sendcloud', Object.keys(orderBatch).length);
    var maxFailedAttempts = Site.current.getCustomPreferenceValue('sendcloudMaxFailedAttempts');
    var exportOrdersService = require('*/cartridge/scripts/services/exportOrders');
    var exportResult = exportOrdersService.exportOrders(orderBatch);
    var warning = false;

    if (!exportResult.error) {
        // loop through results
        var responseObj = exportResult.response;
        for (var i = 0; i < responseObj.length; i++) {
            var data = responseObj[i];

            // find related order and shipment
            var orderAndShipment = orderBatch[data.external_shipment_id];
            if (orderAndShipment) {
                var order = orderAndShipment.order;
                if (data.status === 'error') {
                    warning = true;
                    // maintain status on order
                    Transaction.wrap(function () { // eslint-disable-line no-loop-func
                        // keep track of failed orders, in case another shipment of the same order is exported successfully
                        if (failedOrderNos.indexOf(data.external_order_id) === -1) {
                            failedOrderNos.push(data.external_order_id);
                            // only increase failed attempt count for first failed shipment in order
                            order.custom.sendcloudFailedAttempts++;
                        }
                        if (order.custom.sendcloudFailedAttempts < maxFailedAttempts) {
                            order.custom.sendcloudExportStatus = 'NOTEXPORTED';
                        } else {
                            order.custom.sendcloudExportStatus = 'FAILED';
                            sendcloudLog.fatal('Order `{0}` could not be exported to Sendcloud, this order needs to be corrected so it can be exported to Sendcloud. See order notes for details.', order.orderNo);
                        }
                    });
                } else if (data.shipment_uuid) {
                    Transaction.wrap(function () { // eslint-disable-line no-loop-func
                        // store shiopment UUID
                        orderAndShipment.shipment.custom.sendcloudShipmentUUID = data.shipment_uuid;
                        // set export status if a previous shipment did not fail to export
                        if (failedOrderNos.indexOf(data.external_order_id) === -1) {
                            order.custom.sendcloudExportStatus = 'EXPORTED';
                        }
                    });
                }
            } else {
                // should not happen, log an error
                sendcloudLog.error('Combination of order number \'' + data.external_order_id + '\' and shipment ID \'' + data.external_shipment_id + '\' cannot be found in this batch');
                warning = true;
            }
        }
    } else if (exportResult.circuitBroken) {
        // circuit breaker is active, throw exception to stop job immediately
        throw new Error('Circuit breaker is active');
    }

    return {
        error: exportResult.error,
        warning: warning
    };
}
module.exports.exportOrderBatch = exportOrderBatch;
