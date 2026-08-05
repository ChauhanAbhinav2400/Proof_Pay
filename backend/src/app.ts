import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFound";
import { authRouter } from "./routes/auth.routes";
import {
  adminRouter,
  chatRouter,
  escrowRouter,
  projectRouter,
  proposalRouter,
  storageRouter,
  userRouter,
} from "./routes";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "35mb" }));
app.use(morgan("combined"));

app.use("/auth", authRouter);
app.use("/projects", projectRouter);
app.use("/proposals", proposalRouter);
app.use("/chat", chatRouter);
app.use("/escrow", escrowRouter);
app.use("/users", userRouter);
app.use("/storage", storageRouter);
app.use("/admin", adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);
