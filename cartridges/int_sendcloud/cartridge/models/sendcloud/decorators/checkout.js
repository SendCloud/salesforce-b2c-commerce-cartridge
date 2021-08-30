'use strict';

module.exports = function (shipmentModel, order, shipment) {
    if (shipment.custom.sendcloudDeliveryMethodType) {
        var shippingProductFunctionalities;
        try {
            shippingProductFunctionalities = JSON.parse(shipment.custom.sendcloudShippingProductFunctionalities || '{}');
        } catch (e) {
            var Logger = require('dw/system/Logger');
            var sendcloudLog = Logger.getLogger('sendcloud', 'sendcloud');
            sendcloudLog.error('Cannot parse sendcloudShippingProductFunctionalities of order {0}', order.orderNo);
            shippingProductFunctionalities = {};
        }

        var deliveryMethodData = {};
        if (shipment.custom.sendcloudDeliveryDate) deliveryMethodData.delivery_date = shipment.custom.sendcloudDeliveryDate;
        if (shipment.custom.sendcloudDeliveryDateFormatted) deliveryMethodData.formatted_delivery_date = shipment.custom.sendcloudDeliveryDateFormatted;
        if (shipment.custom.sendcloudParcelHandoverDate) deliveryMethodData.parcel_handover_date = shipment.custom.sendcloudParcelHandoverDate;

        var checkoutPayload = {
            sender_address_id: shipment.custom.sendcloudSenderAddressID,
            shipping_product: {
                code: shipment.custom.sendcloudShippingProductCode,
                name: shipment.custom.sendcloudShippingProductName,
                selected_functionalities: shippingProductFunctionalities
            },
            delivery_method_type: shipment.custom.sendcloudDeliveryMethodType
        };
        if (Object.keys(deliveryMethodData).length !== 0) checkoutPayload.delivery_method_data = deliveryMethodData;

        Object.defineProperty(shipmentModel, 'checkout_payload', {
            configurable: true,
            enumerable: true,
            value: checkoutPayload
        });
    }
};
