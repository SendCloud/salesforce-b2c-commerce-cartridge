'use strict';

var Status = require('dw/system/Status');
var ShippingMgr = require('dw/order/ShippingMgr');

/**
 * Calculate shipping cost including Sendcloud selected option's cost.
 * @param {dw.order.Basket} basket - the current basket
 * @returns {dw.system.Status} Status - status
 */
function calculateShipping(basket) {
    var shippingHelpers = require('*/cartridge/scripts/checkout/shippingHelpers');

    ShippingMgr.applyShippingCost(basket);

    var shipment = basket.defaultShipment;
    var shippingMethod = shipment.shippingMethod;
    var standardShippingLineItem = shipment.standardShippingLineItem;

    if (shippingMethod.custom.sendcloudCheckout && standardShippingLineItem) {
        var sendcloudDeliveryMethod;
        try {
            sendcloudDeliveryMethod = JSON.parse(shippingMethod.custom.sendcloudDeliveryMethodJson);
        } catch (e) {
            var Logger = require('dw/system/Logger');
            var sendcloudLog = Logger.getLogger('sendcloud', 'sendcloud');
            sendcloudLog.error('Cannot parse sendcloudDeliveryMethodJson for shipping method {0}', shippingMethod.ID);
            return new Status(Status.OK);
        }

        var sendcloudShippingRate = shippingHelpers.getSendcloudShippingRate(sendcloudDeliveryMethod, shippingMethod, shipment);

        if (sendcloudShippingRate) {
            standardShippingLineItem.setPriceValue(sendcloudShippingRate.value);
        }
    }

    return new Status(Status.OK);
}
exports.calculateShipping = calculateShipping;
