'use strict';

var base = module.superModule;
var Resource = require('dw/web/Resource');

/**
 * @constructor
 * @classdesc Model that represents shipping information
 *
 * @param {dw.order.Shipment} shipment - the default shipment of the current basket
 */
function ShippingModel(shipment) {
    // call base constructor
    if (base) base.apply(this, arguments);

    if (shipment.custom.sendcloudServicePointData) {
        try {
            var servicePointData = JSON.parse(shipment.custom.sendcloudServicePointData);
            this.servicePointAddress = {
                firstName: Resource.msg('summary.label.servicepoint', 'sendcloud', null),
                lastName: servicePointData.name,
                address1: servicePointData.street + ' ' + servicePointData.house_number,
                postalCode: servicePointData.postal_code,
                city: servicePointData.city,
                phone: servicePointData.phone,
                countryCode: {
                    displayValue: Resource.msg('country.' + servicePointData.country, 'forms', servicePointData.country),
                    value: servicePointData.country
                }
            };
        } catch (e) {
            var Logger = require('dw/system/Logger');
            var sendcloudLog = Logger.getLogger('sendcloud', 'sendcloud');
            sendcloudLog.error('Could not parse service point data: {0}', e);
        }
    }
}

module.exports = ShippingModel;
