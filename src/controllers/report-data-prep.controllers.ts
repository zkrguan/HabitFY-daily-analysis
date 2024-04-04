import { Request, Response } from 'express';
import ReportDataPrepService from '../services/report-data-prep.service';

import { logger } from '../configs/winston.config';

class ReportDataPrepController{
    static async manualPrepData(req: Request, res: Response) {
        try {
          const exampleData = await ReportDataPrepService.prepReportData();
          res.json(exampleData);
        } catch (err) {
          logger.error(err)
          res.status(500).json(err);
        }
    }
}



export default ReportDataPrepController;