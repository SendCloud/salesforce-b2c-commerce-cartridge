'use strict';

/* global describe it */

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('address decorator', function () {
    var decorator = proxyquire('../../../../../../cartridges/int_sendcloud/cartridge/models/sendcloud/decorators/address', {});

    it('Adds address details to order model', function () {
        var order = {
            customerEmail: 'CUSTOMERMEAIL'
        };
        var shipment = {
            shippingAddress: {
                address1: 'ADDRESS1',
                address2: 'ADDRESS2',
                city: 'CITY',
                countryCode: { value: 'COUNTRYCODE' },
                postalCode: 'POSTALCODE',
                stateCode: 'STATECODE'
            },
            custom: {
                sendcloudServicePointId: 9876,
                sendcloudPostNumber: 'POSTNUMBER'
            }
        };
        var model = {};
        decorator(model, order, shipment);
        assert.equal(model.address, 'ADDRESS1', 'The address is not correct');
        assert.equal(model.address_2, 'ADDRESS2', 'The address_2 is not correct');
        assert.equal(model.city, 'CITY', 'The city is not correct');
        assert.equal(model.country, 'COUNTRYCODE', 'The country is not correct');
        assert.equal(model.house_number, '', 'The house_number is not correct');
        assert.equal(model.postal_code, 'POSTALCODE', 'The postal_code is not correct');
        assert.equal(model.to_post_number, 'POSTNUMBER', 'The to_post_number is not correct');
        assert.equal(model.to_service_point, 9876, 'The to_service_point is not correct');
        assert.equal(model.to_state, 'STATECODE', 'The to_state is not correct');
    });
});
