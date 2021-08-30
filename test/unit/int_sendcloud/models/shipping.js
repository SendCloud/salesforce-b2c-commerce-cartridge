'use strict';

/* global describe beforeEach it */

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('shipping model', function () {
    var errors = [];
    var ShippingModel = proxyquire('../../../../cartridges/int_sendcloud/cartridge/models/shipping.js', {
        'dw/web/Resource': {
            msg: function (key) { return key; }
        },
        'dw/system/Logger': {
            getLogger: function () {
                return {
                    error: function (error) { errors.push(error); }
                };
            }
        }
    });

    beforeEach(function () {
        errors = [];
    });

    describe('Constructor', function () {
        it('Should not set service point address if no service point data is suplied', function () {
            var shipment = {
                custom: {
                    sendcloudServicePointData: null
                }
            };
            var result = new ShippingModel(shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isUndefined(result.servicePointAddress, 'Result.servicePointAddress is not correct');
            assert.equal(errors.length, 0, 'No error should be logged');
        });

        it('Should log error if service point data is not valid JSON', function () {
            var shipment = {
                custom: {
                    sendcloudServicePointData: '{'
                }
            };
            var result = new ShippingModel(shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isUndefined(result.servicePointAddress, 'Result.servicePointAddress is not correct');
            assert.equal(errors.length, 1, 'An error should be logged');
            assert.isTrue(errors[0].indexOf('Could not parse service point data') === 0, 'The error is not correct');
        });

        it('Should set service point address if service point data is suplied', function () {
            var shipment = {
                custom: {
                    sendcloudServicePointData: '{"name":"NAME","street":"STREET","house_number":"HOUSE_NUMBER","postal_code":"POSTAL_CODE","city":"CITY","phone":"PHONE","country":"COUNTRY"}'
                }
            };
            var result = new ShippingModel(shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isNotNull(result.servicePointAddress, 'Result.servicePointAddress is not correct');
            assert.equal(result.servicePointAddress.firstName, 'summary.label.servicepoint', 'firstName is not correct');
            assert.equal(result.servicePointAddress.lastName, 'NAME', 'lastName is not correct');
            assert.equal(result.servicePointAddress.address1, 'STREET HOUSE_NUMBER', 'address1 is not correct');
            assert.equal(result.servicePointAddress.postalCode, 'POSTAL_CODE', 'postalCode is not correct');
            assert.equal(result.servicePointAddress.city, 'CITY', 'city is not correct');
            assert.equal(result.servicePointAddress.phone, 'PHONE', 'phone is not correct');
            assert.isNotNull(result.servicePointAddress.countryCode, 'countryCode is not correct');
            assert.equal(result.servicePointAddress.countryCode.displayValue, 'country.COUNTRY', 'countryCode.displayValue is not correct');
            assert.equal(result.servicePointAddress.countryCode.value, 'COUNTRY', 'countryCode.value is not correct');
            assert.equal(errors.length, 0, 'No error should be logged');
        });
    });
});
