'use strict';

/**
 * Reads the custom object with the checkout configuration and creates a map whose keys are the shipping method IDs
 * and values the informtion about the delivery methods and zone it belongs to.
 * @param {dw.object.CustomObject} notificationObj - The custom object with the checkout configuration
 * @returns {Object} A map with the delivery methods supplied by Sendcloud
 */
function createCheckoutDeliveryMethodMap(notificationObj) {
    // parse JSON, this JSON is already verified before storing it in custom object
    var notificationMessage = JSON.parse(notificationObj.custom.message);
    var checkoutConfiguration = notificationMessage && notificationMessage.payload && notificationMessage.payload.checkout_configuration;
    var deliveryMethodMap = {};

    // if checkout configuration is to be deleted then this should be skipped
    if (checkoutConfiguration) {
        var Site = require('dw/system/Site');
        var allowedCurrencies = Site.current.getAllowedCurrencies();
        // loop though delivery zones
        for (var i = 0; i < checkoutConfiguration.delivery_zones.length; i++) {
            var deliveryZone = checkoutConfiguration.delivery_zones[i];
            var location = deliveryZone.location;
            var deliveryMethods = deliveryZone.delivery_methods;

            // loop through delivery methods for this zone
            for (var j = 0; j < deliveryMethods.length; j++) {
                var deliveryMethod = deliveryMethods[j];

                // write this shipping method for each currency
                var allowedCurrenciesIterator = allowedCurrencies.iterator();
                while (allowedCurrenciesIterator.hasNext()) {
                    var currencyCode = allowedCurrenciesIterator.next();
                    var shippingMethodID = deliveryMethod.id + '__' + currencyCode;
                    deliveryMethodMap[shippingMethodID] = {
                        deliveryMethod: deliveryMethod,
                        location: location,
                        currencyCode: currencyCode
                    };
                }
            }
        }
    }

    return deliveryMethodMap;
}

/**
 * Writes the starting element of a shipping XML file.
 * @param {dw.io.XMLStreamWriter} xmlWriter - The XML writer
 */
function writeShippingXmlHeader(xmlWriter) {
    xmlWriter.writeStartDocument('UTF-8', '1.0');
    xmlWriter.writeStartElement('shipping');
    xmlWriter.writeAttribute('xmlns', 'http://www.demandware.com/xml/impex/shipping/2007-03-31');
}

/**
 * Writes the closing element of a shipping XML file.
 * @param {dw.io.XMLStreamWriter} xmlWriter - The XML writer
 * @param {dw.io.FileWriter} fileWriter - The file  writer
 */
function writeShippingXmlFooter(xmlWriter, fileWriter) {
    xmlWriter.writeEndElement();
    xmlWriter.writeEndDocument();
    xmlWriter.flush();
    fileWriter.flush();
}

/**
 * Parses a shipping XML file and generates a new XML file with only the Sendcloud shipping methods.
 * @param {dw.util.HashMap} parameters - Job parameters
 * @returns {dw.system.Status} Result status of this job step
 */
