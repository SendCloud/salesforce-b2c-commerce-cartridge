'use strict';

/**
 * Processes new Sendcloud notifications
 * @param {dw.util.HashMap} parameters - Job parameters
 * @returns {dw.system.Status} Result status of this job step
 */
function exportOrders(parameters) {
    var Status = require('dw/system/Status');
    if (parameters.disabled) return new Status(Status.OK, 'DISABLED');

    var Calendar = require('dw/util/Calendar');
    var Order = require('dw/order/Order');
    var OrderMgr = require('dw/order/OrderMgr');
    var Logger = require('dw/system/Logger');
    var sendcloudOrderHelpers = require('*/cartridge/scripts/helpers/sendcloudOrderHelpers');

    var sendcloudLog = Logger.getLogger('sendcloud', 'sendcloud');
    var isError = false;
    var isWarning = false;
    var maxBatchSize = parameters.batchSize;
    var orderAgeDaysLimit = parameters.orderAgeDaysLimit;
    var creationDateLimit = new Calendar();
    creationDateLimit.add(Calendar.DATE, -orderAgeDaysLimit);
    var orderBatch = {};
    var orderBatchSize = 0;
    var failedOrderNos = [];

    /**
     * Collects the specified order into a batch, and if the batch is full then exports it to Sendcloud.
     * @param {dw.order.Order} order - The order to process
     */
    function orderCallback(order) {
        var shipments = order.shipments.iterator();
        while (shipments.hasNext()) {
            var shipment = shipments.next();

            // skip shipments without an address, as Sendcloud is only for shipping to physical addresses
            // skip shipments that do not use Sendcloud shipping method
            if (shipment.shippingAddress && (shipment.custom.sendcloudServicePointId || shipment.custom.sendcloudDeliveryMethodType)) {
                var key = order.orderNo + '-' + shipment.ID;    // same format as in models/sendcloud/decorators/base
                orderBatch[key] = { order: order, shipment: shipment };
                orderBatchSize++;

                if (orderBatchSize === maxBatchSize) {
                    var batchStatus = sendcloudOrderHelpers.exportOrderBatch(orderBatch, failedOrderNos);
                    if (batchStatus.error) {
                        isError = true;
                    } else if (batchStatus.warning) {
                        isWarning = true;
                    }
                    orderBatch = {};
                    orderBatchSize = 0;
                }
            }
        }
    }

    OrderMgr.processOrders(orderCallback, 'exportStatus = {0} AND (custom.sendcloudExportStatus = {1} OR custom.sendcloudExportStatus = NULL) AND creationDate > {2}', Order.EXPORT_STATUS_EXPORTED, 'NOTEXPORTED', creationDateLimit.getTime());

    // export last (partial) batch
    if (orderBatchSize > 0) {
        var batchStatus = sendcloudOrderHelpers.exportOrderBatch(orderBatch, failedOrderNos);
        if (batchStatus.error) {
            isError = true;
        } else if (batchStatus.warning) {
            isWarning = true;
        }
        orderBatch = {};
        orderBatchSize = 0;
    }

    sendcloudLog.info('Done exporting orders to Sendcloud');

    if (isError) return new Status(Status.ERROR, 'ERROR');
    if (isWarning) return new Status(Status.OK, 'WARN');
    return new Status(Status.OK, 'OK');
}
module.exports.exportOrders = exportOrders;
