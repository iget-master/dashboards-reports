/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import { ILegacyClusterClient, Logger } from '../../../../src/core/server';
import { createScheduledReport } from './createScheduledReport';
import { POLL_INTERVAL } from '../utils/constants';
import { parseOpenSearchErrorResponse } from '../routes/utils/helpers';
import { backendToUiReport } from '../routes/utils/converters/backendToUi';
import { BackendReportInstanceType } from 'server/model/backendModel';

async function pollAndExecuteJob(
  opensearchReportsClient: ILegacyClusterClient,
  notificationClient: ILegacyClusterClient,
  opensearchClient: ILegacyClusterClient,
  logger: Logger
) {
  logger.info(
    `start polling at time: ${new Date().toISOString()} with fixed interval: ${POLL_INTERVAL} milliseconds`
  );
  try {
    // poll job
    const opensearchResp = await opensearchReportsClient.callAsInternalUser(
      'opensearch_reports.pollReportInstance'
    );
    const job: BackendReportInstanceType = opensearchResp.reportInstance;

    // job retrieved, otherwise will be undefined because 204 No-content is returned
    if (job) {
      const reportMetadata = backendToUiReport(job);
      const reportId = job.id;
      logger.info(
        `scheduled job sent from scheduler with report id: ${reportId}`
      );

      await createScheduledReport(
        reportId,
        reportMetadata,
        opensearchClient,
        opensearchReportsClient,
        notificationClient,
        logger
      );
    } else {
      // 204 no content is returned, 204 doesn't have response body
      logger.info(`No scheduled job to execute ${JSON.stringify(opensearchResp)}`);
    }
  } catch (error) {
    logger.error(
      `Failed to poll job ${error.statusCode} ${parseOpenSearchErrorResponse(error)}`
    );
  }
}

export { pollAndExecuteJob };
