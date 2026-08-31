import { Router } from "express";
import { createAction, listActions } from "./action.controller.js";

const router: Router = Router({ mergeParams: true });

router
    .route("/")
    .get(listActions)
    .post(createAction);

export default router;