import * as azdev from "azure-devops-node-api";
import { RepoService } from "./repo.interface";
import { IGitApi } from "azure-devops-node-api/GitApi";
import { streamToString } from "../utils";
import {
  Comment,
  CommentType,
  CommentThread,
  CommentThreadStatus,
} from "azure-devops-node-api/interfaces/GitInterfaces";
import { env } from "../lib/config";
import { IPullRequest } from "../pullRequest/pullRequest.model";
import { createTwoFilesPatch } from "diff";

export interface CommentDetails {
  filePath: string;
  content: string;
  line: number;
}

export class AzureRepoService extends RepoService {
  private _connection: azdev.WebApi;
  public git: IGitApi;

  constructor() {
    super();
    // const PROJECT_NAME = "DXP - Digital Experience Platform";
    // const REPO_NAME = "DXP.Web";
    const ORG_URL = env.AZURE_ORG_URL;
    const PAT_TOKEN = env.AZURE_PERSONAL_ACCESS_TOKEN;
    const authHandler = azdev.getPersonalAccessTokenHandler(PAT_TOKEN);
    this._connection = new azdev.WebApi(ORG_URL, authHandler);
  }

  // Should call immediately after construction.
  async init() {
    this.git = await this._connection.getGitApi();
  }

  //Used to get changed files in a PR
  async getChangedFilesInPR(repoId: string, prId: number) {
    const iterations = await this.git.getPullRequestIterations(repoId, prId);
    const lastIteration = iterations[iterations.length - 1];
    if (!lastIteration || !lastIteration.id) {
      console.log("No iterations found. PR might be empty.");
      return [];
    }

    const changes = await this.git.getPullRequestIterationChanges(
      repoId,
      prId,
      lastIteration.id
    );

    const modifiedFiles = changes.changeEntries?.filter(
      (c) => c.changeType === 2 && !c.item?.isFolder
    );

    const transformedFiles =
      modifiedFiles?.map((f) => ({
        path: f.item?.path || "",
        initialFileId: f.item?.originalObjectId || "",
        modifiedFileId: f.item?.objectId || "",
      })) || [];

    return transformedFiles;
  }

  //Reads the two files and computes the diff
  async getFileDiff(
    path: string,
    initialFileId: string,
    modifiedFileId: string,
    repoId: string
  ) {
    const [newFileStream, oldFileStream] = await Promise.all([
      this.git.getBlobContent(repoId, modifiedFileId),
      this.git.getBlobContent(repoId, initialFileId),
    ]);

    const [newContent, oldContent] = await Promise.all([
      streamToString(newFileStream),
      streamToString(oldFileStream),
    ]);

    const patch = createTwoFilesPatch(
      path,
      path,
      oldContent,
      newContent,
      "Old Version",
      "New Version"
    );

    return {
      diff: patch,
      oldContent: oldContent,
      newContent: newContent,
      path: path,
    };
  }

  async getPRDetails(repoId: string, prId: number) {
    const details = await this.git.getPullRequest(repoId, prId);

    return {
      pullRequestId: prId,
      repoId: repoId,
      projectId: details.repository?.project?.id ?? "",
      sourceBranch: details.sourceRefName ?? "",
      targetBranch: details.targetRefName ?? "",
      lastReviewedCommit: details.lastMergeSourceCommit?.commitId ?? "null",
      status: "pending",
    };
  }

  async addPRComment(repoId: string, prId: number, cmnt: CommentDetails) {
    const pr = await this.git.getPullRequest(repoId, prId);
    const comment: Comment = {
      content: cmnt.content,
      commentType: CommentType.CodeChange,
    };
    const commentThread: CommentThread = {
      comments: [comment],
      status: CommentThreadStatus.Active,
      threadContext: {
        filePath: cmnt.filePath,
      },
    };
    const newThread = await this.git.createThread(commentThread, repoId, prId);
    return { threadId: newThread.id, commentId: newThread.comments?.[0].id };
  }

  async getPRReplies(repoId: string, prId: number) {
    const threads = await this.git.getThreads(repoId, prId);
    return threads;
  }
}
