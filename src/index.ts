import app from "./server";
import dotenv from "dotenv";
import { connectToDB } from "./db/connection";

dotenv.config()

async function startServer() {

  await connectToDB()

  let port = process.env.PORT || 5000

  app.listen(port, () => console.log(`Server is running on port ${process.env.PORT}`))
}

startServer()
