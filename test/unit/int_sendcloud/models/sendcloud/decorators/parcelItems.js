'use strict';

/* global describe beforeEach it */

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

/**
 * Returns an object with an iterator function for the specified array.
 * This can be used as mock for dw.util.Collection.
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

describe('parcel items decorator', function () {
    var taxationPolicy = 0;
    var MoneyMock = function (value, currencyCode) {
        this.value = value;
        this.currencyCode = currencyCode;
    };
    MoneyMock.prototype.add = function (money) {
        return new MoneyMock(this.value + money.value, this.currencyCode);
    };
    MoneyMock.prototype.subtract = function (money) {
        return new MoneyMock(this.value - money.value, this.currencyCode);
    };
    MoneyMock.prototype.multiply = function (factor) {
        return new MoneyMock(this.value * factor, this.currencyCode);
    };

    var decorator = proxyquire('../../../../../../cartridges/int_sendcloud/cartridge/models/sendcloud/decorators/parcelItems', {
        'dw/value/Money': MoneyMock,
        'dw/order/TaxMgr': {
            TAX_POLICY_GROSS: 0,
            TAX_POLICY_NET: 1,
            getTaxationPolicy: function () {
                return taxationPolicy;
            }
        },
        '*/cartridge/models/sendcloud/parcelItem': function () {
            this.args = Array.prototype.slice.call(arguments);
        }
    });

    beforeEach(function () {
        taxationPolicy = 0;
    });

    it('Adds parcel details for simple order', function () {
        var order = {
            currencyCode: 'CUR'
        };
        var lineItem = {
            bundledProductLineItems: { empty: true },
            product: { custom: { weight: 234.56 } },
            proratedPrice: new MoneyMock(123.45, 'CUR'),
            quantityValue: 1
        };
        var shipment = {
            productLineItems: getList([lineItem]),
            adjustedMerchandizeTotalGrossPrice: new MoneyMock(123.45, 'CUR')
        };
        var model = {};
        decorator(model, order, shipment);
        assert.equal(model.weight, '234.560', 'The weight is not correct');
        assert.equal(model.parcel_items.length, 1, 'The parcel_items is not correct');
        assert.isNotNull(model.parcel_items[0], 'The parcel_item is not correct');
        assert.equal(model.parcel_items[0].args.length, 2, 'The parcel_item arguments is not correct');
        assert.equal(model.parcel_items[0].args[0], lineItem, 'The parcel_item line item is not correct');
        assert.equal(model.parcel_items[0].args[1].value, '123.45', 'The parcel_item price is not correct');
    });

    it('Adds parcel details for order of product that no longer exists', function () {
        var order = {
            currencyCode: 'CUR'
        };
        var lineItem = {
            bundledProductLineItems: { empty: true },
            product: null,
            proratedPrice: new MoneyMock(123.45, 'CUR'),
            quantityValue: 1
        };
        var shipment = {
            productLineItems: getList([lineItem]),
            adjustedMerchandizeTotalGrossPrice: new MoneyMock(123.45, 'CUR')
        };
        var model = {};
        decorator(model, order, shipment);
        assert.isUndefined(model.weight, 'The weight is not correct');
        assert.equal(model.parcel_items.length, 1, 'The parcel_items is not correct');
        assert.isNotNull(model.parcel_items[0], 'The parcel_item is not correct');
        assert.equal(model.parcel_items[0].args.length, 2, 'The parcel_item arguments is not correct');
        assert.equal(model.parcel_items[0].args[0], lineItem, 'The parcel_item line item is not correct');
        assert.equal(model.parcel_items[0].args[1].value, '123.45', 'The parcel_item price is not correct');
    });

    it('Adds parcel details for order with multiple products and rounding difference', function () {
        taxationPolicy = 1;
        var order = {
            currencyCode: 'CUR'
        };
        var lineItem1 = {
            bundledProductLineItems: { empty: true },
            product: { custom: { weight: 12.345 } },
            proratedPrice: new MoneyMock(70, 'CUR'),
            grossPrice: new MoneyMock(120, 'CUR'),
            netPrice: new MoneyMock(100, 'CUR'),
            quantityValue: 1
        };
        var lineItem2 = {
            bundledProductLineItems: { empty: true },
            product: { custom: { weight: 45.678 } },
            proratedPrice: new MoneyMock(150, 'CUR'),
            grossPrice: new MoneyMock(220, 'CUR'),
            netPrice: new MoneyMock(200, 'CUR'),
            quantityValue: 1
        };
        var shipment = {
            productLineItems: getList([lineItem1, lineItem2]),
            adjustedMerchandizeTotalGrossPrice: new MoneyMock(249.02, 'CUR')
        };
        var model = {};
        decorator(model, order, shipment);
        assert.isUndefined(model.isEmpty, 'A non-empty shipment instance should be returned');
        assert.equal(model.weight, '58.023', 'The weight is not correct');
        assert.equal(model.parcel_items.length, 2, 'The parcel_items is not correct');
        assert.isNotNull(model.parcel_items[0], 'The first parcel_item is not correct');
        assert.equal(model.parcel_items[0].args.length, 2, 'The first parcel_item arguments is not correct');
        assert.equal(model.parcel_items[0].args[0], lineItem1, 'The first parcel_item line item is not correct');
        assert.equal(model.parcel_items[0].args[1].value, '84.00', 'The first parcel_item price is not correct');
        assert.isNotNull(model.parcel_items[1], 'The second parcel_item is not correct');
        assert.equal(model.parcel_items[1].args.length, 2, 'The second parcel_item arguments is not correct');
        assert.equal(model.parcel_items[1].args[0], lineItem2, 'The second parcel_item line item is not correct');
        assert.equal(model.parcel_items[1].args[1].value, '165.02', 'The second parcel_item price is not correct');
    });

    it('Adds parcel details for order with multiple bundles and rounding difference', function () {
        var order = {
            currencyCode: 'CUR'
        };
        var lineItem1a = {
            product: { custom: { weight: 2.222 } },
            quantityValue: 2
        };
        var lineItem1b = {
            product: { custom: { weight: 1.111 } },
            quantityValue: 4
        };
        var lineItem2a = {
            product: { custom: { weight: 20 } },
            quantityValue: 1
        };
        var lineItem2b = {
            product: { custom: { weight: 30 } },
            quantityValue: 1
        };
        var lineItem1 = {
            bundledProductLineItems: getList([lineItem1a, lineItem1b]),
            proratedPrice: new MoneyMock(60, 'CUR'),
            quantityValue: 2
        };
        var lineItem2 = {
            bundledProductLineItems: getList([lineItem2a, lineItem2b]),
            proratedPrice: new MoneyMock(150, 'CUR'),
            quantityValue: 1
        };
        var shipment = {
            productLineItems: getList([lineItem1, lineItem2]),
            adjustedMerchandizeTotalGrossPrice: new MoneyMock(210.02, 'CUR')
        };
        var model = {};
        decorator(model, order, shipment);
        assert.isUndefined(model.isEmpty, 'A non-empty shipment instance should be returned');
        assert.equal(model.weight, '58.888');
        assert.equal(model.parcel_items.length, 4);
        assert.isNotNull(model.parcel_items[0], 'parcel_item 0 is not correct');
        assert.equal(model.parcel_items[0].args.length, 2, 'parcel_item 0 arguments is not correct');
        assert.equal(model.parcel_items[0].args[0], lineItem1a, 'parcel_item 0 line item is not correct');
        assert.equal(model.parcel_items[0].args[1].value, '20.00', 'parcel_item 0 price is not correct');
        assert.isNotNull(model.parcel_items[1], 'parcel_item 1 is not correct');
        assert.equal(model.parcel_items[1].args.length, 2, 'parcel_item 1 arguments is not correct');
        assert.equal(model.parcel_items[1].args[0], lineItem1b, 'parcel_item 1 line item is not correct');
        assert.equal(model.parcel_items[1].args[1].value, '40.00', 'parcel_item 1 price is not correct');
        assert.isNotNull(model.parcel_items[2], 'parcel_item 2 is not correct');
        assert.equal(model.parcel_items[2].args.length, 2, 'parcel_item 2 arguments is not correct');
        assert.equal(model.parcel_items[2].args[0], lineItem2a, 'parcel_item 2 line item is not correct');
        assert.equal(model.parcel_items[2].args[1].value, '75.01', 'parcel_item 2 price is not correct');
        assert.isNotNull(model.parcel_items[3], 'parcel_item 3 is not correct');
        assert.equal(model.parcel_items[3].args.length, 2, 'parcel_item 3 arguments is not correct');
        assert.equal(model.parcel_items[3].args[0], lineItem2b, 'parcel_item 3 line item is not correct');
        assert.equal(model.parcel_items[3].args[1].value, '75.01', 'parcel_item 3 price is not correct');
    });
});
