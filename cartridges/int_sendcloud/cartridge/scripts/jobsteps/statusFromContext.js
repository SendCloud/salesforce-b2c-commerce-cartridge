'use strict';

/**
 * Returns the status from the job execution context.
 * @param {dw.util.HashMap} parameters - Job parameters
 * @param { dw.job.JobStepExecution} jobStepExecution - Job step execution
 * @returns {dw.system.Status} Result status of this job step
 */
function statusFromContext(parameters, jobStepExecution) {
    var Status = require('dw/system/Status');
    var statusCode = jobStepExecution.jobExecution.context.get('JobEndStatus');
    if (statusCode === 'ERROR') return new Status(Status.ERROR, 'ERROR');
    return new Status(Status.OK, statusCode);
}
module.exports.statusFromContext = statusFromContext;
