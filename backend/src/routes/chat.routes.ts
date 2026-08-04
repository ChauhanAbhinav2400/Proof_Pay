import { Router } from "express";

import { getMessages, sendMessage } from "../controllers/chat.controller";
import { authenticate } from "../middleware/authenticate";

export const chatRouter = Router();

chatRouter.use(authenticate);

chatRouter.get("/proposals/:proposalId/messages", getMessages);
chatRouter.post("/proposals/:proposalId/messages", sendMessage);
chatRouter.get("/escrows/:blockchainEscrowId/messages", getMessages);
chatRouter.post("/escrows/:blockchainEscrowId/messages", sendMessage);