function processShippingXml(parameters) {
    var Status = require('dw/system/Status');
    if (parameters.disabled) return new Status(Status.OK, 'DISABLED');

    var File = require('dw/io/File');
    var FileReader = require('dw/io/FileReader');
    var FileWriter = require('dw/io/FileWriter');
    var Logger = require('dw/system/Logger');
    var XMLStreamConstants = require('dw/io/XMLStreamConstants');
    var XMLStreamReader = require('dw/io/XMLStreamReader');
    var XMLStreamWriter = require('dw/io/XMLIndentingStreamWriter');
    var sendcloudLog = Logger.getLogger('sendcloud', 'sendcloud');

    // parse checkout configuration
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var notificationObj = CustomObjectMgr.getCustomObject('SendcloudNotification', 'CHECKOUT_CONFIGURATION');
    var deliveryMethodMap = createCheckoutDeliveryMethodMap(notificationObj);
    var e4xHelpers = require('*/cartridge/scripts/helpers/sendcloudE4XHelpers');

    // references to files
    var exportFolderAbsPath = [File.IMPEX, 'src', parameters.exportFolderPath].join(File.SEPARATOR);
    var exportFolder = new File(exportFolderAbsPath);
    if (!exportFolder.exists()) exportFolder.mkdirs();
    var existingShippingFile = new File(exportFolder, parameters.existingShippingFileName);
    var newShippingFile = new File(exportFolder, parameters.newShippingFileName);
    var deleteShippingFile = new File(exportFolder, parameters.deleteShippingFileName);
    if (!existingShippingFile.exists()) {
        sendcloudLog.error('Cannot continue: no file with existing shipping methods found at {0}', existingShippingFile.fullPath);
        return new Status(Status.ERROR, 'ERROR');
    }

    sendcloudLog.info('Reading file {0} and writing files {1} and {2}', existingShippingFile.fullPath, newShippingFile.fullPath, deleteShippingFile.fullPath);

    // open files for reading and writing
    var fileReader = new FileReader(existingShippingFile);
    var xmlReader = new XMLStreamReader(fileReader);
    var newFileWriter;
    var newXmlWriter;
    var deleteFileWriter;
    var deleteXmlWriter;

    try {
        // of all existing shipping methods find the ones that are created based on an earlier Checkout Configuration
        // and wihch are not present in the new Checkout Configuration: these should be removed
        while (xmlReader.hasNext()) {
            var parseEvent = xmlReader.next();
            if (parseEvent === XMLStreamConstants.START_ELEMENT) {
                if (xmlReader.localName === 'shipping-method') {
                    var shippingMethodID = xmlReader.getAttributeValue(null, 'method-id');
                    var existingShippingMethodXml = xmlReader.readXMLObject();

                    var isSendcloudCheckoutMethod = e4xHelpers.isSendcloudCheckoutShippingMethod(existingShippingMethodXml);
                    if (isSendcloudCheckoutMethod) {
                        var isPresentInNewConfiguration = shippingMethodID in deliveryMethodMap;
                        if (isPresentInNewConfiguration) {
                            // a checkout shipping method that is already present in SFCC but also in new configuration: should be updated
                            var existingDeliveryMethodInfo = deliveryMethodMap[shippingMethodID];
                            var updatedShippingMethodXml = e4xHelpers.copyDataToShippingMethodXml(shippingMethodID, existingDeliveryMethodInfo, existingShippingMethodXml);
                            if (!newXmlWriter) {
                                newFileWriter = new FileWriter(newShippingFile);
                                newXmlWriter = new XMLStreamWriter(newFileWriter);
                                writeShippingXmlHeader(newXmlWriter);
                                newXmlWriter.writeComment('shipping methods to be updated');
                            }
                            newXmlWriter.writeRaw(updatedShippingMethodXml.toXMLString());
                            // remove this shipping method from the map so we know later which shipping methods are new
                            delete deliveryMethodMap[shippingMethodID];
                        } else {
                            if (!deleteXmlWriter) {
                                // create new file
                                deleteFileWriter = new FileWriter(deleteShippingFile);
                                deleteXmlWriter = new XMLStreamWriter(deleteFileWriter);
                                writeShippingXmlHeader(deleteXmlWriter);
                                deleteXmlWriter.writeComment('shipping methods to be deleted');
                            }
                            // a checkout shipping method that is currently present in SFCC but not in the new checkout configuration: should be deleted
                            deleteXmlWriter.writeRaw(existingShippingMethodXml.toXMLString());
                        }
                    }
                }
            }
        }

        // any value remaining in deliveryMethodMap is a new shipping method, also write these to XML
        var newShippingMethodIDs = Object.keys(deliveryMethodMap);
        if (newShippingMethodIDs.length) {
            if (!newXmlWriter) {
                newFileWriter = new FileWriter(newShippingFile);
                newXmlWriter = new XMLStreamWriter(newFileWriter);
                writeShippingXmlHeader(newXmlWriter);
            }
            newXmlWriter.writeComment('shipping methods to be inserted');
            newShippingMethodIDs.forEach(function (newShippingMethodID) {
                var newDeliveryMethodInfo = deliveryMethodMap[newShippingMethodID];
                var newShippingMethodXml = e4xHelpers.copyDataToShippingMethodXml(newShippingMethodID, newDeliveryMethodInfo, null);
                newXmlWriter.writeRaw(newShippingMethodXml.toXMLString());
            });
        }

        // end shipping XML
        if (newXmlWriter) {
            writeShippingXmlFooter(newXmlWriter, newFileWriter);
        } else if (deleteShippingFile.exists()) {
            // no shipping methods to import, make sure this file is deleted if it remained from a previous job run
            newShippingFile.remove();
        }
        if (deleteXmlWriter) {
            writeShippingXmlFooter(deleteXmlWriter, deleteFileWriter);
        } else if (deleteShippingFile.exists()) {
            // no shipping methods to delete, make sure this file is deleted if it remained from a previous job run
            deleteShippingFile.remove();
        }

        // remove custom object
        var Transaction = require('dw/system/Transaction');
        Transaction.wrap(function () {
            CustomObjectMgr.remove(notificationObj);
        });
    } finally {
        xmlReader.close();
        fileReader.close();
        if (newXmlWriter) {
            newXmlWriter.close();
        }
        if (newFileWriter) {
            newFileWriter.close();
        }
        if (deleteXmlWriter) {
            deleteXmlWriter.close();
        }
        if (deleteFileWriter) {
            deleteFileWriter.close();
        }
    }

    return new Status(Status.OK, 'OK');
}
module.exports.processShippingXml = processShippingXml;
