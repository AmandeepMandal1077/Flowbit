import express, { type Express } from "express"
import "dotenv/config"
import cookieParser from "cookie-parser";

const app: Express = express();

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Routers
import healthRouter from "./modules/health/health.route.js"
import userRouter from "./modules/users/user.routes.js"
import workflowRouter from "./modules/workflows/workflow.routes.js"
import { errorHandler } from "./shared/middlewares/error.middleware.js";

app.use("/api/v1/health", healthRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/workflows", workflowRouter)

app.use(errorHandler)

export default app;