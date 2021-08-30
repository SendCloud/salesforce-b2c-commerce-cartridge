'use strict';

var base = module.superModule;

/**
 * Order class that represents the current order
 * @param {dw.order.LineItemCtnr} lineItemContainer - Current users's basket/order
 * @constructor
 */
function OrderModel(lineItemContainer) {
    // call base constructor
    if (base) base.apply(this, arguments);

    this.trackingNumber = lineItemContainer.defaultShipment.custom.sendcloudTrackingNumber;
    if (this.trackingNumber) {
        var shippingMethod = lineItemContainer.defaultShipment.shippingMethod;
        var trackingLinkFormat = shippingMethod && shippingMethod.custom.sendcloudTrackingLink;
        if (trackingLinkFormat) {
            var StringUtils = require('dw/util/StringUtils');
            var shippingAddress = lineItemContainer.defaultShipment.shippingAddress;
            this.tracklingLink = StringUtils.format(trackingLinkFormat, this.trackingNumber, shippingAddress.countryCode.value, shippingAddress.postalCode);
        }
    }
}

module.exports = OrderModel;
