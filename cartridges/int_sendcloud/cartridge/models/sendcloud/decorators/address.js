'use strict';

module.exports = function (shipmentModel, order, shipment) {
    var shippingAddress = shipment.shippingAddress;
    Object.defineProperty(shipmentModel, 'address', {
        configurable: true,
        enumerable: true,
        value: shippingAddress.address1
    });
    Object.defineProperty(shipmentModel, 'address_2', {
        configurable: true,
        enumerable: true,
        value: shippingAddress.address2 || ''
    });
    Object.defineProperty(shipmentModel, 'house_number', {
        configurable: true,
        enumerable: true,
        value: ''
    });
    Object.defineProperty(shipmentModel, 'city', {
        configurable: true,
        enumerable: true,
        value: shippingAddress.city
    });
    Object.defineProperty(shipmentModel, 'postal_code', {
        configurable: true,
        enumerable: true,
        value: shippingAddress.postalCode
    });
    Object.defineProperty(shipmentModel, 'to_state', {
        configurable: true,
        enumerable: true,
        value: shippingAddress.stateCode
    });
    Object.defineProperty(shipmentModel, 'country', {
        configurable: true,
        enumerable: true,
        value: shippingAddress.countryCode && shippingAddress.countryCode.value
    });
    Object.defineProperty(shipmentModel, 'to_service_point', {
        configurable: true,
        enumerable: true,
        value: shipment.custom.sendcloudServicePointId || null
    });
    Object.defineProperty(shipmentModel, 'to_post_number', {
        configurable: true,
        enumerable: true,
        value: shipment.custom.sendcloudPostNumber || ''
    });
};
