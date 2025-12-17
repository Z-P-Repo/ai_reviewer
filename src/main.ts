// require("express-async-errors");
import "./lib/config";
import express from "express";
import morgan from "morgan";
import StatusCodes from "http-status-codes";
import mongoose from "mongoose";

import { ReviewController } from "./review/review.controller";
import { AzureRepoService } from "./repo/azureRepo";
import { ReviewService, ReviewServiceOptions } from "./review/review.service";
import { env } from "./lib/config";
import { ModelNames } from "./lib/db";
import { errorMiddleware } from "./lib/error.middleware";

import { prCommentSchema } from "./prComments/prComment.model";
import { prSchema } from "./pullRequest/pullRequest.model";

async function main() {
  const azureService = new AzureRepoService();
  const opts: ReviewServiceOptions = {
    llmProviderType: "ollama",
    llmBaseURL: env.LLM_BASE_URL,
    llmApiKey: env.LLM_API_KEY,
  };
  const service = new ReviewService(opts);
  const reviewController = new ReviewController(azureService, service);
  await reviewController.init();

  const app = express();

  const port = env.ZPR_PORT;

  app.use(express.json());
  app.use(morgan("dev"));

  app.post(
    "/review",
    async (req, res, next) =>
      await reviewController.doReviewControllerV2(req, res, next)
  );
  app.post(
    "/re-review",
    async (req, res, next) =>
      await reviewController.doReReviewController(req, res, next)
  );

  app.use(errorMiddleware);

  // Not found route
  app.use((_req, res, _next) => {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Requested route does not exist" });
  });

  app.listen(port, "0.0.0.0", () => {
    console.log(`server can be accessed at port: ${port}`);
  });
}

const uri = env.DB_URI;

mongoose
  .connect(uri)
  .then(() => {
    console.log("connected to mongodb");
    // register all models
    mongoose.model(ModelNames.Comment, prCommentSchema);
    mongoose.model(ModelNames.PullRequest, prSchema);

    // start server
    main().catch((err) => {
      console.error("failed to start the application");
      console.error(err);
    });
  })
  .catch((err) => {
    console.error("failed to connect to mongodb");
    console.error(err);
  });
