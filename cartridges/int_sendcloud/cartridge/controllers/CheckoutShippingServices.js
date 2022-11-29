'use strict';
var server = require('server');
server.extend(module.superModule);

var BasketMgr = require('dw/order/BasketMgr');

server.append('SubmitShipping', function (req, res, next) {
    var viewData = res.getViewData();
    if (!viewData.error) {
        var shippingHelpers = require('*/cartridge/scripts/checkout/shippingHelpers');
        var shippingForm = server.forms.getForm('shipping');

        var currentBasket = BasketMgr.getCurrentBasket();
        var success = shippingHelpers.persistSendcloudShipmentData(shippingForm, currentBasket.defaultShipment, req.locale.id);

        if (!success) {
            res.json({
                error: true
            });
            return next();
        }
    }
    return next();
});

module.exports = server.exports();
