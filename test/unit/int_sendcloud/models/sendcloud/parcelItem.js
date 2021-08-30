'use strict';

/* global describe it */

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

/**
 * Creates a mock for a variation model containing variation attributes.
 * @param {...string} nameOrValue - a list of ariation attribute names and values
 * @returns {Object} The variation model mock
 */
function getVariationModelMock(nameOrValue) { // eslint-disable-line no-unused-vars
    var variationAttributes = [];
    var variationAttributeValues = [];
    for (var i = 0; i < arguments.length; i += 2) {
        variationAttributes.push({ displayName: arguments[i] });
        variationAttributeValues.push({ displayValue: arguments[i + 1] });
    }
    var variationModel = {};
    variationModel.productVariationAttributes = getList(variationAttributes);
    variationModel.getSelectedValue = function (variationAttribute) {
        for (var j = 0; j < variationAttributes.length; j++) {
            if (variationAttributes[j] === variationAttribute) return variationAttributeValues[j];
        }
        return null;
    };
    return variationModel;
}

describe('parcel item model', function () {
    var MoneyMock = function (value, currencyCode) {
        this.value = value;
        this.currencyCode = currencyCode;
    };
    MoneyMock.prototype.divide = function (fraction) {
        return new MoneyMock(this.value / fraction, this.currencyCode);
    };

    var ParcelItemModel = proxyquire('../../../../../cartridges/int_sendcloud/cartridge/models/sendcloud/parcelItem', {});

    it('Creates model for line item without product', function () {
        var productLineItem = {
            product: null,
            lineItemText: 'TEXT',
            productID: 'PID',
            quantityValue: 3
        };
        var price = new MoneyMock(123, 'CUR');
        var result = new ParcelItemModel(productLineItem, price);
        assert.equal(result.description, 'TEXT', 'The description is not correct');
        assert.equal(result.hs_code, '', 'The hs_code is not correct');
        assert.equal(result.origin_country, '', 'The origin_country is not correct');
        assert.equal(result.product_id, 'PID', 'The product_id is not correct');
        assert.equal(Object.keys(result.properties).length, 0, 'The properties are not correct');
        assert.equal(result.quantity, 3, 'The quantity is not correct');
        assert.equal(result.sku, 'PID', 'The sku is not correct');
        assert.equal(result.value, '41.00', 'The value is not correct');
        assert.isUndefined(result.weight, 'The weight is not correct');
    });

    it('Creates model for line item with simple product', function () {
        var productLineItem = {
            product: {
                variant: false,
                variationModel: getVariationModelMock(),
                custom: {
                    hsCode: 'HSCODE',
                    countryOfOrigin: 'COUNTRYOFORIGIN',
                    weight: 123.45
                }
            },
            lineItemText: 'TEXT',
            productID: 'PID',
            quantityValue: 3
        };
        var price = new MoneyMock(123.45, 'CUR');
        var result = new ParcelItemModel(productLineItem, price);
        assert.equal(result.description, 'TEXT', 'The description is not correct');
        assert.equal(result.hs_code, 'HSCODE', 'The hs_code is not correct');
        assert.equal(result.origin_country, 'COUNTRYOFORIGIN', 'The origin_country is not correct');
        assert.equal(result.product_id, 'PID', 'The product_id is not correct');
        assert.equal(Object.keys(result.properties).length, 0, 'The properties are not correct');
        assert.equal(result.quantity, 3, 'The quantity is not correct');
        assert.equal(result.sku, 'PID', 'The sku is not correct');
        assert.equal(result.value, '41.15', 'The value is not correct');
        assert.equal(result.weight, '123.450', 'The weight is not correct');
    });

    it('Creates model for line item with variant product', function () {
        var productLineItem = {
            product: {
                variant: true,
                variationModel: getVariationModelMock('VARATTR1', 'VALUE1', 'VARATTR2', 'VALUE2'),
                masterProduct: {
                    ID: 'MASTERID'
                },
                custom: {
                    hsCode: 'HSCODE',
                    countryOfOrigin: 'COUNTRYOFORIGIN',
                    weight: 123.45
                }
            },
            lineItemText: 'TEXT',
            productID: 'VARIANTID',
            quantityValue: 3
        };
        var price = new MoneyMock(123.45, 'CUR');
        var result = new ParcelItemModel(productLineItem, price);
        assert.equal(result.description, 'TEXT', 'The description is not correct');
        assert.equal(result.hs_code, 'HSCODE', 'The hs_code is not correct');
        assert.equal(result.origin_country, 'COUNTRYOFORIGIN', 'The origin_country is not correct');
        assert.equal(result.product_id, 'MASTERID', 'The product_id is not correct');
        var attributeNames = Object.keys(result.properties);
        assert.equal(attributeNames.length, 2, 'The properties are not correct');
        assert.equal(attributeNames[0], 'VARATTR1', 'The first attribute name is not correct');
        assert.equal(result.properties[attributeNames[0]], 'VALUE1', 'The first attribute value is not correct');
        assert.equal(attributeNames[1], 'VARATTR2', 'The second attribute name is not correct');
        assert.equal(result.properties[attributeNames[1]], 'VALUE2', 'The second attribute value is not correct');
        assert.equal(result.quantity, 3, 'The quantity is not correct');
        assert.equal(result.sku, 'VARIANTID', 'The sku is not correct');
        assert.equal(result.value, '41.15', 'The value is not correct');
        assert.equal(result.weight, '123.450', 'The weight is not correct');
    });
});
