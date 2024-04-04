import cron from 'node-cron';
import ReportDataPrepService from '../services/report-data-prep.service';

import { logger } from '../configs/winston.config'

cron.schedule('1 0 * * *', () => {
  ReportDataPrepService.prepReportData()
    .then((data) => {
      logger.info(`daily update was a success!\n`);
      logger.info(`${data.successCnt} records were updated.\n`);
      logger.info(`${data.errors.length} errors found after updates.\n`);
      data.errors.map((ele) => {
        logger.info(`user Id is ${ele.id}\n`);
        logger.info(ele.errorMessage +'\n');
      });
    })
    .catch((error) => {
      logger.error(`The daily user stat was interrupted.`);
      logger.error(error);
    });
});

export const wireUpScheduledTask = () => {
  logger.info(`The scheduled task has been wired up.`);
};
