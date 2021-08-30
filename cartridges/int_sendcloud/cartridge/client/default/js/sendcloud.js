'use strict';

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('./components/sendcloud/sendcloudCheckout'));
    processInclude(require('./components/sendcloud/servicePointPicker'));
});
