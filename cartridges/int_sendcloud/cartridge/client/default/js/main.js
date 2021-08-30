window.jQuery = window.$ = require('jquery');
require('@babel/polyfill');
require('base/main');

var processInclude = require('base/util');

$(document).ready(function () {
    // custom scripts
    processInclude(require('./checkout/shipping'));
});
