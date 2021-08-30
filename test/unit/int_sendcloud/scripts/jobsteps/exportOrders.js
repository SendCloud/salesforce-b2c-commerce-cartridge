'use strict';

/* global describe beforeEach it */

var assert = require('chai').assert;
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

/**
 * Returns an object with an iterator function for the specified array.
 * This can be used as mock for dw.util.Collection.
 * @param {Array} items - The items for the list
 * @returns {Object} An object with iterator function
 */
function getList(items) {
    return {
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

describe('exportOrders job step', function () {
    var currentDate = new Date();
    var ordersToBeProcessed = [];
    var exportOrderBatchResults = [];
    var exportOrderBatchSpy = sinon.spy(function () { return exportOrderBatchResults.shift(); });
    var processOrdersSpy = sinon.spy(function (callback) {
        for (var i = 0; i < ordersToBeProcessed.length; i++) {
            callback(ordersToBeProcessed[i]);
        }
    });

    var StatusMock = function (status, code) {
        this.status = status;
        this.code = code;
    };
    StatusMock.OK = 0;
    StatusMock.ERROR = 1;

    var CalendarMock = function () {
        this.time = new Date(currentDate.getTime());
        this.getTime = function () { return this.time; };
        this.add = function (field, value) {
            if (field === CalendarMock.DATE) {
                this.time.setDate(this.time.getDate() + value);
            }
        };
    };
    CalendarMock.DATE = 5;

    var exportOrdersJobStep = proxyquire('../../../../../cartridges/int_sendcloud/cartridge/scripts/jobsteps/exportOrders', {
        'dw/order/Order': {
            EXPORT_STATUS_EXPORTED: 'EXPORTED'
        },
        'dw/order/OrderMgr': {
            processOrders: processOrdersSpy
        },
        'dw/system/Logger': {
            getLogger: function () {
                return {
                    info: function () { }
                };
            }
        },
        'dw/system/Status': StatusMock,
        'dw/util/Calendar': CalendarMock,
        '*/cartridge/scripts/helpers/sendcloudOrderHelpers': {
            exportOrderBatch: exportOrderBatchSpy
        }
    });

    beforeEach(function () {
        exportOrderBatchResults = [];
        exportOrderBatchSpy.reset();
        processOrdersSpy.reset();
    });

    describe('exportOrders', function () {
        it('Should return disabled status if job step is disabled', function () {
            var parameters = { disabled: true };
            var status = exportOrdersJobStep.exportOrders(parameters);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.OK, 'Status.status is not correct');
            assert.equal(status.code, 'DISABLED', 'Status.code is not correct');
        });

        it('Should return ok status if no orders are found', function () {
            currentDate = new Date(2021, 5, 15);
            var parameters = { disabled: false, batchSize: 2, orderAgeDaysLimit: 10 };
            var status = exportOrdersJobStep.exportOrders(parameters);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.OK, 'Status.status is not correct');
            assert.equal(status.code, 'OK', 'Status.code is not correct');
            assert.isTrue(processOrdersSpy.withArgs(sinon.match.func, sinon.match.string, 'EXPORTED', 'NOTEXPORTED', new Date(2021, 5, 5)).calledOnce, 'OrderMgr.processOrders should be called once with correct arguments');
            assert.isTrue(exportOrderBatchSpy.notCalled, 'sendcloudOrderHelpers.exportOrderBatch should not be called');
        });

        it('Should export orders in batches and return warning status if not all orders are exported successfully in non-last batch', function () {
            currentDate = new Date(2021, 5, 15);
            ordersToBeProcessed = [
                {
                    orderNo: 'ORDER1',
                    shipments: getList([
                        { ID: 'SHIPMENT1a', shippingAddress: {} },
                        { ID: 'SHIPMENT1b', shippingAddress: {} }
                    ])
                },
                {
                    orderNo: 'ORDER2',
                    shipments: getList([
                        { ID: 'SHIPMENT2', shippingAddress: {} }
                    ])
                }
            ];
            exportOrderBatchResults = [
                { error: false, warning: true },
                { error: false, warning: false }
            ];
            var parameters = { disabled: false, batchSize: 2, orderAgeDaysLimit: 10 };
            var status = exportOrdersJobStep.exportOrders(parameters);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.OK, 'Status.status is not correct');
            assert.equal(status.code, 'WARN', 'Status.code is not correct');
            assert.isTrue(processOrdersSpy.withArgs(sinon.match.func, sinon.match.string, 'EXPORTED', 'NOTEXPORTED', new Date(2021, 5, 5)).calledOnce, 'OrderMgr.processOrders should be called once with correct arguments');
            assert.isTrue(exportOrderBatchSpy.calledTwice, 'sendcloudOrderHelpers.exportOrderBatch should be called 2 times');
            var exportOrderBatchCall1 = exportOrderBatchSpy.getCall(0);
            assert.equal(Object.keys(exportOrderBatchCall1.args[0]).length, 2, 'Number of shipments in batch 1 is not correct');
            assert.equal(exportOrderBatchCall1.args[1].length, 0, 'Number of previously failed orders in batch 1 is not correct');
            var exportOrderBatchCall2 = exportOrderBatchSpy.getCall(1);
            assert.equal(Object.keys(exportOrderBatchCall2.args[0]).length, 1, 'Number of shipments in batch 2 is not correct');
            assert.equal(exportOrderBatchCall2.args[1].length, 0, 'Number of previously failed orders in batch 2 is not correct');
        });

        it('Should export orders in batches and return warning status if not all orders are exported successfully in last batch', function () {
            currentDate = new Date(2021, 5, 15);
            ordersToBeProcessed = [
                {
                    orderNo: 'ORDER1',
                    shipments: getList([
                        { ID: 'SHIPMENT1a', shippingAddress: {} },
                        { ID: 'SHIPMENT1b', shippingAddress: {} }
                    ])
                },
                {
                    orderNo: 'ORDER2',
                    shipments: getList([
                        { ID: 'SHIPMENT2', shippingAddress: {} }
                    ])
                }
            ];
            exportOrderBatchResults = [
                { error: false, warning: false },
                { error: false, warning: true }
            ];
            var parameters = { disabled: false, batchSize: 2, orderAgeDaysLimit: 10 };
            var status = exportOrdersJobStep.exportOrders(parameters);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.OK, 'Status.status is not correct');
            assert.equal(status.code, 'WARN', 'Status.code is not correct');
            assert.isTrue(processOrdersSpy.withArgs(sinon.match.func, sinon.match.string, 'EXPORTED', 'NOTEXPORTED', new Date(2021, 5, 5)).calledOnce, 'OrderMgr.processOrders should be called once with correct arguments');
            assert.isTrue(exportOrderBatchSpy.calledTwice, 'sendcloudOrderHelpers.exportOrderBatch should be called 2 times');
            var exportOrderBatchCall1 = exportOrderBatchSpy.getCall(0);
            assert.equal(Object.keys(exportOrderBatchCall1.args[0]).length, 2, 'Number of shipments in batch 1 is not correct');
            assert.equal(exportOrderBatchCall1.args[1].length, 0, 'Number of previously failed orders in batch 1 is not correct');
            var exportOrderBatchCall2 = exportOrderBatchSpy.getCall(1);
            assert.equal(Object.keys(exportOrderBatchCall2.args[0]).length, 1, 'Number of shipments in batch 2 is not correct');
            assert.equal(exportOrderBatchCall2.args[1].length, 0, 'Number of previously failed orders in batch 2 is not correct');
        });

        it('Should export orders in batches and return error status if export of non-last batch fails', function () {
            currentDate = new Date(2021, 5, 15);
            ordersToBeProcessed = [
                {
                    orderNo: 'ORDER1',
                    shipments: getList([
                        { ID: 'SHIPMENT1a', shippingAddress: {} },
                        { ID: 'SHIPMENT1b', shippingAddress: {} }
                    ])
                },
                {
                    orderNo: 'ORDER2',
                    shipments: getList([
                        { ID: 'SHIPMENT2', shippingAddress: {} }
                    ])
                }
            ];
            exportOrderBatchResults = [
                { error: true, warning: false },
                { error: false, warning: false }
            ];
            var parameters = { disabled: false, batchSize: 2, orderAgeDaysLimit: 10 };
            var status = exportOrdersJobStep.exportOrders(parameters);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.ERROR, 'Status.status is not correct');
            assert.equal(status.code, 'ERROR', 'Status.code is not correct');
            assert.isTrue(processOrdersSpy.withArgs(sinon.match.func, sinon.match.string, 'EXPORTED', 'NOTEXPORTED', new Date(2021, 5, 5)).calledOnce, 'OrderMgr.processOrders should be called once with correct arguments');
            assert.isTrue(exportOrderBatchSpy.calledTwice, 'sendcloudOrderHelpers.exportOrderBatch should be called 2 times');
            var exportOrderBatchCall1 = exportOrderBatchSpy.getCall(0);
            assert.equal(Object.keys(exportOrderBatchCall1.args[0]).length, 2, 'Number of shipments in batch 1 is not correct');
            assert.equal(exportOrderBatchCall1.args[1].length, 0, 'Number of previously failed orders in batch 1 is not correct');
            var exportOrderBatchCall2 = exportOrderBatchSpy.getCall(1);
            assert.equal(Object.keys(exportOrderBatchCall2.args[0]).length, 1, 'Number of shipments in batch 2 is not correct');
            assert.equal(exportOrderBatchCall2.args[1].length, 0, 'Number of previously failed orders in batch 2 is not correct');
        });

        it('Should export orders in batches and return error status if export of last batch fails', function () {
            currentDate = new Date(2021, 5, 15);
            ordersToBeProcessed = [
                {
                    orderNo: 'ORDER1',
                    shipments: getList([
                        { ID: 'SHIPMENT1a', shippingAddress: {} },
                        { ID: 'SHIPMENT1b', shippingAddress: {} }
                    ])
                },
                {
                    orderNo: 'ORDER2',
                    shipments: getList([
                        { ID: 'SHIPMENT2', shippingAddress: {} }
                    ])
                }
            ];
            exportOrderBatchResults = [
                { error: false, warning: false },
                { error: true, warning: false }
            ];
            var parameters = { disabled: false, batchSize: 2, orderAgeDaysLimit: 10 };
            var status = exportOrdersJobStep.exportOrders(parameters);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.ERROR, 'Status.status is not correct');
            assert.equal(status.code, 'ERROR', 'Status.code is not correct');
            assert.isTrue(processOrdersSpy.withArgs(sinon.match.func, sinon.match.string, 'EXPORTED', 'NOTEXPORTED', new Date(2021, 5, 5)).calledOnce, 'OrderMgr.processOrders should be called once with correct arguments');
            assert.isTrue(exportOrderBatchSpy.calledTwice, 'sendcloudOrderHelpers.exportOrderBatch should be called 2 times');
            var exportOrderBatchCall1 = exportOrderBatchSpy.getCall(0);
            assert.equal(Object.keys(exportOrderBatchCall1.args[0]).length, 2, 'Number of shipments in batch 1 is not correct');
            assert.equal(exportOrderBatchCall1.args[1].length, 0, 'Number of previously failed orders in batch 1 is not correct');
            var exportOrderBatchCall2 = exportOrderBatchSpy.getCall(1);
            assert.equal(Object.keys(exportOrderBatchCall2.args[0]).length, 1, 'Number of shipments in batch 2 is not correct');
            assert.equal(exportOrderBatchCall2.args[1].length, 0, 'Number of previously failed orders in batch 2 is not correct');
        });

        it('Should export orders in batches and return ok status if all orders are exported successfully', function () {
            currentDate = new Date(2021, 5, 15);
            ordersToBeProcessed = [
                {
                    orderNo: 'ORDER1',
                    shipments: getList([
                        { ID: 'SHIPMENT1a', shippingAddress: {} },
                        { ID: 'SHIPMENT1b', shippingAddress: {} }
                    ])
                },
                {
                    orderNo: 'ORDER2',
                    shipments: getList([
                        { ID: 'SHIPMENT2', shippingAddress: {} }
                    ])
                },
                {
                    orderNo: 'ORDER3',
                    shipments: getList([
                        { ID: 'SHIPMENT3', shippingAddress: {} }
                    ])
                }
            ];
            exportOrderBatchResults = [
                { error: false, warning: false },
                { error: false, warning: false }
            ];
            var parameters = { disabled: false, batchSize: 2, orderAgeDaysLimit: 10 };
            var status = exportOrdersJobStep.exportOrders(parameters);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.OK, 'Status.status is not correct');
            assert.equal(status.code, 'OK', 'Status.code is not correct');
            assert.isTrue(processOrdersSpy.withArgs(sinon.match.func, sinon.match.string, 'EXPORTED', 'NOTEXPORTED', new Date(2021, 5, 5)).calledOnce, 'OrderMgr.processOrders should be called once with correct arguments');
            assert.isTrue(exportOrderBatchSpy.calledTwice, 'sendcloudOrderHelpers.exportOrderBatch should be called 2 times');
            var exportOrderBatchCall1 = exportOrderBatchSpy.getCall(0);
            assert.equal(Object.keys(exportOrderBatchCall1.args[0]).length, 2, 'Number of shipments in batch 1 is not correct');
            assert.equal(exportOrderBatchCall1.args[1].length, 0, 'Number of previously failed orders in batch 1 is not correct');
            var exportOrderBatchCall2 = exportOrderBatchSpy.getCall(1);
            assert.equal(Object.keys(exportOrderBatchCall2.args[0]).length, 2, 'Number of shipments in batch 2 is not correct');
            assert.equal(exportOrderBatchCall2.args[1].length, 0, 'Number of previously failed orders in batch 2 is not correct');
        });
    });
});
