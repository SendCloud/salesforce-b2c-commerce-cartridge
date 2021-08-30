'use strict';

/* global describe beforeEach it */

var assert = require('chai').assert;
var sinon = require('sinon');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('notifications job step', function () {
    var connectionCustomObject = null;
    var notificationCustomOjbects = [];
    var warnings = [];
    var errors = [];
    var infos = [];

    var StatusMock = function (status, code) {
        this.status = status;
        this.code = code;
    };
    StatusMock.OK = 0;
    StatusMock.ERROR = 1;

    var contextPutSpy = sinon.spy();
    var jobStepExecution = {
        jobExecution: {
            context: {
                put: contextPutSpy
            }
        }
    };

    var notificationsJobStep = proxyquire('../../../../../cartridges/int_sendcloud/cartridge/scripts/jobsteps/notifications', {
        'dw/object/CustomObjectMgr': {
            queryCustomObjects: function () {
                var items = notificationCustomOjbects || [];
                var i = 0;
                return {
                    hasNext: function () {
                        return i < items.length;
                    },
                    next: function () {
                        return items[i++];
                    },
                    close: function () { }
                };
            },
            remove: function (object) {
                object.isRemoved = true; // eslint-disable-line no-param-reassign
            },
            getCustomObject: function (type, keyValue) {
                if (type === 'SendcloudConnection' && keyValue === 'CONNECTION') {
                    return connectionCustomObject;
                }
                return null;
            }
        },
        'dw/system/Transaction': {
            wrap: function (func) {
                return func();
            }
        },
        'dw/system/Logger': {
            getLogger: function () {
                return {
                    error: function (msg, arg) {
                        if (arg) msg = msg.replace('{0}', arg); // eslint-disable-line no-param-reassign
                        errors.push(msg);
                    },
                    warn: function (msg, arg) {
                        if (arg) msg = msg.replace('{0}', arg); // eslint-disable-line no-param-reassign
                        warnings.push(msg);
                    },
                    info: function (msg, arg) {
                        if (arg) msg = msg.replace('{0}', arg); // eslint-disable-line no-param-reassign
                        infos.push(msg);
                    }
                };
            }
        },
        'dw/system/Status': StatusMock,
        '*/cartridge/scripts/helpers/sendcloudNotificationHelpers': {
            processNotification: function (notification) {
                return notification.valueToReturn;
            }
        }
    });

    beforeEach(function () {
        connectionCustomObject = null;
        notificationCustomOjbects = [];
        warnings = [];
        errors = [];
        infos = [];
        contextPutSpy.reset();
    });

    describe('processNotifications', function () {
        it('Should return disabled status if job step is disabled', function () {
            var parameters = { disabled: true };
            var status = notificationsJobStep.processNotifications(parameters, jobStepExecution);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.OK, 'Status.status is not correct');
            assert.equal(status.code, 'DISABLED', 'Status.code is not correct');
        });

        it('Should update connection custom object if validation is disabled until integration is established', function () {
            var parameters = { disabled: false };
            connectionCustomObject = { custom: { allowNewIntegration: { value: 'ENABLED_UNTIL_INTEGRATION_ESTABLISHED' } } };
            var status = notificationsJobStep.processNotifications(parameters, jobStepExecution);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.OK, 'Status.status is not correct');
            assert.equal(status.code, 'OK', 'Status.code is not correct');
            assert.equal(connectionCustomObject.custom.allowNewIntegration, 'ENABLED_UNTIL_NEXT_JOB_RUN', 'allowNewIntegration is not correct');
        });

        it('Should update connection custom object if validation is disabled until next job run', function () {
            var parameters = { disabled: false };
            connectionCustomObject = { custom: { allowNewIntegration: { value: 'ENABLED_UNTIL_NEXT_JOB_RUN' } } };
            var status = notificationsJobStep.processNotifications(parameters, jobStepExecution);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.OK, 'Status.status is not correct');
            assert.equal(status.code, 'OK', 'Status.code is not correct');
            assert.equal(connectionCustomObject.custom.allowNewIntegration, 'DISABLED', 'allowNewIntegration is not correct');
        });

        it('Should return error status if exception occurs while processing notification', function () {
            var parameters = { disabled: false };
            connectionCustomObject = { custom: { allowNewIntegration: { value: 'DISABLED' } } };
            notificationCustomOjbects = [{
                custom: {
                    processStatus: 'NEW',
                    message: '{'    // ivalid JSON to force exception
                }
            }];
            var status = notificationsJobStep.processNotifications(parameters, jobStepExecution);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.ERROR, 'Status.status is not correct');
            assert.equal(status.code, 'ERROR', 'Status.code is not correct');
            assert.equal(errors.length, 1, 'An error should be logged');
        });

        it('Should return warn status and set notification to retry if new notification cannot be processed successfully', function () {
            var parameters = { disabled: false };
            connectionCustomObject = { custom: { allowNewIntegration: { value: 'DISABLED' } } };
            var notificationCustomOjbect = {
                custom: {
                    processStatus: { value: 'NEW' },
                    message: '{ "valueToReturn": { "success": false } }'
                }
            };
            notificationCustomOjbects = [notificationCustomOjbect];
            var status = notificationsJobStep.processNotifications(parameters, jobStepExecution);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.OK, 'Status.status is not correct');
            assert.equal(status.code, 'WARN', 'Status.code is not correct');
            assert.isFalse(!!notificationCustomOjbect.isRemoved, 'Custom object should not be removed');
            assert.equal(notificationCustomOjbect.custom.processStatus, 'RETRY', 'processStatus is not correct');
            assert.equal(warnings.length, 1, 'A warning should be logged');
        });

        it('Should return error status if retry notification cannot be processed successfully', function () {
            var parameters = { disabled: false };
            connectionCustomObject = { custom: { allowNewIntegration: { value: 'DISABLED' } } };
            var notificationCustomOjbect = {
                custom: {
                    processStatus: { value: 'RETRY' },
                    message: '{ "valueToReturn": { "success": false } }'
                }
            };
            notificationCustomOjbects = [notificationCustomOjbect];
            var status = notificationsJobStep.processNotifications(parameters, jobStepExecution);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.ERROR, 'Status.status is not correct');
            assert.equal(status.code, 'ERROR', 'Status.code is not correct');
            assert.equal(notificationCustomOjbect.custom.processStatus, 'ERROR', 'processStatus is not correct');
            assert.equal(warnings.length, 1, 'A warning should be logged');
        });

        it('Should return ok status and remove custom object if new notification can be processed successfully', function () {
            var parameters = { disabled: false };
            connectionCustomObject = { custom: { allowNewIntegration: { value: 'DISABLED' } } };
            var notificationCustomOjbect = {
                custom: {
                    processStatus: { value: 'NEW' },
                    message: '{ "valueToReturn": { "success": true, "updateNotification": true } }'
                }
            };
            notificationCustomOjbects = [notificationCustomOjbect];
            var status = notificationsJobStep.processNotifications(parameters, jobStepExecution);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.OK, 'Status.status is not correct');
            assert.equal(status.code, 'OK', 'Status.code is not correct');
            assert.isTrue(notificationCustomOjbect.isRemoved, 'Custom object should be removed');
        });

        it('Should return ok status and remove custom object if retry notification can be processed successfully', function () {
            var parameters = { disabled: false };
            connectionCustomObject = { custom: { allowNewIntegration: { value: 'DISABLED' } } };
            var notificationCustomOjbect = {
                custom: {
                    processStatus: { value: 'RETRY' },
                    message: '{ "valueToReturn": { "success": true, "updateNotification": true } }'
                }
            };
            notificationCustomOjbects = [notificationCustomOjbect];
            var status = notificationsJobStep.processNotifications(parameters, jobStepExecution);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.OK, 'Status.status is not correct');
            assert.equal(status.code, 'OK', 'Status.code is not correct');
            assert.isTrue(notificationCustomOjbect.isRemoved, 'Custom object should be removed');
        });

        it('Should return update status if needed and set other status in job context if notification can be processed successfully', function () {
            var parameters = { disabled: false };
            connectionCustomObject = { custom: { allowNewIntegration: { value: 'DISABLED' } } };
            var notificationCustomOjbect = {
                custom: {
                    processStatus: { value: 'NEW' },
                    message: '{ "valueToReturn": { "success": true, "updateNotification": false, "updateCheckoutConfiguration": true } }'
                }
            };
            notificationCustomOjbects = [notificationCustomOjbect];
            var status = notificationsJobStep.processNotifications(parameters, jobStepExecution);
            assert.isNotNull(status, 'Status should not be null');
            assert.equal(status.status, StatusMock.OK, 'Status.status is not correct');
            assert.equal(status.code, 'UPDATE_CHECKOUT_CONFIGURATION', 'Status.code is not correct');
            assert.isFalse(!!notificationCustomOjbect.isRemoved, 'Custom object should not be removed');
            assert.isTrue(contextPutSpy.withArgs('JobEndStatus', 'OK').calledOnce, 'Other status should be stored in job execution context');
        });
    });
});
