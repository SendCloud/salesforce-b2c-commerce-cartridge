'use strict';

/**
 * Processes new Sendcloud notifications
 * @param {dw.util.HashMap} parameters - Job parameters
 * @param { dw.job.JobStepExecution} jobStepExecution - Job step execution
 * @returns {dw.system.Status} Result status of this job step
 */
function processNotifications(parameters, jobStepExecution) {
    var Status = require('dw/system/Status');
    if (parameters.disabled) return new Status(Status.OK, 'DISABLED');

    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Logger = require('dw/system/Logger');
    var Transaction = require('dw/system/Transaction');
    var notificationHelpers = require('*/cartridge/scripts/helpers/sendcloudNotificationHelpers');
    var sendcloudLog = Logger.getLogger('sendcloud', 'sendcloud');
    var isError = false;
    var isWarning = false;
    var updateCheckoutConfiguration = false;

    var queryResult = CustomObjectMgr.queryCustomObjects('SendcloudNotification', 'custom.processStatus = \'NEW\' or custom.processStatus = \'RETRY\'', 'custom.timestamp asc');
    try {
        sendcloudLog.info('Process SendcloudNotification custom objects starts with count {0}', queryResult.count);

        while (queryResult.hasNext()) {
            var customObj = queryResult.next();

            var success;
            var updateNotification;
            try {
                // parse JSON, this JSON is already verified before storing it in custom object
                var notification = JSON.parse(customObj.custom.message);
                // process the notification
                var result = notificationHelpers.processNotification(notification);
                success = result.success;
                updateCheckoutConfiguration = updateCheckoutConfiguration || result.updateCheckoutConfiguration;
                updateNotification = !result.success || result.updateNotification;
            } catch (e) {
                sendcloudLog.error('An error occurred during the processing of Sendcloud notification {0}: {1}\r\n{2}', customObj.custom.ID, e.toString(), e.stack);
                success = false;
                isError = true;
            }

            // update custom object
            if (updateNotification) {
                Transaction.wrap(function () { // eslint-disable-line no-loop-func
                    if (success) {
                        // notification was processed successfully: remove it
                        CustomObjectMgr.remove(customObj);
                    } else if (customObj.custom.processStatus.value === 'NEW') {
                        // notification could not be processed for first time: retry one time
                        customObj.custom.processStatus = 'RETRY';
                        sendcloudLog.warn('Processing of Sendcloud notification {0} failed, it is set to be retried next time', customObj.custom.ID);
                        isWarning = true;
                    } else {
                        // notification could not be processed for second time: do not retry but keep custom object (until retention is reached)
                        customObj.custom.processStatus = 'ERROR';
                        sendcloudLog.warn('Processing of Sendcloud notification {0} failed, it will not be retried', customObj.custom.ID);
                        isError = true;
                    }
                });
            }
        }
        sendcloudLog.info('Process SendcloudNotification custom objects finished');

        // prevent the webhook validation from being disabled too long
        var connectionObj = CustomObjectMgr.getCustomObject('SendcloudConnection', 'CONNECTION');
        if (connectionObj) {
            if (connectionObj.custom.allowNewIntegration.value === 'ENABLED_UNTIL_INTEGRATION_ESTABLISHED') {
                // the validation is disabled, but during the first job run no integrationn details were processed
                // we will wait for one more job run
                Transaction.wrap(function () {
                    connectionObj.custom.allowNewIntegration = 'ENABLED_UNTIL_NEXT_JOB_RUN';
                });
            } else if (connectionObj.custom.allowNewIntegration.value === 'ENABLED_UNTIL_NEXT_JOB_RUN') {
                // the validation is disabled, but during the second job run still no integrationn details were processed
                // the new integration was not accepted in a reasonable time, so we enable the validation again
                sendcloudLog.warn('New connection to Sendcloud was not established within a reasonable time, now validating webhook signatures again');
                Transaction.wrap(function () {
                    connectionObj.custom.allowNewIntegration = 'DISABLED';
                });
            }
        }
    } catch (e) {
        sendcloudLog.error('Error processing SendcloudNotification custom objects: {0}', e);
        isError = true;
    } finally {
        queryResult.close();
    }

    if (updateCheckoutConfiguration) {
        // we need to end job step with special status to trigger updating the checkout configuration in next steps
        // we will remember status of this step in the job execution context to end job with this status
        jobStepExecution.jobExecution.context.put('JobEndStatus', isError ? 'ERROR' : isWarning ? 'WARN' : 'OK'); // eslint-disable-line no-nested-ternary
        return new Status(Status.OK, 'UPDATE_CHECKOUT_CONFIGURATION');
    }
    if (isError) return new Status(Status.ERROR, 'ERROR');
    if (isWarning) return new Status(Status.OK, 'WARN');
    return new Status(Status.OK, 'OK');
}
module.exports.processNotifications = processNotifications;
