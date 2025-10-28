import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import { connectToDB } from "./db/connection"
import workspaceRouter from './controllers/workspaceController';
import taskRouter from './controllers/taskController';
import tagRouter from './controllers/tagController';

dotenv.config();


connectToDB();

const app = express();
app.use(express.json());
app.use("/workspaces", workspaceRouter)
app.use("/workspaces/:wsId/tasks", taskRouter)
app.use("/workspaces/:wsId/tags", tagRouter)

app.get("/test", (req: Request, res: Response) => {
  res.send("Test endpoint is working!");
})

let port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
})


