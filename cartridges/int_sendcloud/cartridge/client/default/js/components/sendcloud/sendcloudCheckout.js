var mountElement = document.querySelector('.render-container');
var payloadElement = document.querySelector('.payload-field');

/**
 * Renders the sendcloud checkout based on the the passed object
 * @param {Object} deliveryMethodData rendering configuration object
 * @param {Object} deliveryMethodLocaleData configuraiton locale object
 */
function renderShippingOption(deliveryMethodData, deliveryMethodLocaleData) {
    if (deliveryMethodData) {
        var locale = deliveryMethodLocaleData.locale;
        var localeMessages = deliveryMethodLocaleData.localeMessages;
        var deliveryMethod = deliveryMethodData;
        try {
            window.renderScShippingOption({ mountElement, deliveryMethod, locale, localeMessages });
        } catch (error) {} // eslint-disable-line
    }
}

$(document).ready(function () {
    if (mountElement) {
        mountElement.addEventListener('scShippingOptionChange', function (e) {
            payloadElement.value = JSON.stringify(e.detail);
        }, false);
    }

    var selectedShippingOption = $('.nominated-day-delivery').parent().children('.form-check-input:checked');
    if (selectedShippingOption.length) {
        var deliveryMethodDataJSON = $(selectedShippingOption).parent().children('.sendcloud-checkout-shipmethod-data').get(0).value;
        var deliveryMethodLocaleDataJSON = $(selectedShippingOption).parent().children('.sendcloud-checkout-shipmethod-localedata').get(0).value;
        var deliveryMethodData = JSON.parse(deliveryMethodDataJSON);
        var deliveryMethodLocaleData = JSON.parse(deliveryMethodLocaleDataJSON);
        renderShippingOption(deliveryMethodData, deliveryMethodLocaleData);
    }
});

module.exports = {
    renderShippingOption: renderShippingOption
};
