'use strict';
var server = require('server');
server.extend(module.superModule);

var BasketMgr = require('dw/order/BasketMgr');
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger');
var sendcloudLog = Logger.getLogger('sendcloud', 'sendcloud');
var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');

server.append('SubmitShipping', function (req, res, next) {
    var viewData = res.getViewData();
    if (!viewData.error) {
        var currentBasket = BasketMgr.getCurrentBasket();
        var shipment = currentBasket.defaultShipment;
        if (shipment) {
            var shippingMethod = shipment.shippingMethod;
            var shippingForm = server.forms.getForm('shipping');

            // first remove all sendcloud attribute values so nothing remains from a previously chosen shipping method
            Transaction.wrap(function () {
                Object.keys(shipment.custom).forEach(function (key) {
                    if (key.indexOf('sendcloud') === 0) {
                        delete shipment.custom[key];
                    }
                });
            });

            if (shippingMethod.custom.sendcloudServicePoints) {
                // shipping method for Sendcloud service points
                var sendcloudPointPickerForm = shippingForm.shippingAddress.sendcloudPointPicker;
                Transaction.wrap(function () {
                    shipment.custom.sendcloudServicePointId = sendcloudPointPickerForm.sendcloudServicePointId.value;
                    shipment.custom.sendcloudPostNumber = sendcloudPointPickerForm.sendcloudPostNumber.value;
                    shipment.custom.sendcloudServicePointData = sendcloudPointPickerForm.sendcloudServicePointData.value;
                });
            } else if (shippingMethod.custom.sendcloudCheckout) {
                // shipping method from Sendcloud checkout configuration
                var sendcloudCheckoudPayloadJSON = shippingForm.sendcloudCheckout.sendcloudCheckoutPayload && shippingForm.sendcloudCheckout.sendcloudCheckoutPayload.value;
                var sendcloudDeliveryMethod = JSON.parse(shippingMethod.custom.sendcloudDeliveryMethodJson);
                var deliveryMethodType = sendcloudDeliveryMethod.delivery_method_type;
                var sendcloudParcelHandoverDate = null;
                var sendcloudParcelHandoverDateFormatted = null;
                var sendcloudDeliveryDate = null;
                var sendcloudDeliveryDateFormatted = null;

                if (deliveryMethodType === 'nominated_day_delivery') {
                    // parse payload coming from plugin
                    if (!sendcloudCheckoudPayloadJSON) {
                        sendcloudLog.error('Payload value missing');
                        res.json({
                            error: true
                        });
                        return next();
                    }
                    var sendcloudCheckoutPayload;
                    try {
                        sendcloudCheckoutPayload = JSON.parse(sendcloudCheckoudPayloadJSON);
                    } catch (e) {
                        sendcloudLog.error('Cannot parse the checkout payload: ' + sendcloudCheckoudPayloadJSON);
                        res.json({
                            error: true
                        });
                        return next();
                    }
                    if (sendcloudCheckoutPayload && sendcloudCheckoutPayload.data && sendcloudCheckoutPayload.data.delivery_method_data) {
                        sendcloudParcelHandoverDate = sendcloudCheckoutPayload.data.delivery_method_data.parcel_handover_date;
                        sendcloudParcelHandoverDateFormatted = sendcloudCheckoutPayload.data.delivery_method_data.formatted_parcel_handover_date;
                        sendcloudDeliveryDate = sendcloudCheckoutPayload.data.delivery_method_data.delivery_date;
                        sendcloudDeliveryDateFormatted = sendcloudCheckoutPayload.data.delivery_method_data.formatted_delivery_date;
                    }
                } else if (deliveryMethodType === 'same_day_delivery') {
                    // create dates needed
                    var currentDate = new Date();
                    var calendarDate = new Calendar(currentDate);
                    sendcloudDeliveryDate = sendcloudParcelHandoverDate = StringUtils.formatCalendar(calendarDate, 'yyyy-MM-dd\'T\'HH:mm:ssZ');
                    sendcloudDeliveryDateFormatted = sendcloudParcelHandoverDateFormatted = StringUtils.formatCalendar(calendarDate, req.locale.id, Calendar.SHORT_DATE_PATTERN);
                }

                Transaction.wrap(function () {
                    shipment.custom.sendcloudDeliveryMethodType = deliveryMethodType;
                    shipment.custom.sendcloudShippingMethodName = sendcloudDeliveryMethod.internal_title;
                    shipment.custom.sendcloudShippingProductCode = sendcloudDeliveryMethod.shipping_product && sendcloudDeliveryMethod.shipping_product.code;
                    shipment.custom.sendcloudShippingProductName = sendcloudDeliveryMethod.shipping_product && sendcloudDeliveryMethod.shipping_product.name;
                    shipment.custom.sendcloudShippingProductFunctionalities = sendcloudDeliveryMethod.shipping_product && sendcloudDeliveryMethod.shipping_product.selected_functionalities ? JSON.stringify(sendcloudDeliveryMethod.shipping_product.selected_functionalities) : null;
                    shipment.custom.sendcloudSenderAddressID = sendcloudDeliveryMethod.sender_address_id;
                    shipment.custom.sendcloudParcelHandoverDate = sendcloudParcelHandoverDate;
                    shipment.custom.sendcloudParcelHandoverDateFormatted = sendcloudParcelHandoverDateFormatted;
                    shipment.custom.sendcloudDeliveryDate = sendcloudDeliveryDate;
                    shipment.custom.sendcloudDeliveryDateFormatted = sendcloudDeliveryDateFormatted;
                });
            }
        }
    }
    return next();
});

module.exports = server.exports();
