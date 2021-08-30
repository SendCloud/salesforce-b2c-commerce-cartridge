'use strict';

var server = require('server');
var Resource = require('dw/web/Resource');

/**
 * Renders JSON to the output stream.
 * We cannot use res.json since that will not render arrays correctly and add additional properties.
 * @param {Object} res - The SFRA response object
 * @param {number} statusCode - The HTTP response code
 * @param {Object|Array} data - The data to render as JSON
 */
function renderJson(res, statusCode, data) {
    res.setStatusCode(statusCode);
    res.setContentType('application/json');
    res.print(JSON.stringify(data));
}

/**
 * Middleware validating if the basic authentication matches that stored in site preferences,
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next call in the middleware chain
 */
function validateAuthentication(req, res, next) {
    var authenticated = false;
    var providedAuthorization = req.httpHeaders.authorization;
    if (providedAuthorization) {
        var Site = require('dw/system/Site');
        var StringUtils = require('dw/util/StringUtils');
        var site = Site.current;
        var username = site.getCustomPreferenceValue('sendcloudNotificationUsername');
        var password = site.getCustomPreferenceValue('sendcloudNotificationPassword');
        var expectedAuthorization = 'Basic ' + StringUtils.encodeBase64(username + ':' + password);
        authenticated = (providedAuthorization === expectedAuthorization);
    }
    if (authenticated) {
        next();
    } else {
        renderJson(res, 404, {
            message: Resource.msg('error.authentication.failed', 'sendcloud', null)
        });
        this.emit('route:Complete', req, res);
    }
}

server.post('Notify', server.middleware.https, validateAuthentication, function (req, res, next) {
    var notificationHelpers = require('*/cartridge/scripts/helpers/sendcloudNotificationHelpers');

    // check body
    if (!req.body) {
        // no body
        renderJson(res, 400, {
            message: Resource.msg('error.no.request.body', 'sendcloud', null)
        });
        return next();
    }

    // check signature
    var signatureValid = notificationHelpers.validateSignature(req);
    if (!signatureValid) {
        // signature is not valid
        var Logger = require('dw/system/Logger');
        var sendcloudLog = Logger.getLogger('sendcloud', 'sendcloud');
        sendcloudLog.warn('Invalid signature for notification: {0}', req.body);
        renderJson(res, 403, [{
            message: Resource.msg('error.invalid.signature', 'sendcloud', null)
        }]);
        return next();
    }

    // store notification
    var status = notificationHelpers.storeNotification(req.body);
    if (status.error) {
        // signature is valid but message is not valid
        renderJson(res, 400, [{
            message: Resource.msg('error.' + status.errorCode, 'sendcloud', null)
        }]);
        return next();
    }

    // signature and message are valid
    renderJson(res, 204, {
        message: Resource.msg('webhook.message.received', 'sendcloud', null)
    });
    return next();
});


server.use('CheckoutConfiguration', server.middleware.https, validateAuthentication, function (req, res, next) {
    // check body and compose notification JSON
    var notificationJson;
    var receivedKey;
    if (req.httpMethod === 'PUT') {
        if (!req.body) {
            // no body
            renderJson(res, 400, [{
                message: Resource.msg('error.no.request.body', 'sendcloud', null)
            }]);
            return next();
        }
        notificationJson = '{ "action": "put_checkout_configuration", "payload": ' + req.body + ' }';
        receivedKey = 'checkout.configuration.put.received';
    } else if (req.httpMethod === 'DELETE') {
        notificationJson = '{ "action": "delete_checkout_configuration" }';
        receivedKey = 'checkout.configuration.delete.received';
    } else {
        // unexpected HTTP method
        renderJson(res, 400, [{
            message: Resource.msgf('error.unexpected.request.method', 'sendcloud', null, req.httpMethod)
        }]);
        return next();
    }

    // store notification
    var notificationHelpers = require('*/cartridge/scripts/helpers/sendcloudNotificationHelpers');
    var status = notificationHelpers.storeNotification(notificationJson, 'CHECKOUT_CONFIGURATION');
    if (status.error) {
        // signature is valid but message is not valid
        renderJson(res, 400, [{
            message: Resource.msg('error.' + status.errorCode, 'sendcloud', null)
        }]);
        return next();
    }

    renderJson(res, 200, {
        message: Resource.msg(receivedKey, 'sendcloud', null)
    });
    return next();
});

module.exports = server.exports();
