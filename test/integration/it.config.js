'use strict';

var getConfig = require('@tridnguyen/config');

var opts = Object.assign({}, getConfig({
    baseUrl: 'https://' + global.baseUrl + '/on/demandware.store/Sites-RefArch-Site/nl_NL',
    suite: '*',
    reporter: 'spec',
    timeout: 60000,
    locale: 'nl_NL',
    sendcloudNotificationUsername: 'storefront',
    sendcloudNotificationPassword: '?',
    secretKey: '?'
}, '../../integration-config.json'));

module.exports = opts;
