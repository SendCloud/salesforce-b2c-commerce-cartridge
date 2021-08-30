'use strict';

module.exports = function (shipmentModel, order, shipment) {
    var Money = require('dw/value/Money');
    var TaxMgr = require('dw/order/TaxMgr');

    var isNetTaxation = TaxMgr.getTaxationPolicy() === TaxMgr.TAX_POLICY_NET;
    var parcelItems = [];
    var totalWeight = 0;
    var ParcelItemModel = require('*/cartridge/models/sendcloud/parcelItem');
    var lineItemNr = 0;
    var subTotalPrice = new Money(0, order.currencyCode);
    var productLineItemCount = shipment.productLineItems.length;
    var productLineItems = shipment.productLineItems.iterator();

    while (productLineItems.hasNext()) {
        var productLineItem = productLineItems.next();
        lineItemNr++;

        // determine line item price
        var lineItemPrice;
        if (lineItemNr === productLineItemCount) {
            // last line item: use the remaining amount so the total is correct (no rouding differences)
            lineItemPrice = shipment.adjustedMerchandizeTotalGrossPrice.subtract(subTotalPrice);
        } else {
            // we need the gross price of the line item after applying all product-level and order-level promotions, so we use prorated price
            lineItemPrice = productLineItem.proratedPrice;
            if (isNetTaxation) {
                // net taxation is used: convert this net price to a gross price
                lineItemPrice = lineItemPrice.multiply(productLineItem.grossPrice.value / productLineItem.netPrice.value);
            }
            subTotalPrice = subTotalPrice.add(lineItemPrice);
        }

        if (productLineItem.bundledProductLineItems.empty) {
            // not a bundle: add this product
            parcelItems.push(new ParcelItemModel(productLineItem, lineItemPrice));
            if (productLineItem.product && productLineItem.product.custom.weight) {
                totalWeight += (productLineItem.product.custom.weight * productLineItem.quantityValue);
            }
        } else {
            // a bundle: add the bundled items
            // since the bundled items do not have a price we divide the bundle price over the items
            var bundleItemNr = 0;
            var bundledItemsCount = productLineItem.bundledProductLineItems.length;
            var bundleSubTotalPrice = new Money(0, order.currencyCode);

            // count total quantity
            var totalBundleQuantity = 0;
            var bundledProductLineItems = productLineItem.bundledProductLineItems.iterator();
            var bundledProductLineItem;
            while (bundledProductLineItems.hasNext()) {
                bundledProductLineItem = bundledProductLineItems.next();
                totalBundleQuantity += bundledProductLineItem.quantityValue;
            }

            bundledProductLineItems = productLineItem.bundledProductLineItems.iterator();
            while (bundledProductLineItems.hasNext()) {
                bundledProductLineItem = bundledProductLineItems.next();
                bundleItemNr++;

                // determine partial price for this bundle item
                var bundleItemPrice;
                if (bundleItemNr === bundledItemsCount) {
                    // last item in the bundle: use remaining price so any rouding differences will be accounted for
                    bundleItemPrice = lineItemPrice.subtract(bundleSubTotalPrice);
                } else {
                    // determine partial price based ono total bundle price and the quantities
                    bundleItemPrice = lineItemPrice.multiply(bundledProductLineItem.quantityValue / totalBundleQuantity);
                    bundleSubTotalPrice = bundleSubTotalPrice.add(bundleItemPrice);
                }

                parcelItems.push(new ParcelItemModel(bundledProductLineItem, bundleItemPrice));
                if (bundledProductLineItem.product && bundledProductLineItem.product.custom.weight) {
                    totalWeight += (bundledProductLineItem.product.custom.weight * bundledProductLineItem.quantityValue);
                }
            }
        }
    }

    if (totalWeight) {
        Object.defineProperty(shipmentModel, 'weight', {
            configurable: true,
            enumerable: true,
            value: totalWeight.toFixed(3)
        });
    }
    Object.defineProperty(shipmentModel, 'parcel_items', {
        configurable: true,
        enumerable: true,
        value: parcelItems
    });
};
