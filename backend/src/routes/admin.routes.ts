import { Router } from "express";

import { getSummary } from "../controllers/admin.controller";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";

export const adminRouter = Router();

adminRouter.get("/summary", authenticate, authorize("ADMIN"), getSummary);
