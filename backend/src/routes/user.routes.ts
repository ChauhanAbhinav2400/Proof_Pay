import { Router } from "express";

import {
  getUserById,
  getUserByWallet,
  updateUserPermissions,
  updateUserProfile,
  userExists
} from "../controllers/user.controller";
import { authenticate } from "../middleware/authenticate";

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get("/wallets/:walletAddress/exists", userExists);
userRouter.get("/wallets/:walletAddress", getUserByWallet);
userRouter.get("/:userId", getUserById);
userRouter.patch("/:userId", updateUserProfile);
userRouter.patch("/:userId/permissions", updateUserPermissions);
