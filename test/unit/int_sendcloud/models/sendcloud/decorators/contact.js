'use strict';

/* global describe it */

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('contact decorator', function () {
    var decorator = proxyquire('../../../../../../cartridges/int_sendcloud/cartridge/models/sendcloud/decorators/contact', {});

    it('Adds contact details for order', function () {
        var order = {
            customerEmail: 'CUSTOMERMEAIL'
        };
        var shipment = {
            shippingAddress: {
                companyName: 'COMPANYNAME',
                fullName: 'FULLNAME',
                phone: 'PHONE'
            }
        };
        var model = {};
        decorator(model, order, shipment);
        assert.equal(model.company_name, 'COMPANYNAME', 'The company_name is not correct');
        assert.equal(model.name, 'FULLNAME', 'The name is not correct');
        assert.equal(model.email, 'CUSTOMERMEAIL', 'The email is not correct');
        assert.equal(model.telephone, 'PHONE', 'The telephone is not correct');
    });
});
