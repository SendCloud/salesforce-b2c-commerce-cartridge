'use strict';

var TaxMgr = require('dw/order/TaxMgr');

var ns = new Namespace('http://www.demandware.com/xml/impex/shipping/2007-03-31');

/**
 * Determines if a shipping method is a Sendcloud checkout delivery method.
 * @param {XML} shippingMethodXml - The shipping method XML
 * @returns {boolean} If the provided shipping method is a Sendcloud checkout delivery method.
 */
function isSendcloudCheckoutShippingMethod(shippingMethodXml) {
    var customAttributesXml = shippingMethodXml.ns::['custom-attributes'];
    if (!customAttributesXml) return false;
    var sendcloudCheckoutAttribute = customAttributesXml.ns::['custom-attribute'].(@['attribute-id'] == 'sendcloudCheckout');
    return sendcloudCheckoutAttribute == 'true';
}
module.exports.isSendcloudCheckoutShippingMethod = isSendcloudCheckoutShippingMethod;

/**
 * Copies all elements with the specified name from the source to the target XML.
 * @param {XML} sourecXml - The source XML
 * @param {XML} targetXml - The target XML
 * @param {string} elementName - The element name
 */
function copyElements(sourecXml, targetXml, elementName) {
    if (sourecXml) {
        var existingElements = sourecXml.ns::[elementName];
        for (var i = 0; i < existingElements.length(); i++) {
            targetXml.appendChild(existingElements[i]);
        }
    }
}

/**
 * Copies data from the Sendcloud checkout configuration to the shipping method XML.
 * @param {string} shippingMethodID - The ID for this shipping method
 * @param {Object} deliveryMethodInfo - The delivery method information from the Sendcloud checkout configurtion
 * @param {XML} existingShippingMethodXml - The existing shipping method XML, or null if it does not yet exist
 * @returns {XML} A new shipping method XML element
 */
function copyDataToShippingMethodXml(shippingMethodID, deliveryMethodInfo, existingShippingMethodXml) {
    var xmlns = new Namespace('xml', 'http://www.w3.org/XML/1998/namespace');

    // create new shipping method XML element
    var isDefault = existingShippingMethodXml && existingShippingMethodXml.@['default'] || false;
    var newShippingMethodXml = <shipping-method method-id={shippingMethodID} default={isDefault}></shipping-method>;

    // always update display name for default locale, copy display names for other locales
    newShippingMethodXml.appendChild(<display-name xml:lang="x-default">{deliveryMethodInfo.deliveryMethod.external_title}</display-name>);
    if (existingShippingMethodXml) {
        var existingDisplayNames = existingShippingMethodXml.ns::['display-name'];
        for (var i = 0; i < existingDisplayNames.length(); i++) {
            if (existingDisplayNames[i].@xmlns::lang != 'x-default') {
                newShippingMethodXml.appendChild(existingDisplayNames[i]);
            }
        }
    }

    // copy descriptions
    copyElements(existingShippingMethodXml, newShippingMethodXml, 'description');

    // determine if shipping method should be online
    var online;
    if (existingShippingMethodXml) {
        // use value from current shipping method
        online = existingShippingMethodXml.ns::['online-flag'] == true;
    } else {
        // use value from site preferences
        var Site = require('dw/system/Site');
        online = Site.current.getCustomPreferenceValue('sendcloudCheckoutShippingMethodDefaultEnabled') || false;
    }
    var onlineFlagXml = <online-flag>{online}</online-flag>;
    newShippingMethodXml.appendChild(onlineFlagXml);

    // copy base method and external method if present
    if (existingShippingMethodXml) {
        copyElements(existingShippingMethodXml, newShippingMethodXml, 'base-method');
        copyElements(existingShippingMethodXml, newShippingMethodXml, 'external-shipping-method');
    }

    // copy tax class if present, or set default one
    var taxClassXml;
    if (existingShippingMethodXml) {
        taxClassXml = existingShippingMethodXml.ns::['tax-class-id'];
    } else {
        taxClassXml = <tax-class-id>{TaxMgr.defaultTaxClassID}</tax-class-id>;
    }
    newShippingMethodXml.appendChild(taxClassXml);

    // copy price table if present, or set default one
    var priceTableXml;
    if (existingShippingMethodXml) {
        priceTableXml = existingShippingMethodXml.ns::['price-table'][0];
    } else {
        priceTableXml = <price-table><amount order-value="0.0">0.0</amount></price-table>;
    }
    newShippingMethodXml.appendChild(priceTableXml);

    // copy product cost groups and excluded products if present
    if (existingShippingMethodXml) {
        copyElements(existingShippingMethodXml, newShippingMethodXml, 'product-cost-groups');
        copyElements(existingShippingMethodXml, newShippingMethodXml, 'excluded-products');
    }

    // set new excluded addresses based on delivery zone informtion
    var excludedAddresses = <excluded-addresses>
        <included-addresses>
            <condition-group match-mode="all">
                <condition>
                    <attribute-path>shipment.shippingAddress.countryCode</attribute-path>
                    <operator>is-not-equal</operator>
                    <string>{deliveryMethodInfo.location.country.iso_2}</string>
                </condition>
            </condition-group>
        </included-addresses>
    </excluded-addresses>;
    newShippingMethodXml.appendChild(excludedAddresses);

    // copy custom attributes, but ensure that sendcloudCheckout is true, and that sendcloudDeliveryMethodJson is set to new value
    var customAttributesXml;
    if (existingShippingMethodXml) {
        customAttributesXml = existingShippingMethodXml.ns::['custom-attributes'][0];
        delete customAttributesXml.ns::['custom-attribute'].(@['attribute-id'] == 'sendcloudCheckout')[0]; 
        delete customAttributesXml.ns::['custom-attribute'].(@['attribute-id'] == 'sendcloudDeliveryMethodJson')[0]; 
    } else {
        customAttributesXml = <custom-attributes></custom-attributes>;
    }
    var newCustomAttributeXml1 = <custom-attribute attribute-id="sendcloudCheckout">true</custom-attribute>;
    var newCustomAttributeXml2 = <custom-attribute attribute-id="sendcloudDeliveryMethodJson">{JSON.stringify(deliveryMethodInfo.deliveryMethod, null, 2)}</custom-attribute>;
    customAttributesXml.appendChild(newCustomAttributeXml1);
    customAttributesXml.appendChild(newCustomAttributeXml2);
    newShippingMethodXml.appendChild(customAttributesXml);

    // set new currency
    var currencyCodeXml = <currency>{deliveryMethodInfo.currencyCode}</currency>;
    newShippingMethodXml.appendChild(currencyCodeXml);

    // copy customer groups if present
    copyElements(existingShippingMethodXml, newShippingMethodXml, 'customer-groups');

    return newShippingMethodXml;
}
module.exports.copyDataToShippingMethodXml = copyDataToShippingMethodXml;
