import z from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import fs from "fs";

import { LLMProvider } from "../llm/llm.interface";
import { LLMMessage } from "../llm/llm.types";
import { OllamaLLMProvider } from "../llm/ollama";
import { OpenAILLMProvider } from "../llm/openai";
import { ReviewPrompt } from "./review.prompt";
import { RepoService } from "../repo/repo.interface";
import { LocalRepoService } from "../repo/localRepo";
import { responseSchema } from "./review.validation";
import { env } from "../lib/config";
import { AzureRepoService } from "../repo/azureRepo";

type LLMProviderType = "openai" | "ollama";
type RepoServiceType = "local";

const responseJsonSchema = zodToJsonSchema(responseSchema);

export interface GetReviewOptions {
  baseBranch: string;
  targetBranch: string;
  modelName: string;
  // llmProvider: LLMProvider
}

export interface GetReviewOptionsV2 {
  modelName: string;
  repoId: string;
  repoOverview: string;
}

import { EventEmitter } from "events";

export interface ReviewServiceOptions {
  llmBaseURL: string;
  llmApiKey: string;
  llmProviderType: LLMProviderType;
}

export class ReviewService {
  private _llmService: LLMProvider;
  // private _repoService: RepoService;

  constructor(opts: ReviewServiceOptions) {
    const { llmProviderType, llmBaseURL: baseURL, llmApiKey: apiKey } = opts;
    if (llmProviderType === "openai") {
      this._llmService = new OpenAILLMProvider(baseURL, apiKey);
    } else if (llmProviderType === "ollama") {
      this._llmService = new OllamaLLMProvider(baseURL, apiKey);
    } else {
      throw new Error("invalid llm provider type");
    }

    // const { repoServiceType, localRepoDir } = opts;
    // if (repoServiceType == "local") {
    // this._repoService = new LocalRepoService(localRepoDir);
    // } else {
    // throw new Error("invalid repo service type");
    // }
  }

  public async getReview(
    repoOverview: string,
    opts: GetReviewOptions,
    repoService: LocalRepoService
  ) {
    const { baseBranch, targetBranch } = opts;
    const fileChanges = await repoService.getChangedFiles(
      baseBranch,
      targetBranch
    );

    const result: z.infer<typeof responseSchema>[] = [];

    for (const file of fileChanges) {
      const patch = await repoService.diffFile(baseBranch, targetBranch, file);
      // const fileContent = fs.readFileSync(`${repoService.projectDir}/${file}`)
      const userInstruction = `
The Pull Request changes for this file are shown in the diff below. Review ONLY the lines that were changed (marked with + or -):
\`\`\`diff
${patch}
\`\`\`
`;

      const systemPrompt = ReviewPrompt.reviewSystemInstruction(repoOverview);

      const messages: LLMMessage[] = [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userInstruction,
        },
      ];
      // console.log(messages);
      // const response = await this._llmService.sendChat(opts.modelName, messages);
      const response = await this._llmService.sendChatWithJsonSchema(
        opts.modelName,
        messages,
        responseJsonSchema
      );
      const content: z.infer<typeof responseSchema> = JSON.parse(
        response.content
      );
      result.push(content);
    }
    return result;
  }

  public async getReviewV2(
    azureService: AzureRepoService,
    opts: GetReviewOptionsV2,
    changedFiles: {
      path: string;
      initialFileId: string;
      modifiedFileId: string;
    }[],
    progressEmitter?: EventEmitter
  ) {
    const result: z.infer<typeof responseSchema>[] = [];
    const totalFiles = changedFiles.length;

    for (let i = 0; i < changedFiles.length; i++) {
      const fileChange = changedFiles[i];
      const { path, initialFileId, modifiedFileId } = fileChange;

      progressEmitter?.emit("fileStart", {
        file: path,
        current: i + 1,
        total: totalFiles,
      });

      const { newContent, diff } = await azureService.getFileDiff(
        path,
        initialFileId,
        modifiedFileId,
        opts.repoId
      );

      const userInstruction = `
        The Pull Request changes for this file are shown in the diff below. Review ONLY the lines that were changed (marked with + or -):
        \`\`\`diff
        ${diff}
        \`\`\`
        `;

      const systemPrompt = ReviewPrompt.reviewSystemInstruction(
        opts.repoOverview
      );

      const messages: LLMMessage[] = [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userInstruction,
        },
      ];

      try {
        const response = await this._llmService.sendChatWithJsonSchema(
          opts.modelName,
          messages,
          responseJsonSchema
        );
        const content: z.infer<typeof responseSchema> = JSON.parse(
          response.content
        );
        result.push(content);

        progressEmitter?.emit("fileComplete", {
          file: path,
          current: i + 1,
          total: totalFiles,
          issues: content.length,
        });
      } catch (error) {
        progressEmitter?.emit("error", {
          file: path,
          message: error instanceof Error ? error.message : "Unknown error",
        });
        console.error(`Error reviewing file ${path}:`, error);
      }
    }
    return result;
  }

  public async getReReview(
    opts: GetReviewOptions,
    existingComments: any,
    repoService: LocalRepoService
  ) {
    const { baseBranch, targetBranch } = opts;
    const fileChanges = await repoService.getChangedFiles(
      baseBranch,
      targetBranch
    );
  }
}
