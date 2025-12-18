export abstract class RepoService {
  abstract getFileDiff(
    path: string,
    initialFileId: string,
    modifiedFileId: string,
    repoId: string
  ): Promise<{
    diff: string;
    oldContent: string;
    newContent: string;
    path: string;
  }>;
  abstract getChangedFilesInPR(
    repoId: string,
    prId: number
  ): Promise<{ path: string; initialFileId: string; modifiedFileId: string }[]>;
}
