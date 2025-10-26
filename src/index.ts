import express, {NextFunction, Request, Response} from 'express';
import dotenv from 'dotenv';
import { Pool } from "pg";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432")
});

const connectToDB = async () => {
  try {
    await pool.connect();
  } catch (err) {
    console.log(err);
  }
};
connectToDB();


const app = express();

app.get("/test", (req: Request, res: Response, next: NextFunction) => { 
res.send("Test endpoint is working!");
})

app.listen(process.env.PORT, () => { 
  console.log(`Server is running on port ${process.env.PORT}`);
})


