import { Router } from "express";
import actionRouter from "./actions/action.routes.js";
import { createWorkflow, deleteWorkflow, getWorkflow, listWorkflows, updateWorkflow } from "./workflow.controller.js";
import { verifyJWTToken } from "../../shared/utils/jwt.token.js";

const router: Router = Router();

router.use(verifyJWTToken);

router
    .route("/")
    .get(listWorkflows)
    .post(createWorkflow)

router
    .route("/:workflowId")
    .get(getWorkflow)
    .patch(updateWorkflow)
    .delete(deleteWorkflow);

router.use("/:workflowId/actions", actionRouter);

export default router;
