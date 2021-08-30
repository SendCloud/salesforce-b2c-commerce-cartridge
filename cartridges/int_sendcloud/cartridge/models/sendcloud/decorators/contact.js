'use strict';

module.exports = function (shipmentModel, order, shipment) {
    var shippingAddress = shipment.shippingAddress;
    Object.defineProperty(shipmentModel, 'name', {
        configurable: true,
        enumerable: true,
        value: shippingAddress.fullName
    });
    Object.defineProperty(shipmentModel, 'company_name', {
        configurable: true,
        enumerable: true,
        value: shippingAddress.companyName || ''
    });
    Object.defineProperty(shipmentModel, 'email', {
        configurable: true,
        enumerable: true,
        value: order.customerEmail || ''
    });
    Object.defineProperty(shipmentModel, 'telephone', {
        configurable: true,
        enumerable: true,
        value: shippingAddress.phone || ''
    });
};
