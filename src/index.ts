import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response, Application } from 'express';
import prepReportDataRoute from './routes/report-data-prep.route';
import cors from 'cors';
import { wireUpScheduledTask } from './scheduled-task/daily-user-stat';

import { logger } from './configs/winston.config';

const app: Application = express();
const port = process.env.PORT || 8080;

app.use(cors());

app.get('/', (req: Request, res: Response) => {
  res.send('Yes, I am a boring health check!');
});

app.use('/api', prepReportDataRoute);

app.listen(port, () => {
  logger.info(`My lil server is listening on http://localhost:${port}`);
  //logger.info(`Info Test\n`);
  //logger.error(`Error Test\n`);
});

wireUpScheduledTask();


