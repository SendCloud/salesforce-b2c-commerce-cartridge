'use strict';

/* global beforeEach describe it */

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('checkout decorator', function () {
    var errors = [];
    var decorator = proxyquire('../../../../../../cartridges/int_sendcloud/cartridge/models/sendcloud/decorators/checkout', {
        'dw/system/Logger': {
            getLogger: function () {
                return {
                    error: function (msg, arg) {
                        if (arg) msg = msg.replace('{0}', arg); // eslint-disable-line no-param-reassign
                        errors.push(msg);
                    }
                };
            }
        }
    });

    beforeEach(function () {
        errors = [];
    });

    it('Should not add checkout payload to order model if shipment is not for sendcloud checkout', function () {
        var order = {};
        var shipment = {
            custom: {}
        };
        var model = {};
        decorator(model, order, shipment);
        assert.isFalse('checkout_payload' in model, 'The checkout_payload is not correct');
    });

    it('Should log error if product functionalities cannot be parsed', function () {
        var order = {
            orderNo: 'ORDERNO'
        };
        var shipment = {
            custom: {
                sendcloudDeliveryMethodType: 'METHODTYPE',
                sendcloudShippingProductFunctionalities: '{'
            }
        };
        var model = {};
        decorator(model, order, shipment);
        assert.equal(errors.length, 1, 'An error should be logged');
        assert.equal(errors[0], 'Cannot parse sendcloudShippingProductFunctionalities of order ORDERNO', 'The error is not correct');
    });

    it('Should add checkout payload to order model', function () {
        var order = {};
        var shipment = {
            custom: {
                sendcloudDeliveryMethodType: 'METHODTYPE',
                sendcloudShippingProductFunctionalities: '{"a":"AA","b":true,"c":123}',
                sendcloudSenderAddressID: 'ADDRESSID',
                sendcloudShippingProductCode: 'PRODUCTCODE',
                sendcloudShippingProductName: 'PRODUCTNAME',
                sendcloudDeliveryDate: 'DELIVERYDATE',
                sendcloudDeliveryDateFormatted: 'DELIVERYDATEFORMATTED',
                sendcloudParcelHandoverDate: 'HANDOVERDATE'
            }
        };
        var expectedPayload = {
            sender_address_id: 'ADDRESSID',
            shipping_product: {
                code: 'PRODUCTCODE',
                name: 'PRODUCTNAME',
                selected_functionalities: {
                    a: 'AA',
                    b: true,
                    c: 123
                }
            },
            delivery_method_type: 'METHODTYPE',
            delivery_method_data: {
                delivery_date: 'DELIVERYDATE',
                formatted_delivery_date: 'DELIVERYDATEFORMATTED',
                parcel_handover_date: 'HANDOVERDATE'
            }
        };
        var model = {};
        decorator(model, order, shipment);
        assert.deepEqual(model.checkout_payload, expectedPayload, 'The checkout_payload is not correct');
    });
});
