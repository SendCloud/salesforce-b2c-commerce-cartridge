# link_sendcloud

## Summary

Sendcloud is a shipping service provider that links multiple logistics service providers to web stores, WMS and ERP systems. The service is primarily used by online retailers to automate the shipping process.

The Sendcloud LINK cartridge contains all modifications needed to integrate Salesforce B2C Commerce with Sendcloud.

A Sendcloud account is needed when using the cartridge. Clients may use this LINK cartridge to ensure a quick and hassle-free time-to-market, but there is no requirement for clients to use this cartridge: they can also choose not to use this cartridge at all, or only use parts of it.

## Documentation

Please see the cartridge documentation (in the documentation sub folder) for functionality and installation instructions.

## Testing

### Running unit tests

You can run `npm test` to execute all unit tests in the project.

### Running integration tests

Integration tests are located in the `storefront-reference-architecture/test/integration` directory.
Before running integration tests the `dw.json` fand `integration-config.json` files should be placed in the root of this project. The `integration-config.json` should contain these properties:

* `sendcloudNotificationUsername`: value should match that of the site preference of the same name.
* `sendcloudNotificationPassword`: value should match that of the site preference of the same name.
* `secretKey`: value should match that of the `secretKey` attribute of the `SendcloudConnection` custom object instance. If needed you can modify the attribute definition for this value to be visible, or you can update the connection in the Sendcloud Panel and read the secret key from the `SendcloudNotification` custom object then will then be created.

You can run `npm test:integration` to execute all unit tests in the project.
