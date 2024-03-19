import express, { Request, Response, Application } from 'express';
import dotenv from 'dotenv';

//For env File
dotenv.config();

const app: Application = express();
const port = process.env.PORT || 8080;


app.get('/', (req: Request, res: Response) => {
  res.send('Yes, I am a boring health check!');
});

app.listen(port, () => {
  console.log(`My lil server is listening on http://localhost:${port}`);
});
