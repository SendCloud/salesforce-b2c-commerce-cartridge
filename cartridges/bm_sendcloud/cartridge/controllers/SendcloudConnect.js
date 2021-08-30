'use strict';
/* global request response */

/**
 * Displays the Sendcloud page.
 */
function start() {
    if (request.httpMethod !== 'GET' || !request.isHttpSecure()) return;

    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var connectionObj = CustomObjectMgr.getCustomObject('SendcloudConnection', 'CONNECTION');
    var Site = require('dw/system/Site');
    var notificationUsername = Site.current.getCustomPreferenceValue('sendcloudNotificationUsername');
    var notificationPassword = Site.current.getCustomPreferenceValue('sendcloudNotificationPassword');
    var sendcloudModel = {
        isConnected: !!connectionObj,
        integrationID: connectionObj && connectionObj.custom.integrationID,
        integrationURL: connectionObj ? 'https://panel.sendcloud.sc/#/settings/integrations/sfcc/' + connectionObj.custom.integrationID : '',
        notificationAuthenticationConfigured: !!notificationUsername && !!notificationPassword
    };

    var pdict = {
        sendcloud: sendcloudModel,
        SelectedMenuItem: request.httpParameterMap.SelectedMenuItem && request.httpParameterMap.SelectedMenuItem.value,
        CurrentMenuItemId: request.httpParameterMap.CurrentMenuItemId && request.httpParameterMap.CurrentMenuItemId.value
    };
    var ISML = require('dw/template/ISML');
    ISML.renderTemplate('sendcloud/connect', pdict);
}
exports.Start = start;
exports.Start.public = true;

/**
 * Redirects to Sendcloud to create connection.
 */
function redirect() {
    if (request.httpMethod !== 'POST' || !request.isHttpSecure()) return;

    // temporarily disable the webhook validation, since integration notifications cannot be validated
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');
    var connectionObj = CustomObjectMgr.getCustomObject('SendcloudConnection', 'CONNECTION');
    if (connectionObj) {
        Transaction.wrap(function () {
            connectionObj.custom.allowNewIntegration = 'ENABLED_UNTIL_INTEGRATION_ESTABLISHED';
        });
    }

    // redirect to Sendcloud panel
    var Site = require('dw/system/Site');
    var System = require('dw/system/System');
    var Resource = require('dw/web/Resource');
    var URLAction = require('dw/web/URLAction');
    var URLUtils = require('dw/web/URLUtils');
    var site = Site.current;

    // determine name for this shop as shown in the Sendcloud panel
    var instanceType = System.instanceType;
    var instanceHostnameStart = null;
    if (System.instanceType === System.DEVELOPMENT_SYSTEM) {
        var dotPos = System.instanceHostname.indexOf('.');
        instanceHostnameStart = dotPos === -1 ? System.instanceHostname : System.instanceHostname.substring(0, dotPos);
        if (instanceHostnameStart !== 'development') {
            instanceType = 10;  // sandbox
        }
    }
    var shopName = Resource.msgf('platform.type.' + instanceType, 'sendcloud', null, site.name, instanceHostnameStart);

    // determine URLs with credentials
    var username = site.getCustomPreferenceValue('sendcloudNotificationUsername');
    var password = site.getCustomPreferenceValue('sendcloudNotificationPassword');
    var getUrlWithCredentials = function (action) {
        return URLUtils.https(new URLAction(action, site.ID, site.defaultLocale)).toString().replace('https://', 'https://' + username + ':' + password + '@');
    };
    var webhookUrl = getUrlWithCredentials('Sendcloud-Notify');
    var webshopUrl = getUrlWithCredentials('Sendcloud-CheckoutConfiguration');
    // we need the webshop URL without the action, as this will be appended by Sendcloud middleware
    // this also means no URL alias should be configured for Sendcloud-CheckoutConfiguration
    webshopUrl = webshopUrl.substring(0, webshopUrl.indexOf('Sendcloud-CheckoutConfiguration'));

    var url = [
        'https://panel.sendcloud.sc/shops/sfcc/connect/?url_webshop=',
        encodeURIComponent(webshopUrl),
        '&webhook_url=',
        encodeURIComponent(webhookUrl),
        '&shop_name=',
        encodeURIComponent(shopName)
    ].join('');
    response.redirect(url);
}
exports.Redirect = redirect;
exports.Redirect.public = true;
