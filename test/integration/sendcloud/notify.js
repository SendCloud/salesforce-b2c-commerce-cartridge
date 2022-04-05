'use strict';

/* global describe beforeEach it */

var assert = require('chai').assert;
var crypto = require('crypto');
var request = require('request');
var config = require('../it.config');

describe('SendCloud controller', function () {
    describe('Notify', function () {
        it('should return 404 if authentication fails', function (done) {
            var url = config.baseUrl + '/Sendcloud-Notify';
            var myRequest = {
                url: url,
                method: 'POST',
                rejectUnauthorized: false,
                auth: {
                    user: config.sendcloudNotificationUsername,
                    pass: 'INCORRECTPASSWORD'
                }
            };
            request(myRequest, function (error, response) {
                assert.isNull(error, error);
                assert.equal(response.statusCode, 404, 'Incorrect statusCode');
                done();
            });
        });

        it('should return 400 if authentication succeeds and no request body', function (done) {
            var url = config.baseUrl + '/Sendcloud-Notify';
            var myRequest = {
                url: url,
                method: 'POST',
                rejectUnauthorized: false,
                auth: {
                    user: config.sendcloudNotificationUsername,
                    pass: config.sendcloudNotificationPassword
                }
            };
            request(myRequest, function (error, response) {
                assert.isNull(error, error);
                assert.equal(response.statusCode, 400, 'Incorrect statusCode');
                done();
            });
        });

        it('should return 403 if authentication succeeds and invalid signature', function (done) {
            var url = config.baseUrl + '/Sendcloud-Notify';
            var myRequest = {
                url: url,
                method: 'POST',
                rejectUnauthorized: false,
                auth: {
                    user: config.sendcloudNotificationUsername,
                    pass: config.sendcloudNotificationPassword
                },
                headers: {
                    'sendcloud-signature': 'INCORRECT'
                },
                body: '{}'
            };
            request(myRequest, function (error, response) {
                assert.isNull(error, error);
                assert.equal(response.statusCode, 403, 'Incorrect statusCode');
                done();
            });
        });

        it('should return 400 if authentication succeeds and valid signature and invalid message', function (done) {
            var body = '{';
            var hash = crypto.createHmac('sha256', config.secretKey).update(body).digest('hex');
            var url = config.baseUrl + '/Sendcloud-Notify';
            var myRequest = {
                url: url,
                method: 'POST',
                rejectUnauthorized: false,
                auth: {
                    user: config.sendcloudNotificationUsername,
                    pass: config.sendcloudNotificationPassword
                },
                headers: {
                    'sendcloud-signature': hash
                },
                body: body
            };
            request(myRequest, function (error, response) {
                assert.isNull(error, error);
                assert.equal(response.statusCode, 400, 'Incorrect statusCode');
                done();
            });
        });

        it('should return 200 if authentication succeeds and valid signature and valid message', function (done) {
            var body = '{}';
            var hash = crypto.createHmac('sha256', config.secretKey).update(body).digest('hex');
            var url = config.baseUrl + '/Sendcloud-Notify';
            var myRequest = {
                url: url,
                method: 'POST',
                rejectUnauthorized: false,
                auth: {
                    user: config.sendcloudNotificationUsername,
                    pass: config.sendcloudNotificationPassword
                },
                headers: {
                    'sendcloud-signature': hash
                },
                body: body
            };
            request(myRequest, function (error, response) {
                assert.isNull(error, error);
                assert.equal(response.statusCode, 204, 'Incorrect statusCode');
                done();
            });
        });
    });

    describe('CheckoutConfiguration', function () {
        // only testing error scenarios in order not to update the checkout configuration on the B2C Commerce instance

        it('should return 404 if authentication fails', function (done) {
            var url = config.baseUrl + '/Sendcloud-CheckoutConfiguration';
            var myRequest = {
                url: url,
                method: 'PUT',
                rejectUnauthorized: false,
                auth: {
                    user: config.sendcloudNotificationUsername,
                    pass: 'INCORRECTPASSWORD'
                }
            };
            request(myRequest, function (error, response) {
                assert.isNull(error, error);
                assert.equal(response.statusCode, 404, 'Incorrect statusCode');
                done();
            });
        });

        it('should return 400 for unsupported HTTP method', function (done) {
            var url = config.baseUrl + '/Sendcloud-CheckoutConfiguration';
            var myRequest = {
                url: url,
                method: 'GET',
                rejectUnauthorized: false,
                auth: {
                    user: config.sendcloudNotificationUsername,
                    pass: config.sendcloudNotificationPassword
                }
            };
            request(myRequest, function (error, response) {
                assert.isNull(error, error);
                assert.equal(response.statusCode, 400, 'Incorrect statusCode');
                done();
            });
        });

        it('should return 400 for PUT request with empty body', function (done) {
            var url = config.baseUrl + '/Sendcloud-CheckoutConfiguration';
            var myRequest = {
                url: url,
                method: 'PUT',
                body: '',
                rejectUnauthorized: false,
                auth: {
                    user: config.sendcloudNotificationUsername,
                    pass: config.sendcloudNotificationPassword
                }
            };
            request(myRequest, function (error, response) {
                assert.isNull(error, error);
                assert.equal(response.statusCode, 400, 'Incorrect statusCode');
                done();
            });
        });
    });
});
