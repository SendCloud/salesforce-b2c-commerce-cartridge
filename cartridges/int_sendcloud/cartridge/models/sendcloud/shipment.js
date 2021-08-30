'use strict';

/**
 * The shipment model as expected by Sendcloud.
 * @param {dw.order.Order} order - The order that contains the shipment
 * @param {dw.order.Shipment} shipment - The shipment
 * @constructor
 */
function ShipmentModel(order, shipment) {
    if (!shipment.shippingAddress) {
        this.isEmpty = true;
        return;
    }

    var decorators = require('*/cartridge/models/sendcloud/decorators/index');
    decorators.base(this, order, shipment);
    decorators.contact(this, order, shipment);
    decorators.address(this, order, shipment);
    decorators.parcelItems(this, order, shipment);
    decorators.checkout(this, order, shipment);
}
module.exports = ShipmentModel;
