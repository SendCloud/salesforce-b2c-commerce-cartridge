'use strict';

var Calendar = require('dw/util/Calendar');
var Site = require('dw/system/Site');

var base = module.superModule;
var dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Checks if same-day delivery is applicable at the current day and time.
 * @param {Object} sendcloudDeliveryMethod - The Sendcloud checkout delivery method information
 * @returns {boolean} If same-day delivery is applicable at current day and time
 */
function isSameDayDeliveryApplicable(sendcloudDeliveryMethod) {
    // determine delivery day details
    var deliveryDate = Site.getCalendar();
    var day = deliveryDate.get(Calendar.DAY_OF_WEEK) - 1; // 0=Sunday, 1=Monday etc
    var deliveryDayName = dayKeys[day];
    var carrierDeliveryDay = sendcloudDeliveryMethod.shipping_product.carrier_delivery_days[deliveryDayName];

    // if not found then this means that the carrier is not delivering on this date
    if (!carrierDeliveryDay || !carrierDeliveryDay.enabled) return false;

    // check handover details, if not found this means that the merchant can’t hand-over the parcel to the carrier on this date
    var parcelHandoverDay = sendcloudDeliveryMethod.parcel_handover_days[deliveryDayName];
    if (!parcelHandoverDay || !parcelHandoverDay.enabled) return false;

    // determine cut off time
    var cutOffDate = Site.getCalendar();
    cutOffDate.set(Calendar.MINUTE, parcelHandoverDay.cut_off_time_minutes);
    cutOffDate.set(Calendar.HOUR_OF_DAY, parcelHandoverDay.cut_off_time_hours);

    // check if cut-off time for handing over parcels on this date is in the past
    if (cutOffDate.before(deliveryDate)) return false;

    return true;
}

/**
 * Checks if standard delivery is applicable at the current day and time.
 * @param {Object} sendcloudDeliveryMethod - The Sendcloud checkout delivery method information
 * @returns {boolean} If standard delivery is applicable at current day and time
 */
function isStandardDeliveryApplicable(sendcloudDeliveryMethod) {
    // determine placement day details
    var orderPlacementDate = Site.getCalendar();
    var day = orderPlacementDate.get(Calendar.DAY_OF_WEEK) - 1; // 0=Sunday, 1=Monday etc
    var orderPlacementDayName = dayKeys[day];
    var orderPlacementDay = sendcloudDeliveryMethod.order_placement_days[orderPlacementDayName];

    // if not found then this means that the merchant has not configured a cut-off time for this day
    if (!orderPlacementDay || !orderPlacementDay.enabled) return true;

    // determine cut off time
    var cutOffDate = Site.getCalendar();
    cutOffDate.set(Calendar.MINUTE, orderPlacementDay.cut_off_time_minutes);
    cutOffDate.set(Calendar.HOUR_OF_DAY, orderPlacementDay.cut_off_time_hours);

    // check if cut-off time for placing orders on this date is in the past
    if (cutOffDate.before(orderPlacementDate)) return false;

    return true;
}

/**
 * Checks if service point delivery is enabled and which carriers configured for this shipping method are supported.
 * @returns {Object} Object indicating is service point delivery is applicable and for which carriers
 */
function isServicePointDeliveryApplicable() {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var connectionObj = CustomObjectMgr.getCustomObject('SendcloudConnection', 'CONNECTION');

    if (!connectionObj || !connectionObj.custom.servicePointEnabled) {
        return {
            applicable: false,
            carriers: []
        };
    }

    var carriers = connectionObj.custom.servicePointCarriers;
    return {
        applicable: carriers.length !== 0,
        carriers: carriers
    };
}

/**
 * Returns the locale data for the sendcloud checkout
 * @returns {Object} locale data
 */
function getDeliveryLocaleData() {
    var Resource = require('dw/web/Resource');
    var localeData = {
        locale: request.locale.replace('_', '-'), // eslint-disable-line
        localeMessages: {
            'Delivered by {carrier}': Resource.msg('checkout.locale.deliveredby', 'sendcloud', 'Delivered by {carrier}'),
            'We couldn’t display this delivery option. Choose another option to continue.': Resource.msg('checkout.locale.error.render', 'sendcloud', 'We couldn’t display this delivery option. Choose another option to continue.')
        }
    };
    return localeData;
}

/**
 * Plain JS object that represents a DW Script API dw.order.ShippingMethod object
 * @param {dw.order.ShippingMethod} shippingMethod - the default shipment of the current basket
 */
function ShippingMethodModel(shippingMethod) {
    // call base constructor
    if (base) base.apply(this, arguments);

    this.applicable = true;

    this.isSendcloudCheckoutMethod = shippingMethod.custom.sendcloudCheckout;
    if (shippingMethod.custom.sendcloudCheckout) {
        try {
            this.sendcloudDeliveryMethod = JSON.parse(shippingMethod.custom.sendcloudDeliveryMethodJson);
        } catch (e) {
            var Logger = require('dw/system/Logger');
            var sendcloudLog = Logger.getLogger('sendcloud', 'sendcloud');
            sendcloudLog.error('Cannot parse sendcloudDeliveryMethodJson for shipping method {0}', shippingMethod.ID);
            this.applicable = false;
            return;
        }

        this.sendcloudDeliveryMethodJson = shippingMethod.custom.sendcloudDeliveryMethodJson;
        this.sendcloudLocaleData = getDeliveryLocaleData();

        if (this.sendcloudDeliveryMethod.delivery_method_type === 'same_day_delivery') {
            this.applicable = isSameDayDeliveryApplicable(this.sendcloudDeliveryMethod);
        } else if (this.sendcloudDeliveryMethod.delivery_method_type === 'standard_delivery') {
            this.applicable = isStandardDeliveryApplicable(this.sendcloudDeliveryMethod);
        }
    }

    this.sendcloudServicePointMethod = !!shippingMethod.custom.sendcloudServicePoints;
    if (this.sendcloudServicePointMethod) {
        var servicePointApplicable = isServicePointDeliveryApplicable();
        this.applicable = servicePointApplicable.applicable;
        this.sendcloudServicePointCarriers = servicePointApplicable.carriers;
    }
}

module.exports = ShippingMethodModel;
