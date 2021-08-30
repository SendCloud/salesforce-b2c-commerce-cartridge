'use strict';

/* global describe it */

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('base decorator', function () {
    var decorator = proxyquire('../../../../../../cartridges/int_sendcloud/cartridge/models/sendcloud/decorators/base', {});

    it('Adds order details for order with Sendcloud Checkout shipping method', function () {
        var order = {
            currencyCode: 'CUR',
            invoiceNo: 'INVOICERNO',
            orderNo: 'ORDERNO',
            status: { value: 'STATUS_ID', displayValue: 'STATUS_MSG' },
            paymentStatus: { value: 'PAYMENTSTATUS_ID', displayValue: 'PAYMENTSTATUS_MSG' }
        };
        var shipment = {
            ID: 'SHIPMENTID',
            creationDate: new Date(2021, 0, 5),
            lastModified: new Date(2021, 0, 15),
            totalGrossPrice: { value: 123.45 },
            shippingMethod: { displayName: 'SHIPPINGMETHOD' },
            custom: { sendcloudShippingMethodName: 'INTERNAL_NAME' }
        };
        var model = {};
        decorator(model, order, shipment);
        assert.equal(model.currency, 'CUR', 'The currency is not correct');
        assert.equal(model.customs_invoice_nr, 'INVOICERNO', 'The invoice_nr is not correct');
        assert.isNull(model.customs_shipment_type, 'The customs_shipment_type is not correct');
        assert.equal(model.external_order_id, 'ORDERNO', 'The external_order_id is not correct');
        assert.equal(model.external_shipment_id, 'ORDERNO-SHIPMENTID', 'The external_shipment_id is not correct');
        assert.equal(model.order_number, 'ORDERNO', 'The order_number is not correct');
        assert.isNotNull(model.order_status, 'The order_status is not correct');
        assert.equal(model.order_status.id, 'STATUS_ID', 'The order_status.id is not correct');
        assert.equal(model.order_status.message, 'STATUS_MSG', 'The order_status.message is not correct');
        assert.isNotNull(model.payment_status, 'The payment_status is not correct');
        assert.equal(model.payment_status.id, 'PAYMENTSTATUS_ID', 'The payment_status.id is not correct');
        assert.equal(model.payment_status.message, 'PAYMENTSTATUS_MSG', 'The payment_status.message is not correct');
        assert.isNull(model.shipping_method, 'The shipping_method is not correct');
        assert.equal(model.shipping_method_checkout_name, 'INTERNAL_NAME', 'The shipping_method_checkout_name is not correct');
        assert.equal(model.total_order_value, '123.45', 'The total_order_value is not correct');
        // only validate first part, since second part could be different on different machines due to timezone differences
        assert.equal(model.created_at.indexOf('2021-01-0'), 0, 'The created_at is not correct');
        assert.equal(model.updated_at.indexOf('2021-01-1'), 0, 'The updated_at is not correct');
    });

    it('Adds order details for order with other shipping method', function () {
        var order = {
            currencyCode: 'CUR',
            invoiceNo: 'INVOICERNO',
            orderNo: 'ORDERNO',
            status: { value: 'STATUS_ID', displayValue: 'STATUS_MSG' },
            paymentStatus: { value: 'PAYMENTSTATUS_ID', displayValue: 'PAYMENTSTATUS_MSG' }
        };
        var shipment = {
            ID: 'SHIPMENTID',
            creationDate: new Date(2021, 0, 5),
            lastModified: new Date(2021, 0, 15),
            totalGrossPrice: { value: 123.45 },
            shippingMethod: { displayName: 'SHIPPINGMETHOD' },
            custom: {}
        };
        var model = {};
        decorator(model, order, shipment);
        assert.equal(model.currency, 'CUR', 'The currency is not correct');
        assert.equal(model.customs_invoice_nr, 'INVOICERNO', 'The invoice_nr is not correct');
        assert.isNull(model.customs_shipment_type, 'The customs_shipment_type is not correct');
        assert.equal(model.external_order_id, 'ORDERNO', 'The external_order_id is not correct');
        assert.equal(model.external_shipment_id, 'ORDERNO-SHIPMENTID', 'The external_shipment_id is not correct');
        assert.equal(model.order_number, 'ORDERNO', 'The order_number is not correct');
        assert.isNotNull(model.order_status, 'The order_status is not correct');
        assert.equal(model.order_status.id, 'STATUS_ID', 'The order_status.id is not correct');
        assert.equal(model.order_status.message, 'STATUS_MSG', 'The order_status.message is not correct');
        assert.isNotNull(model.payment_status, 'The payment_status is not correct');
        assert.equal(model.payment_status.id, 'PAYMENTSTATUS_ID', 'The payment_status.id is not correct');
        assert.equal(model.payment_status.message, 'PAYMENTSTATUS_MSG', 'The payment_status.message is not correct');
        assert.isNull(model.shipping_method, 'The shipping_method is not correct');
        assert.equal(model.shipping_method_checkout_name, 'SHIPPINGMETHOD', 'The shipping_method_checkout_name is not correct');
        assert.equal(model.total_order_value, '123.45', 'The total_order_value is not correct');
        // only validate first part, since second part could be different on different machines due to timezone differences
        assert.equal(model.created_at.indexOf('2021-01-0'), 0, 'The created_at is not correct');
        assert.equal(model.updated_at.indexOf('2021-01-1'), 0, 'The updated_at is not correct');
    });
});
