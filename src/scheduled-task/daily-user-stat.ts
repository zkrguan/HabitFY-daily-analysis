import cron from 'node-cron';
import ReportDataPrepService from '../services/report-data-prep.service';

cron.schedule('1 0 * * *', () => {
  ReportDataPrepService.prepReportData()
    .then((data) => {
      console.log(`daily update was a success!\n`);
      console.log(`${data.successCnt} records were updated.\n`);
      console.log(`${data.errors.length} errors found after updates.\n`);
      data.errors.map((ele) => {
        console.log(`user Id is ${ele.id}\n`);
        console.log(ele.errorMessage +'\n');
      });
    })
    .catch((error) => {
      console.error(`The daily user stat was interrupted.`);
      console.error(error);
    });
});

export const wireUpScheduledTask = () => {
  console.log(`The scheduled task has been wired up.`);
};
