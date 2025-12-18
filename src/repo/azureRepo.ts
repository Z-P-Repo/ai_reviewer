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
  private _connection!: azdev.WebApi;
  public git!: IGitApi;
  private tenantId: string;
  private clientId: string;
  private clientSecret: string;
  private orgUrl: string;
  private currentToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    super();
    this.orgUrl = env.AZURE_ORG_URL;
    this.tenantId = env.AZURE_TENANT_ID;
    this.clientId = env.AZURE_CLIENT_ID;
    this.clientSecret = env.AZURE_CLIENT_SECRET;
  }

  // Should call immediately after construction.
  async init() {
    await this.refreshToken();
    this.git = await this._connection.getGitApi();
  }

  private async ensureValidToken(): Promise<void> {
    // Check if token is expired or will expire in the next 5 minutes
    if (!this.currentToken || Date.now() >= this.tokenExpiry - 5 * 60 * 1000) {
      await this.refreshToken();
    }
  }

  private async refreshToken(): Promise<void> {
    const tokenData = await this.getServicePrincipalToken(
      this.tenantId,
      this.clientId,
      this.clientSecret
    );
    this.currentToken = tokenData.token;
    this.tokenExpiry = tokenData.expiresAt;

    const authHandler = azdev.getBearerHandler(this.currentToken);
    this._connection = new azdev.WebApi(this.orgUrl, authHandler);
  }

  private async getServicePrincipalToken(
    tenantId: string,
    clientId: string,
    clientSecret: string
  ): Promise<{ token: string; expiresAt: number }> {
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const scope = "499b84ac-1321-427f-aa17-267ca6975798/.default"; // Azure DevOps resource ID

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: scope,
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to get token: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      // expires_in is in seconds, convert to milliseconds and add to current time
      const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;

      return {
        token: data.access_token,
        expiresAt: expiresAt,
      };
    } catch (error) {
      console.error("Error obtaining service principal token:", error);
      await this.ensureValidToken();
      throw error;
    }
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
    await this.ensureValidToken();
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
    await this.ensureValidToken();
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
    await this.ensureValidToken();
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
    await this.ensureValidToken();
    const threads = await this.git.getThreads(repoId, prId);
    return threads;
  }
}
