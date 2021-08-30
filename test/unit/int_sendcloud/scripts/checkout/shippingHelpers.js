'use strict';

/* global describe beforeEach it */

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

/**
 * Returns an object with an oterator function for the specified array.
 * This canbe used as mock for dw.util.Collection.
 * @param {Array} items - The items for the list
 * @returns {Object} An object with iterator function
 */
function getList(items) {
    return {
        length: items.length,
        iterator: function () {
            var i = 0;
            return {
                hasNext: function () {
                    return i < items.length;
                },
                next: function () {
                    return items[i++];
                }
            };
        }
    };
}

describe('shippingHelpers', function () {
    var supportedLocales = ['en-us', 'nl-nl', 'en-uk'];
    var defaultLocale = 'en-us';
    var shippingHelpers = proxyquire('../../../../../cartridges/int_sendcloud/cartridge/scripts/checkout/shippingHelpers', {
        'dw/system/Site': {
            current: {
                preferences: {
                    describe: function () {
                        return {
                            getCustomAttributeDefinition: function (type) {
                                if (type === 'sendcloudPointPickerDefaultLocale') {
                                    if (!supportedLocales) return null;
                                    var localeValues = supportedLocales.map(function (v) {
                                        return { value: v };
                                    });
                                    return {
                                        values: getList(localeValues)
                                    };
                                }
                                return null;
                            }
                        };
                    }
                },
                getCustomPreferenceValue: function (id) {
                    if (id === 'sendcloudPointPickerDefaultLocale') {
                        return defaultLocale;
                    }
                    return null;
                }
            }
        }
    });

    beforeEach(function () {
        supportedLocales = ['en-us', 'nl-nl', 'nl-be', 'en-uk'];
        defaultLocale = 'en-us';
    });

    describe('determineSendcloudServicePointLocale', function () {
        it('Should return default if nothing configured', function () {
            supportedLocales = null;
            defaultLocale = null;
            var result = shippingHelpers.determineSendcloudServicePointLocale('ab_CD');
            assert.equal(result, 'en-us', 'Result is not correct');
        });

        it('Should return default if country and language do not match', function () {
            var result = shippingHelpers.determineSendcloudServicePointLocale('ab_CD');
            assert.equal(result, 'en-us', 'Result is not correct');
        });

        it('Should return first matching locale if language matches for country+language locale', function () {
            var result = shippingHelpers.determineSendcloudServicePointLocale('nl_AB');
            assert.equal(result, 'nl-nl', 'Result is not correct');
        });

        it('Should return first matching locale if language matches for language locale', function () {
            var result = shippingHelpers.determineSendcloudServicePointLocale('nl');
            assert.equal(result, 'nl-nl', 'Result is not correct');
        });

        it('Should return matching locale if country and language match for country+language locale', function () {
            var result = shippingHelpers.determineSendcloudServicePointLocale('nl_BE');
            assert.equal(result, 'nl-be', 'Result is not correct');
        });
    });
});
