'use strict';

/* global describe beforeEach it */

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('shippingMethod model', function () {
    var CalendarMock = require('../../../../mocks/dw/util/Calendar');
    var currentDate;
    var connectionCustomObject;
    var ShippingMethodModel = proxyquire('../../../../../cartridges/int_sendcloud/cartridge/models/shipping/shippingMethod', {
        'dw/object/CustomObjectMgr': {
            getCustomObject: function (type, keyValue) {
                if (type === 'SendcloudConnection' && keyValue === 'CONNECTION') {
                    return connectionCustomObject;
                }
                return null;
            }
        },
        'dw/util/Calendar': CalendarMock,
        'dw/system/Site': {
            getCalendar: function () {
                return new CalendarMock(currentDate);
            }
        },
        'dw/web/Resource': {
            msg: function (key) { return key; }
        },
        'dw/system/Logger': {
            getLogger: function () {
                return {
                    error: function () { }
                };
            }
        }
    });

    beforeEach(function () {
        currentDate = new Date();
        connectionCustomObject = null;
        global.request = { locale: 'aa_BB' };
    });

    describe('Constructor', function () {
        it('Should set applicable when shipping method is not Sendcloud', function () {
            var shippingMethod = {
                custom: {
                    sendcloudCheckout: false,
                    sendcloudServicePoints: false
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isTrue(result.applicable, 'Result.applicable is not correct');
            assert.isFalse(result.isSendcloudCheckoutMethod, 'Result.isSendcloudCheckoutMethod is not correct');
        });

        it('Should set not-applicable when shipping method is Sendcloud checkout and JSON is not valid', function () {
            var shippingMethod = {
                custom: {
                    sendcloudCheckout: true,
                    sendcloudDeliveryMethodJson: '{'
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isFalse(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.isSendcloudCheckoutMethod, 'Result.isSendcloudCheckoutMethod is not correct');
        });

        it('Should set applicable when shipping method is Sendcloud checkout and type is not same-day or standard', function () {
            var shippingMethod = {
                custom: {
                    sendcloudCheckout: true,
                    sendcloudDeliveryMethodJson: '{ "delivery_method_type": "OTHER" }'
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isTrue(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.isSendcloudCheckoutMethod, 'Result.isSendcloudCheckoutMethod is not correct');
        });

        it('Should set not-applicable when shipping method is Sendcloud checkout and type is same-day and delivery day is not configured', function () {
            currentDate = new Date(2021, 2, 1); // March 1st is a Monday
            var sendcloudDeliveryMethod = {
                delivery_method_type: 'same_day_delivery',
                shipping_product: {
                    carrier_delivery_days: { }
                }
            };
            var shippingMethod = {
                custom: {
                    sendcloudCheckout: true,
                    sendcloudDeliveryMethodJson: JSON.stringify(sendcloudDeliveryMethod)
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isFalse(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.isSendcloudCheckoutMethod, 'Result.isSendcloudCheckoutMethod is not correct');
        });

        it('Should set not-applicable when shipping method is Sendcloud checkout and type is same-day and delivery day is not enabled', function () {
            currentDate = new Date(2021, 2, 1); // March 1st is a Monday
            var sendcloudDeliveryMethod = {
                delivery_method_type: 'same_day_delivery',
                shipping_product: {
                    carrier_delivery_days: {
                        monday: {
                            enabled: false
                        }
                    }
                }
            };
            var shippingMethod = {
                custom: {
                    sendcloudCheckout: true,
                    sendcloudDeliveryMethodJson: JSON.stringify(sendcloudDeliveryMethod)
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isFalse(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.isSendcloudCheckoutMethod, 'Result.isSendcloudCheckoutMethod is not correct');
        });

        it('Should set not-applicable when shipping method is Sendcloud checkout and type is same-day and handover day is not configured', function () {
            currentDate = new Date(2021, 2, 1); // March 1st is a Monday
            var sendcloudDeliveryMethod = {
                delivery_method_type: 'same_day_delivery',
                shipping_product: {
                    carrier_delivery_days: {
                        monday: {
                            enabled: true
                        }
                    }
                },
                parcel_handover_days: {}
            };
            var shippingMethod = {
                custom: {
                    sendcloudCheckout: true,
                    sendcloudDeliveryMethodJson: JSON.stringify(sendcloudDeliveryMethod)
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isFalse(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.isSendcloudCheckoutMethod, 'Result.isSendcloudCheckoutMethod is not correct');
        });

        it('Should set not-applicable when shipping method is Sendcloud checkout and type is same-day and handover day is not enabled', function () {
            currentDate = new Date(2021, 2, 1); // March 1st is a Monday
            var sendcloudDeliveryMethod = {
                delivery_method_type: 'same_day_delivery',
                shipping_product: {
                    carrier_delivery_days: {
                        monday: {
                            enabled: true
                        }
                    }
                },
                parcel_handover_days: {
                    monday: {
                        enabled: false
                    }
                }
            };
            var shippingMethod = {
                custom: {
                    sendcloudCheckout: true,
                    sendcloudDeliveryMethodJson: JSON.stringify(sendcloudDeliveryMethod)
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isFalse(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.isSendcloudCheckoutMethod, 'Result.isSendcloudCheckoutMethod is not correct');
        });

        it('Should set not-applicable when shipping method is Sendcloud checkout and type is same-day and handover time is before current time', function () {
            currentDate = new Date(2021, 2, 1, 16, 40); // March 1st is a Monday
            var sendcloudDeliveryMethod = {
                delivery_method_type: 'same_day_delivery',
                shipping_product: {
                    carrier_delivery_days: {
                        monday: {
                            enabled: true
                        }
                    }
                },
                parcel_handover_days: {
                    monday: {
                        enabled: true,
                        cut_off_time_hours: 16,
                        cut_off_time_minutes: 30
                    }
                }
            };
            var shippingMethod = {
                custom: {
                    sendcloudCheckout: true,
                    sendcloudDeliveryMethodJson: JSON.stringify(sendcloudDeliveryMethod)
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isFalse(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.isSendcloudCheckoutMethod, 'Result.isSendcloudCheckoutMethod is not correct');
        });

        it('Should set applicable when shipping method is Sendcloud checkout and type is same-day and handover time is after current time', function () {
            currentDate = new Date(2021, 2, 1, 16, 20); // March 1st is a Monday
            var sendcloudDeliveryMethod = {
                delivery_method_type: 'same_day_delivery',
                shipping_product: {
                    carrier_delivery_days: {
                        monday: {
                            enabled: true
                        }
                    }
                },
                parcel_handover_days: {
                    monday: {
                        enabled: true,
                        cut_off_time_hours: 16,
                        cut_off_time_minutes: 30
                    }
                }
            };
            var shippingMethod = {
                custom: {
                    sendcloudCheckout: true,
                    sendcloudDeliveryMethodJson: JSON.stringify(sendcloudDeliveryMethod)
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isTrue(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.isSendcloudCheckoutMethod, 'Result.isSendcloudCheckoutMethod is not correct');
            assert.equal(result.sendcloudDeliveryMethodJson, shippingMethod.custom.sendcloudDeliveryMethodJson, 'Result.sendcloudDeliveryMethodJson is not correct');
        });

        it('Should set applicable and set locale data when shipping method is Sendcloud', function () {
            currentDate = new Date(2021, 2, 1, 16, 20); // March 1st is a Monday
            var sendcloudDeliveryMethod = {
                delivery_method_type: 'ANYTHING'
            };
            var shippingMethod = {
                custom: {
                    sendcloudCheckout: true,
                    sendcloudDeliveryMethodJson: JSON.stringify(sendcloudDeliveryMethod)
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isTrue(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.isSendcloudCheckoutMethod, 'Result.isSendcloudCheckoutMethod is not correct');
            assert.equal(result.sendcloudDeliveryMethodJson, shippingMethod.custom.sendcloudDeliveryMethodJson, 'Result.sendcloudDeliveryMethodJson is not correct');
            assert.isTrue('sendcloudLocaleData' in result, 'sendcloudLocaleData is not set');
            assert.equal(result.sendcloudLocaleData.locale, 'aa-BB', 'locale is not correct');
            assert.isTrue('localeMessages' in result.sendcloudLocaleData, 'localeMessages is not set');
            assert.equal(result.sendcloudLocaleData.localeMessages['Delivered by {carrier}'], 'checkout.locale.deliveredby', 'First locale message is not correct');
            assert.equal(result.sendcloudLocaleData.localeMessages['We couldn’t display this delivery option. Choose another option to continue.'], 'checkout.locale.error.render', 'Second locale message is not correct');
        });

        it('Should set applicable when shipping method is sendcloud service point and no Sendcloud connection custom object is present', function () {
            connectionCustomObject = null;
            var shippingMethod = {
                custom: {
                    sendcloudServicePoints: true
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isFalse(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.sendcloudServicePointMethod, 'Result.sendcloudServicePointMethod is not correct');
            assert.deepEqual(result.sendcloudServicePointCarriers, [], 'Result.sendcloudServicePointCarriers is not correct');
        });

        it('Should set applicable when shipping method is sendcloud service point and service points are not enabled in Sendcloud', function () {
            connectionCustomObject = {
                custom: {
                    servicePointEnabled: false,
                    servicePointCarriers: ['aa', 'bb']
                }
            };
            var shippingMethod = {
                custom: {
                    sendcloudServicePoints: true
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isFalse(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.sendcloudServicePointMethod, 'Result.sendcloudServicePointMethod is not correct');
            assert.deepEqual(result.sendcloudServicePointCarriers, [], 'Result.sendcloudServicePointCarriers is not correct');
        });

        it('Should set applicable when shipping method is sendcloud service point and service points are not configured in Sendcloud', function () {
            connectionCustomObject = {
                custom: {
                    servicePointEnabled: true,
                    servicePointCarriers: []
                }
            };
            var shippingMethod = {
                custom: {
                    sendcloudServicePoints: true
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isFalse(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.sendcloudServicePointMethod, 'Result.sendcloudServicePointMethod is not correct');
            assert.deepEqual(result.sendcloudServicePointCarriers, [], 'Result.sendcloudServicePointCarriers is not correct');
        });

        it('Should set applicable and set carriers when shipping method is sendcloud service point and service points are enabled in Sendcloud', function () {
            connectionCustomObject = {
                custom: {
                    servicePointEnabled: true,
                    servicePointCarriers: ['aa', 'bb']
                }
            };
            var shippingMethod = {
                custom: {
                    sendcloudServicePoints: true
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isTrue(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.sendcloudServicePointMethod, 'Result.sendcloudServicePointMethod is not correct');
            assert.deepEqual(result.sendcloudServicePointCarriers, ['aa', 'bb'], 'Result.sendcloudServicePointCarriers is not correct');
        });

        it('Should set applicable when shipping method is Sendcloud and type is standard and order placement days are not configured', function () {
            currentDate = new Date(2021, 2, 1); // March 1st is a Monday
            var sendcloudDeliveryMethod = {
                delivery_method_type: 'standard_delivery',
                order_placement_days: { }
            };
            var shippingMethod = {
                custom: {
                    sendcloudCheckout: true,
                    sendcloudDeliveryMethodJson: JSON.stringify(sendcloudDeliveryMethod)
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isTrue(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.isSendcloudCheckoutMethod, 'Result.isSendcloudCheckoutMethod is not correct');
        });

        it('Should set applicable when shipping method is Sendcloud and type is standard and order placement day is not configured', function () {
            currentDate = new Date(2021, 2, 1); // March 1st is a Monday
            var sendcloudDeliveryMethod = {
                delivery_method_type: 'standard_delivery',
                order_placement_days: {
                    monday: null
                }
            };
            var shippingMethod = {
                custom: {
                    sendcloudCheckout: true,
                    sendcloudDeliveryMethodJson: JSON.stringify(sendcloudDeliveryMethod)
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isTrue(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.isSendcloudCheckoutMethod, 'Result.isSendcloudCheckoutMethod is not correct');
        });

        it('Should set applicable when shipping method is Sendcloud and type is standard and order placement day is not enabled', function () {
            currentDate = new Date(2021, 2, 1); // March 1st is a Monday
            var sendcloudDeliveryMethod = {
                delivery_method_type: 'standard_delivery',
                order_placement_days: {
                    monday: {
                        enabled: false
                    }
                }
            };
            var shippingMethod = {
                custom: {
                    sendcloudCheckout: true,
                    sendcloudDeliveryMethodJson: JSON.stringify(sendcloudDeliveryMethod)
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isTrue(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.isSendcloudCheckoutMethod, 'Result.isSendcloudCheckoutMethod is not correct');
        });

        it('Should set not-applicable when shipping method is Sendcloud and type is standard and order placement time is before current time', function () {
            currentDate = new Date(2021, 2, 1, 16, 40); // March 1st is a Monday
            var sendcloudDeliveryMethod = {
                delivery_method_type: 'standard_delivery',
                order_placement_days: {
                    monday: {
                        enabled: true,
                        cut_off_time_hours: 16,
                        cut_off_time_minutes: 30
                    }
                }
            };
            var shippingMethod = {
                custom: {
                    sendcloudCheckout: true,
                    sendcloudDeliveryMethodJson: JSON.stringify(sendcloudDeliveryMethod)
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isFalse(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.isSendcloudCheckoutMethod, 'Result.isSendcloudCheckoutMethod is not correct');
        });

        it('Should set applicable when shipping method is Sendcloud and type is standard and order placement time is after current time', function () {
            currentDate = new Date(2021, 2, 1, 16, 20); // March 1st is a Monday
            var sendcloudDeliveryMethod = {
                delivery_method_type: 'standard_delivery',
                order_placement_days: {
                    monday: {
                        enabled: true,
                        cut_off_time_hours: 16,
                        cut_off_time_minutes: 30
                    }
                }
            };
            var shippingMethod = {
                custom: {
                    sendcloudCheckout: true,
                    sendcloudDeliveryMethodJson: JSON.stringify(sendcloudDeliveryMethod)
                }
            };
            var shipment = null;
            var result = new ShippingMethodModel(shippingMethod, shipment);
            assert.isNotNull(result, 'Result should not be null');
            assert.isTrue(result.applicable, 'Result.applicable is not correct');
            assert.isTrue(result.isSendcloudCheckoutMethod, 'Result.isSendcloudCheckoutMethod is not correct');
            assert.equal(result.sendcloudDeliveryMethodJson, shippingMethod.custom.sendcloudDeliveryMethodJson, 'Result.sendcloudDeliveryMethodJson is not correct');
        });
    });
});
