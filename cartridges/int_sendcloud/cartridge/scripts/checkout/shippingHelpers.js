'use strict';

var BasketMgr = require('dw/order/BasketMgr');
var Calendar = require('dw/util/Calendar');
var Logger = require('dw/system/Logger');
var Money = require('dw/value/Money');
var ShippingMgr = require('dw/order/ShippingMgr');
var StringUtils = require('dw/util/StringUtils');
var Transaction = require('dw/system/Transaction');

var sendcloudLog = Logger.getLogger('sendcloud', 'sendcloud');

// expose same methods as base
var base = module.superModule;
if (base) {
    Object.keys(base).forEach(function (key) {
        module.exports[key] = base[key];
    });
}

/**
 * Plain JS object that represents a DW Script API dw.order.ShippingMethod object
 * @param {dw.order.Shipment} shipment - the target Shipment
 * @param {Object} [address] - optional address object
 * @returns {dw.util.Collection} an array of ShippingModels
 */
function getApplicableShippingMethods(shipment, address) {
    var shippingMethodModels = base.getApplicableShippingMethods(shipment, address);
    if (!shippingMethodModels) return null;

    var filteredMethods = shippingMethodModels.filter(function (shippingMethodModel) {
        return shippingMethodModel.applicable;
    });

    return filteredMethods;
}
module.exports.getApplicableShippingMethods = getApplicableShippingMethods;

/**
 * Determines the locale to use for the Sendcloud service point picker.
 * @param {string} sfccLocale - The SFCC locale ID
 * @returns {string} The Sendcloud locale
 */
function determineSendcloudServicePointLocale(sfccLocale) {
    var Site = require('dw/system/Site');

    // get locale in format expected by Sendcloud
    var locale = sfccLocale.toLowerCase().replace('_', '-');
    var isGeneric = locale.indexOf('-') === -1;
    var language = isGeneric ? locale : locale.substring(0, locale.indexOf('-'));

    // determine if this locale is supported, or at least one with same language
    var isSupported = false;
    var firstLanguageMatchingLocale = null;
    var attributeDefinition = Site.current.preferences.describe().getCustomAttributeDefinition('sendcloudPointPickerDefaultLocale');
    if (attributeDefinition) {
        var supportedLocales = attributeDefinition.values.iterator();
        while (supportedLocales.hasNext()) {
            var supportedLocale = supportedLocales.next().value;
            // check for exact locale if the current locale is language+country
            if (!isGeneric && supportedLocale === locale) {
                isSupported = true;
                break;
            }
            if (!firstLanguageMatchingLocale && supportedLocale.indexOf(language) === 0) {
                firstLanguageMatchingLocale = supportedLocale;
                if (isGeneric) {
                    locale = supportedLocale;
                    isSupported = true;
                    break;
                }
            }
        }
    }
    if (!isSupported) {
        // no exact match
        locale = firstLanguageMatchingLocale || Site.current.getCustomPreferenceValue('sendcloudPointPickerDefaultLocale') || 'en-us';
    }
    return locale;
}
module.exports.determineSendcloudServicePointLocale = determineSendcloudServicePointLocale;

/**
 * Persist the shipping method data submited by the user
 * @param {Object} shippingForm - current shipping form
 * @param {dw.order.Shipment} shipment - the target shipment
 * @param {string} localeId - locale id for the current request
 * @return {boolean} True in case of success, false otherwhise
 */
