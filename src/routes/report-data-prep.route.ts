import express from 'express'
import ReportDataPrepController from '../controllers/report-data-prep.controllers';

const prepReportDataRoute = express.Router();
prepReportDataRoute.get('/V1/manual-prep',ReportDataPrepController.manualPrepData)

export default prepReportDataRoute ;