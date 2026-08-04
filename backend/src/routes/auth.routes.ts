import { Router } from "express";

import { nonceController, verifyController } from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/nonce", nonceController);
authRouter.post("/verify", verifyController);