function persistSendcloudShipmentData(shippingForm, shipment, localeId) {
    var targetShipment = shipment;

    if (!targetShipment) {
        return true;
    }

    var shippingMethod = targetShipment.shippingMethod;

    // first remove all sendcloud attribute values so nothing remains from a previously chosen shipping method
    Transaction.wrap(function () {
        Object.keys(targetShipment.custom).forEach(function (key) {
            if (key.indexOf('sendcloud') === 0) {
                delete targetShipment.custom[key];
            }
        });
    });

    if (shippingMethod.custom.sendcloudServicePoints) {
        // shipping method for Sendcloud service points
        var sendcloudPointPickerForm = shippingForm.sendcloudPointPicker;
        Transaction.wrap(function () {
            targetShipment.custom.sendcloudServicePointId = sendcloudPointPickerForm.sendcloudServicePointId.value;
            targetShipment.custom.sendcloudPostNumber = sendcloudPointPickerForm.sendcloudPostNumber.value;
            targetShipment.custom.sendcloudServicePointData = sendcloudPointPickerForm.sendcloudServicePointData.value;
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
                return false;
            }
            var sendcloudCheckoutPayload;
            try {
                sendcloudCheckoutPayload = JSON.parse(sendcloudCheckoudPayloadJSON);
            } catch (e) {
                sendcloudLog.error('Cannot parse the checkout payload: ' + sendcloudCheckoudPayloadJSON);
                return false;
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
            sendcloudDeliveryDateFormatted = sendcloudParcelHandoverDateFormatted = StringUtils.formatCalendar(calendarDate, localeId, Calendar.SHORT_DATE_PATTERN);
        }

        Transaction.wrap(function () {
            targetShipment.custom.sendcloudDeliveryMethodType = deliveryMethodType;
            targetShipment.custom.sendcloudShippingMethodName = sendcloudDeliveryMethod.internal_title;
            targetShipment.custom.sendcloudShippingProductCode = sendcloudDeliveryMethod.shipping_product && sendcloudDeliveryMethod.shipping_product.code;
            targetShipment.custom.sendcloudShippingProductName = sendcloudDeliveryMethod.shipping_product && sendcloudDeliveryMethod.shipping_product.name;
            targetShipment.custom.sendcloudShippingProductFunctionalities = sendcloudDeliveryMethod.shipping_product && sendcloudDeliveryMethod.shipping_product.selected_functionalities ? JSON.stringify(sendcloudDeliveryMethod.shipping_product.selected_functionalities) : null;
            targetShipment.custom.sendcloudSenderAddressID = sendcloudDeliveryMethod.sender_address_id;
            targetShipment.custom.sendcloudParcelHandoverDate = sendcloudParcelHandoverDate;
            targetShipment.custom.sendcloudParcelHandoverDateFormatted = sendcloudParcelHandoverDateFormatted;
            targetShipment.custom.sendcloudDeliveryDate = sendcloudDeliveryDate;
            targetShipment.custom.sendcloudDeliveryDateFormatted = sendcloudDeliveryDateFormatted;
        });
    }
    return true;
}
module.exports.persistSendcloudShipmentData = persistSendcloudShipmentData;

/**
 * Sum the total weight from the shipment.
 * @param {dw.util.Collection<dw.order.ProductLineItem>} productLineItems Collection of product line items.
 * @returns {number} Total weight
 */
function calculatePlisTotalWeight(productLineItems) {
    var totalWeight = 0;
    var productLineItemsIt = productLineItems.iterator();

    while (productLineItemsIt.hasNext()) {
        var productLineItem = productLineItemsIt.next();
        if (productLineItem.product && productLineItem.product.custom.weight) {
            totalWeight += (productLineItem.product.custom.weight * productLineItem.quantityValue);
        } else {
            return 0;
        }
    }
    return totalWeight;
}

/**
 * Determine is the Sendcloud shipping method is applicable based if the rates are enabled and the basket weight.
 * @param {Object} sendcloudDeliveryMethod - The Sendcloud checkout delivery method information
 * @param {dw.order.Shipment} shipment - Any shipment for the current basket
 * @returns {boolean} True if is applicable, false otherwhise.
 */
function isSendcloudShippingMethodApplicable(sendcloudDeliveryMethod, shipment) {
    var shippingRateData = sendcloudDeliveryMethod.shipping_rate_data;

    // If rates are not enabled then shipping method is automatically applicable.
    if (!shippingRateData.enabled) {
        return true;
    }

    var currentBasket = BasketMgr.getCurrentBasket();

    if (shippingRateData.free_shipping && shippingRateData.free_shipping.enabled) {
        var amount = Number(shippingRateData.free_shipping.from_amount);
        if (currentBasket && currentBasket.totalGrossPrice.value >= amount) {
            return true;
        }
    }

    var totalWeight = calculatePlisTotalWeight(shipment.productLineItems);

    if (totalWeight) {
        var shippingRate = shippingRateData.shipping_rates.find(function (rate) {
            var minWeightInKG = rate.min_weight / 1000;
            var maxWeightInKG = rate.max_weight / 1000;
            return rate.enabled && totalWeight >= minWeightInKG && totalWeight < maxWeightInKG;
        });

        if (shippingRate) {
            return true;
        }

        // If basket has weight however we cannot use any avilable rate.
        return false;
    }

    // In case the rates are enabled but the weight is not possible to be determined.
    return true;
}
module.exports.isSendcloudShippingMethodApplicable = isSendcloudShippingMethodApplicable;

/**
 * Get Sendcloud shipping rate
 * @param {Object} sendcloudDeliveryMethod - The Sendcloud checkout delivery method information
 * @param {dw.order.ShippingMethod} shippingMethod - the default shipping method of the current basket
 * @param {dw.order.Shipment} shipment - Any shipment for the current basket
 * @returns {dw.value.Money} Sendcloud shipping rate
 */
function getSendcloudShippingRate(sendcloudDeliveryMethod, shippingMethod, shipment) {
    var currentBasket = BasketMgr.getCurrentBasket();
    var shippingRateData = sendcloudDeliveryMethod.shipping_rate_data;

    var shipmentShippingModel = ShippingMgr.getShipmentShippingModel(shipment);
    var shippingCost = shipmentShippingModel.getShippingCost(shippingMethod);

    // Return the shipping method price configured when rates are not enabled.
    if (!shippingRateData.enabled) {
        return shippingCost.amount;
    }

    // Check if the shipping method is eligible for free rate.
    if (shippingRateData.free_shipping && shippingRateData.free_shipping.enabled) {
        var amount = Number(shippingRateData.free_shipping.from_amount);
        if (currentBasket && currentBasket.totalGrossPrice.value >= amount) {
            return new Money(0, shippingMethod.currencyCode);
        }
    }

    var totalWeight = calculatePlisTotalWeight(shipment.productLineItems);

    // Find the shipping rate based on basket total weight.
    if (totalWeight) {
        var shippingRate = shippingRateData.shipping_rates.find(function (rate) {
            var minWeightInKG = rate.min_weight / 1000;
            var maxWeightInKG = rate.max_weight / 1000;
            return rate.enabled && totalWeight >= minWeightInKG && totalWeight < maxWeightInKG;
        });

        if (shippingRate) {
            return new Money(shippingRate.rate, shippingMethod.currencyCode);
        }
    }

    // Use default rate when it is no possible to calulate the basket weight.
    var defaultShippingRate = shippingRateData.shipping_rates.find(function (rate) {
        return rate.enabled && rate.is_default;
    });

    if (defaultShippingRate) {
        return new Money(defaultShippingRate.rate, shippingMethod.currencyCode);
    }

    // Return the shipping cost configured when it is not possible to use Sendcloud rate.
    return shippingCost.amount;
}
module.exports.getSendcloudShippingRate = getSendcloudShippingRate;
