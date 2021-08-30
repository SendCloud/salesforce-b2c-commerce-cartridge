'use strict';

var server = require('server');
server.extend(module.superModule);

var Site = require('dw/system/Site');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');

server.append('Begin', function (req, res, next) {
    // determine locale
    var shippingHelpers = require('*/cartridge/scripts/checkout/shippingHelpers');
    var pointPickerLocale = shippingHelpers.determineSendcloudServicePointLocale(req.locale.id);

    // determine API key
    var sendcloudApiKey = null;
    var connectionObj = CustomObjectMgr.getCustomObject('SendcloudConnection', 'CONNECTION');
    if (connectionObj) {
        sendcloudApiKey = connectionObj.custom.publicKey;
    }

    // determine country
    var pointPickerCountry;
    var shippingForm = server.forms.getForm('shipping');
    var selectedCountry = shippingForm.shippingAddress.addressFields.country.selectedOption;
    if (selectedCountry) {
        pointPickerCountry = selectedCountry.toLowerCase();
    } else {
        pointPickerCountry = (Site.current.getCustomPreferenceValue('sendcloudPointPickerDefaultCountry') || 'nl').toLowerCase();
    }

    res.setViewData({
        pointPickerLocale: pointPickerLocale,
        pointPickerCountry: pointPickerCountry,
        sendcloudApiKey: sendcloudApiKey
    });
    next();
});

module.exports = server.exports();
