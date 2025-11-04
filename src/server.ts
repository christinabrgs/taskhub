import express, { type Response, type Request } from 'express';
import dotenv from 'dotenv';
import workspaceRouter from './controllers/workspaceController';
import taskRouter from './controllers/taskController';
import tagRouter from './controllers/tagController';
import { validateWsId } from './middleware/validateAPIKey';

dotenv.config();

const app = express();
app.use(express.json());
app.use("/workspaces", workspaceRouter)
app.use("/workspaces/:wsId/tasks", validateWsId, taskRouter)
app.use("/workspaces/:wsId/tags", validateWsId, tagRouter)

app.get("/test", (_req: Request, res: Response) => {
  res.send("Test endpoint is working!");
})

export default app

