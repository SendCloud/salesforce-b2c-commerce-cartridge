'use strict';

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
