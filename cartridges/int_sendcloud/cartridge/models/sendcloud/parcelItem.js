'use strict';

/**
 * The parcel item model as expected by Sendcloud.
 * @param {dw.order.ProductLineItem} productLineItem - The product line item
 * @param {dw.value.Money} price - The gross price of this line item
 * @constructor
 */
function ParcelItemModel(productLineItem, price) {
    var product = productLineItem.product;

    // create map of variation attribute values
    var properties = {};
    if (product) {
        var variationModel = product.variationModel;
        var variationAttributes = variationModel.productVariationAttributes.iterator();
        while (variationAttributes.hasNext()) {
            var variationAttribute = variationAttributes.next();
            var variationValue = variationModel.getSelectedValue(variationAttribute);
            if (variationValue) {
                properties[variationAttribute.displayName] = variationValue.displayValue;
            }
        }
    }

    this.description = productLineItem.lineItemText;
    this.hs_code = (product && product.custom.hsCode) || '';
    this.origin_country = (product && product.custom.countryOfOrigin) || '';
    this.product_id = product && product.variant && product.masterProduct ? product.masterProduct.ID : productLineItem.productID;
    this.properties = properties;
    this.quantity = productLineItem.quantityValue;
    this.sku = productLineItem.productID;
    this.value = price.divide(productLineItem.quantityValue).value.toFixed(2);
    if (product && product.custom.weight) this.weight = product.custom.weight.toFixed(3);
}
module.exports = ParcelItemModel;
