'use strict';

/* global describe beforeEach it */

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('sendcloudOrderHelpers', function () {
    var sitePreferences = {};
    var exportOrdersServiceResults = [];

    var sendcloudOrderHelpers = proxyquire('../../../../../cartridges/int_sendcloud/cartridge/scripts/helpers/sendcloudOrderHelpers', {
        'dw/system/Transaction': {
            wrap: function (func) {
                return func();
            }
        },
        'dw/system/Site': {
            current: {
                getCustomPreferenceValue: function (key) {
                    return sitePreferences[key];
                }
            }
        },
        'dw/system/Logger': {
            getLogger: function () {
                return {
                    fatal: function () { },
                    info: function () { }
                };
            }
        },
        '*/cartridge/scripts/services/exportOrders': {
            exportOrders: function () {
                return exportOrdersServiceResults.shift();
            }
        }
    });

    beforeEach(function () {
        sitePreferences = { sendcloudMaxFailedAttempts: 3 };
        exportOrdersServiceResults = [];
    });

    describe('exportOrderBatch', function () {
        it('Returns error when service returns error', function () {
            var order = { custom: {} };
            var shipment = { custom: {} };
            var orderBatch = {
                'ORDER-SHIPMENT': {
                    order: order,
                    shipment: shipment
                }
            };
            exportOrdersServiceResults = [
                {
                    error: true,
                    circuitBroken: false
                }
            ];
            var result = sendcloudOrderHelpers.exportOrderBatch(orderBatch, []);
            assert.isTrue(result.error, 'An error should be returned');
            assert.isFalse(result.warning, 'No warning should be returned');
            assert.isFalse('sendcloudShipmentUUID' in shipment.custom, 'Shipment UUID on shipment is not correct');
            assert.isFalse('sendcloudExportStatus' in order.custom, 'Sendcloud export status on order is not correct');
        });

        it('Throws exception when service breaker is active', function () {
            var order = { custom: {} };
            var shipment = { custom: {} };
            var orderBatch = {
                'ORDER-SHIPMENT': {
                    order: order,
                    shipment: shipment
                }
            };
            exportOrdersServiceResults = [
                {
                    error: true,
                    circuitBroken: true
                }
            ];
            assert.throws(function () { sendcloudOrderHelpers.exportOrderBatch(orderBatch, []); }, 'Circuit breaker is active');
        });

        it('Returns no error or warning when all orders are exported successfully and sets shipment uuids and sets export statuses', function () {
            var order1 = { custom: {} };
            var order2 = { custom: {} };
            var shipment1a = { custom: {} };
            var shipment1b = { custom: {} };
            var shipment2 = { custom: {} };
            var orderBatch = {
                'ORDER1-SHIPMENT1a': {
                    order: order1,
                    shipment: shipment1a
                },
                'ORDER1-SHIPMENT1b': {
                    order: order1,
                    shipment: shipment1b
                },
                'ORDER2-SHIPMENT2': {
                    order: order2,
                    shipment: shipment2
                }
            };
            exportOrdersServiceResults = [
                {
                    error: false,
                    circuitBroken: false,
                    response: [
                        {
                            external_order_id: 'ORDER1',
                            external_shipment_id: 'ORDER1-SHIPMENT1a',
                            shipment_uuid: 'UUID1a',
                            status: 'created'
                        },
                        {
                            external_order_id: 'ORDER1',
                            external_shipment_id: 'ORDER1-SHIPMENT1b',
                            shipment_uuid: 'UUID1b',
                            status: 'created'
                        },
                        {
                            external_order_id: 'ORDER2',
                            external_shipment_id: 'ORDER2-SHIPMENT2',
                            shipment_uuid: 'UUID2',
                            status: 'created'
                        }
                    ]
                }
            ];
            var result = sendcloudOrderHelpers.exportOrderBatch(orderBatch, []);
            assert.isFalse(result.error, 'No error should be returned');
            assert.isFalse(result.warning, 'No warning should be returned');
            assert.equal(shipment1a.custom.sendcloudShipmentUUID, 'UUID1a', 'Shipment UUID on shipment 1a is not correct');
            assert.equal(shipment1b.custom.sendcloudShipmentUUID, 'UUID1b', 'Shipment UUID on shipment 1b is not correct');
            assert.equal(shipment2.custom.sendcloudShipmentUUID, 'UUID2', 'Shipment UUID on shipment 2 is not correct');
            assert.equal(order1.custom.sendcloudExportStatus, 'EXPORTED', 'Sendcloud export status on order 1 is not correct');
            assert.equal(order2.custom.sendcloudExportStatus, 'EXPORTED', 'Sendcloud export status on order 2 is not correct');
        });

        it('Returns no error or warning when all orders are exported successfully and sets shipment uuids and does set export status for previously failed orders', function () {
            var order1 = { custom: {} };
            var order2 = { custom: {} };
            var shipment1a = { custom: {} };
            var shipment1b = { custom: {} };
            var shipment2 = { custom: {} };
            var orderBatch = {
                'ORDER1-SHIPMENT1a': {
                    order: order1,
                    shipment: shipment1a
                },
                'ORDER1-SHIPMENT1b': {
                    order: order1,
                    shipment: shipment1b
                },
                'ORDER2-SHIPMENT2': {
                    order: order2,
                    shipment: shipment2
                }
            };
            exportOrdersServiceResults = [
                {
                    error: false,
                    circuitBroken: false,
                    response: [
                        {
                            external_order_id: 'ORDER1',
                            external_shipment_id: 'ORDER1-SHIPMENT1a',
                            shipment_uuid: 'UUID1a',
                            status: 'created'
                        },
                        {
                            external_order_id: 'ORDER1',
                            external_shipment_id: 'ORDER1-SHIPMENT1b',
                            shipment_uuid: 'UUID1b',
                            status: 'created'
                        },
                        {
                            external_order_id: 'ORDER2',
                            external_shipment_id: 'ORDER2-SHIPMENT2',
                            shipment_uuid: 'UUID2',
                            status: 'created'
                        }
                    ]
                }
            ];
            var failedOrderNos = ['ORDER2'];
            var result = sendcloudOrderHelpers.exportOrderBatch(orderBatch, failedOrderNos);
            assert.isFalse(result.error, 'No error should be returned');
            assert.isFalse(result.warning, 'No warning should be returned');
            assert.equal(shipment1a.custom.sendcloudShipmentUUID, 'UUID1a', 'Shipment UUID on shipment 1a is not correct');
            assert.equal(shipment1b.custom.sendcloudShipmentUUID, 'UUID1b', 'Shipment UUID on shipment 1b is not correct');
            assert.equal(shipment2.custom.sendcloudShipmentUUID, 'UUID2', 'Shipment UUID on shipment 2 is not correct');
            assert.equal(order1.custom.sendcloudExportStatus, 'EXPORTED', 'Sendcloud export status on order 1 is not correct');
            assert.isFalse('sendcloudExportStatus' in order2.custom, 'Sendcloud export status on order 2 is not correct');
        });

        it('Returns a warning when some orders are not exported successfully and sets shipment uuids and sets export statuses on successfully exported orders', function () {
            var order1 = { custom: { sendcloudFailedAttempts: 1 } };
            var order2 = { custom: {} };
            var shipment1a = { custom: {} };
            var shipment1b = { custom: {} };
            var shipment1c = { custom: {} };
            var shipment2 = { custom: {} };
            var orderBatch = {
                'ORDER1-SHIPMENT1a': {
                    order: order1,
                    shipment: shipment1a
                },
                'ORDER1-SHIPMENT1b': {
                    order: order1,
                    shipment: shipment1b
                },
                'ORDER1-SHIPMENT1c': {
                    order: order1,
                    shipment: shipment1c
                },
                'ORDER2-SHIPMENT2': {
                    order: order2,
                    shipment: shipment2
                }
            };
            exportOrdersServiceResults = [
                {
                    error: false,
                    circuitBroken: false,
                    response: [
                        {
                            external_order_id: 'ORDER1',
                            external_shipment_id: 'ORDER1-SHIPMENT1a',
                            status: 'error'
                        },
                        {
                            external_order_id: 'ORDER1',
                            external_shipment_id: 'ORDER1-SHIPMENT1b',
                            shipment_uuid: 'UUID1b',
                            status: 'created'
                        },
                        {
                            external_order_id: 'ORDER1',
                            external_shipment_id: 'ORDER1-SHIPMENT1c',
                            status: 'error'
                        },
                        {
                            external_order_id: 'ORDER2',
                            external_shipment_id: 'ORDER2-SHIPMENT2',
                            shipment_uuid: 'UUID2',
                            status: 'created'
                        }
                    ]
                }
            ];
            var result = sendcloudOrderHelpers.exportOrderBatch(orderBatch, []);
            assert.isFalse(result.error, 'No error should be returned');
            assert.isTrue(result.warning, 'A warning should be returned');
            assert.isFalse('sendcloudShipmentUUID' in shipment1a.custom, 'Shipment UUID on shipment 1a is not correct');
            assert.equal(shipment1b.custom.sendcloudShipmentUUID, 'UUID1b', 'Shipment UUID on shipment 1b is not correct');
            assert.isFalse('sendcloudShipmentUUID' in shipment1c.custom, 'Shipment UUID on shipment 1c is not correct');
            assert.equal(shipment2.custom.sendcloudShipmentUUID, 'UUID2', 'Shipment UUID on shipment 2 is not correct');
            assert.equal(order1.custom.sendcloudExportStatus, 'NOTEXPORTED', 'Sendcloud export status on order 1 is not correct');
            assert.equal(order2.custom.sendcloudExportStatus, 'EXPORTED', 'Sendcloud export status on order 2 is not correct');
            assert.equal(order1.custom.sendcloudFailedAttempts, 2, 'Sendcloud export status on order 1 is not correct');
        });

        it('Returns a warning when some orders are not exported successfully too many times and sets shipment uuids and sets export statuses on successfully exported orders', function () {
            var order1 = { custom: {} };
            var order2 = { custom: { sendcloudFailedAttempts: 2 } };
            var shipment1a = { custom: {} };
            var shipment1b = { custom: {} };
            var shipment2 = { custom: {} };
            var orderBatch = {
                'ORDER1-SHIPMENT1a': {
                    order: order1,
                    shipment: shipment1a
                },
                'ORDER1-SHIPMENT1b': {
                    order: order1,
                    shipment: shipment1b
                },
                'ORDER2-SHIPMENT2': {
                    order: order2,
                    shipment: shipment2
                }
            };
            exportOrdersServiceResults = [
                {
                    error: false,
                    circuitBroken: false,
                    response: [
                        {
                            external_order_id: 'ORDER1',
                            external_shipment_id: 'ORDER1-SHIPMENT1a',
                            shipment_uuid: 'UUID1a',
                            status: 'created'
                        },
                        {
                            external_order_id: 'ORDER1',
                            external_shipment_id: 'ORDER1-SHIPMENT1b',
                            shipment_uuid: 'UUID1b',
                            status: 'created'
                        },
                        {
                            external_order_id: 'ORDER2',
                            external_shipment_id: 'ORDER2-SHIPMENT2',
                            status: 'error'
                        }
                    ]
                }
            ];
            var result = sendcloudOrderHelpers.exportOrderBatch(orderBatch, []);
            assert.isFalse(result.error, 'No error should be returned');
            assert.isTrue(result.warning, 'A warning should be returned');
            assert.equal(shipment1a.custom.sendcloudShipmentUUID, 'UUID1a', 'Shipment UUID on shipment 1a is not correct');
            assert.equal(shipment1b.custom.sendcloudShipmentUUID, 'UUID1b', 'Shipment UUID on shipment 1b is not correct');
            assert.isFalse('sendcloudShipmentUUID' in shipment2.custom, 'Shipment UUID on shipment 2 is not correct');
            assert.equal(order1.custom.sendcloudExportStatus, 'EXPORTED', 'Sendcloud export status on order 1 is not correct');
            assert.equal(order2.custom.sendcloudExportStatus, 'FAILED', 'Sendcloud export status on order 2 is not correct');
            assert.equal(order2.custom.sendcloudFailedAttempts, 3, 'Sendcloud export status on order 2 is not correct');
        });
    });
});
