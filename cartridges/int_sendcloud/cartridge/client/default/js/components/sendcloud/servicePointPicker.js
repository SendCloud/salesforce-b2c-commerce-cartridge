var apiKey = $('.sendcloud-api-key').get(0).value;

    /**
     * Opens the point picker with the selected specification
     * @param {string} country - required; ISO-2 code of the country you want to display the map (i.e.: NL, BE, DE, FR)
     * @param {?string} language  - not required. Defaults to "en-us"
     * @param {?string} postalCode  - not required but recommended
     * @param {?string} carriers - comma-separated list of carriers you can filter service points
     * @param {?string|?number} servicePointId - set a preselected service point to be shown upon displaying the map
     * @param {?string} postNumber - set a pre-defined post number to fill its corresponding field upon displaying the map
     */
function openServicePointPicker(country, language, postalCode, carriers, servicePointId, postNumber) {
    var config = {
        apiKey: apiKey,
        country: country,
        postalCode: postalCode,
        language: language,
        carriers: carriers,
        servicePointId: servicePointId,
        postNumber: postNumber
    };

    sendcloud.servicePoints.open( // eslint-disable-line
        /* first arg: config object */
        config,
        /**
         * Second argument handles the selection of a service point. It receives two arguments
         *
         * @param {Object} servicePointObject Contains main data returned by the point picker
         * @param {string} postNumberValue Used as `to_post_number` field in the Parcel creation API
         */
        function (servicePointObject, postNumberValue) {
            $('.sendcloud-postal-code').get(0).value = servicePointObject.postal_code;
            $('.sendcloud-service-point-id').get(0).value = servicePointObject.id;
            $('.sendcloud-service-point-data').get(0).value = JSON.stringify(servicePointObject);
            $('.point-address-name').text(servicePointObject.name);
            $('.point-address-street').text(servicePointObject.street + ' ' + servicePointObject.house_number);
            $('.point-address-post-number').text(servicePointObject.postal_code + ' ' + servicePointObject.city);
            $('.point-address-phone').text(servicePointObject.phone);
            $('.point-address-container').removeClass('d-none').addClass('d-block');
            $('.sendcloud-service-point-post-number').get(0).value = postNumberValue;
        },
        /**
         * third arg: failure callback function
         * this is also called with ["Closed"] when the SPP window is closed.
         */
        function () {}
    );
}

/**
 * Returns an array of supported carriers based on the shipping method
 * @returns {Array} array of carriers
 */
function getCarrierList() {
    var carriers = JSON.parse(
        $('input[name=dwfrm_shipping_shippingAddress_shippingMethodID]:checked')
        .parent().find('.sendcloud-pointpicker-carriers')
        .get(0).value
    );
    return carriers;
}

/**
 * Listener for the button that opens the point picker
 */
function handlePointPickerBtnClick() {
    $('.point-picker-btn').on('click', function () {
        var shippingCountryValue = $('#shippingCountrydefault option:selected').get(0).value;
        var postalCode = $('#shippingZipCodedefault').get(0).value;
        var language = $('.sendcloud-picker-language').get(0).value;
        var country = shippingCountryValue ? shippingCountryValue.toLowerCase() : $('.sendcloud-picker-country').get(0).value;
        var servicePointId = $('.sendcloud-service-point-id').get(0).value;
        var postNumber = $('.sendcloud-service-point-post-number').get(0).value;

        openServicePointPicker(country, language, postalCode, getCarrierList(), servicePointId, postNumber);
    });
}

/**
 * LIstener for the change on the shipping country address select
 * Point picker will open with the focus on the selected shipping country
 */
function handleShippingCountryChange() {
    $('#shippingCountrydefault').on('change', function () {
        var selectedValue = this.value.toLowerCase();
        var sevicePointCountryValue = $('.sendcloud-picker-country').get(0).value;
        // Point picker supports only deliveries within single selected country, cross-country not supported
        if (selectedValue !== sevicePointCountryValue) {
            $('.sendcloud-postal-code').get(0).value = '';
            $('.sendcloud-service-point-id').get(0).value = '';
            $('.sendcloud-service-point-data').get(0).value = '';
            $('.point-address-name').text('');
            $('.point-address-street').text('');
            $('.point-address-post-number').text('');
            $('.point-address-phone').text('');
            $('.point-address-container').removeClass('d-block').addClass('d-none');

            $('.sendcloud-picker-country').get(0).value = selectedValue;
        }
        var postNumberFormGroup = $('.dwfrm_shipping_shippingAddress_sendcloudPointPicker_sendcloudPostNumber');
        if (selectedValue === 'de') {
            $(postNumberFormGroup).removeClass('d-none').addClass('d-block');
        } else {
            $(postNumberFormGroup).removeClass('d-block').addClass('d-none');
        }
    });
}

/**
 * Creates a address object based on selected pick up point data
 * @returns {Object} addressObject - selected pick up point address data
 */
function createPointAddressObject() {
    var addressObject = {
        address1: $('.point-address-street').get(0).innerHTML,
        postalCode: $('.point-address-post-number').get(0).innerHTML,
        firstName: $('.point-address-name-label').get(0).innerHTML + ' ' + $('.point-address-name').get(0).innerHTML,
        lastName: '', // otherwise we get a duplicate firstName
        city: '', // it's already in the postalCode value
        phone: $('#shippingPhoneNumberdefault').get(0).value
    };
    return addressObject;
}

module.exports = {
    handlePointPickerBtnClick: handlePointPickerBtnClick,
    getCarrierList: getCarrierList,
    handleShippingCountryChange: handleShippingCountryChange,
    createPointAddressObject: createPointAddressObject
};
