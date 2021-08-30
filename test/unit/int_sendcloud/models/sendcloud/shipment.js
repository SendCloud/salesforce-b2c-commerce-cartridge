'use strict';

/* global describe beforeEach it */

var assert = require('chai').assert;
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('shipment model', function () {
    var baseDecoratorSpy = sinon.spy();
    var contactDecoratorSpy = sinon.spy();
    var addressDecoratorSpy = sinon.spy();
    var parcelItemsDecoratorSpy = sinon.spy();
    var checkoutDecoratorSpy = sinon.spy();

    var ShipmentModel = proxyquire('../../../../../cartridges/int_sendcloud/cartridge/models/sendcloud/shipment', {
        '*/cartridge/models/sendcloud/decorators/index': {
            base: baseDecoratorSpy,
            contact: contactDecoratorSpy,
            address: addressDecoratorSpy,
            parcelItems: parcelItemsDecoratorSpy,
            checkout: checkoutDecoratorSpy
        }
    });

    beforeEach(function () {
        baseDecoratorSpy.reset();
        contactDecoratorSpy.reset();
        addressDecoratorSpy.reset();
        parcelItemsDecoratorSpy.reset();
        checkoutDecoratorSpy.reset();
    });

    it('Returns empty shipment instance if no shipping address is present', function () {
        var order = { };
        var shipment = { };
        var result = new ShipmentModel(order, shipment);
        assert.isTrue(result.isEmpty, 'An empty shipment instance should be returned');
        assert.isTrue(baseDecoratorSpy.notCalled, 'Decorator `base` should not be called');
        assert.isTrue(contactDecoratorSpy.notCalled, 'Decorator `contact` should not be called');
        assert.isTrue(addressDecoratorSpy.notCalled, 'Decorator `address` should not be called');
        assert.isTrue(parcelItemsDecoratorSpy.notCalled, 'Decorator `parcelItems` should not be called');
        assert.isTrue(checkoutDecoratorSpy.notCalled, 'Decorator `checkout` should not be called');
    });

    it('Returns empty shipment instance if no shipping address is present', function () {
        var order = { };
        var shipment = { shippingAddress: { } };
        var result = new ShipmentModel(order, shipment);
        assert.isUndefined(result.isEmpty, 'A non-empty shipment instance should be returned');
        assert.isTrue(baseDecoratorSpy.withArgs(sinon.match.object, order, shipment).calledOnce, 'Decorator `base` should be called');
        assert.isTrue(contactDecoratorSpy.withArgs(sinon.match.object, order, shipment).calledOnce, 'Decorator `contact` should be called');
        assert.isTrue(addressDecoratorSpy.withArgs(sinon.match.object, order, shipment).calledOnce, 'Decorator `address` should be called');
        assert.isTrue(parcelItemsDecoratorSpy.withArgs(sinon.match.object, order, shipment).calledOnce, 'Decorator `parcelItems` should be called');
        assert.isTrue(checkoutDecoratorSpy.withArgs(sinon.match.object, order, shipment).calledOnce, 'Decorator `checkout` should be called');
    });
});
