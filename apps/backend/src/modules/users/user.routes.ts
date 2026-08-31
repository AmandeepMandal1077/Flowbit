import { Router } from "express";
import { createUser, deleteUser, getProfile, signInUser, updateUser } from "./user.controller.js";
import { validate } from "../../shared/middlewares/validation.middleware.js";
import { verifyJWTToken } from "../../shared/utils/jwt.token.js";
import { createUserSchema, signInUserSchema, updateUserSchema } from "./user.validations.js";

const router: Router = Router();

router
    .route("/")
    .get(verifyJWTToken, getProfile)
    .patch(verifyJWTToken, validate(updateUserSchema), updateUser)
    .delete(verifyJWTToken, deleteUser);

router.post("/signin", validate(signInUserSchema), signInUser);
router.post("/signup", validate(createUserSchema), createUser);

export default router;