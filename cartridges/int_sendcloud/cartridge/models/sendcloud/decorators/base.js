'use strict';

module.exports = function (shipmentModel, order, shipment) {
    Object.defineProperty(shipmentModel, 'external_order_id', {
        configurable: true,
        enumerable: true,
        value: order.orderNo
    });
    Object.defineProperty(shipmentModel, 'external_shipment_id', {
        configurable: true,
        enumerable: true,
        value: order.orderNo + '-' + shipment.ID    // same format as in scripts/jobsteps/exportOrders
    });
    Object.defineProperty(shipmentModel, 'order_number', {
        configurable: true,
        enumerable: true,
        value: order.orderNo
    });

    Object.defineProperty(shipmentModel, 'order_status', {
        configurable: true,
        enumerable: true,
        value: {
            id: order.status.value,
            message: order.status.displayValue
        }
    });
    Object.defineProperty(shipmentModel, 'payment_status', {
        configurable: true,
        enumerable: true,
        value: {
            id: order.paymentStatus.value,
            message: order.paymentStatus.displayValue
        }
    });
    Object.defineProperty(shipmentModel, 'currency', {
        configurable: true,
        enumerable: true,
        value: order.currencyCode
    });
    Object.defineProperty(shipmentModel, 'total_order_value', {
        configurable: true,
        enumerable: true,
        value: shipment.totalGrossPrice.value.toFixed(2)
    });
    Object.defineProperty(shipmentModel, 'customs_invoice_nr', {
        configurable: true,
        enumerable: true,
        value: order.invoiceNo || ''
    });
    Object.defineProperty(shipmentModel, 'customs_shipment_type', {
        configurable: true,
        enumerable: true,
        value: null
    });
    Object.defineProperty(shipmentModel, 'shipping_method', {
        configurable: true,
        enumerable: true,
        value: null
    });
    Object.defineProperty(shipmentModel, 'shipping_method_checkout_name', {
        configurable: true,
        enumerable: true,
        value: shipment.custom.sendcloudShippingMethodName || (shipment.shippingMethod && shipment.shippingMethod.displayName) || ''
    });
    Object.defineProperty(shipmentModel, 'created_at', {
        configurable: true,
        enumerable: true,
        value: shipment.creationDate.toISOString()
    });
    Object.defineProperty(shipmentModel, 'updated_at', {
        configurable: true,
        enumerable: true,
        value: shipment.lastModified.toISOString()
    });
};
