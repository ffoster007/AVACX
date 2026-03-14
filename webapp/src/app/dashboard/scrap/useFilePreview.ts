import { useCallback, useEffect, useState } from "react";

import { LOCAL_FILECACHE_PREFIX } from "../../lib/constants";
import { isBrowser } from "../../lib/utils";
import { WorkspaceEntry } from "../../types/gitwork.types";

type FilePreviewOptions = {
  selectedWorkspace: WorkspaceEntry | null;
  selectedWorkspaceId: string | null;
};

export const useFilePreview = ({ selectedWorkspace, selectedWorkspaceId }: FilePreviewOptions) => {
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    setPreviewPath(null);
    setPreviewContent("");
    setPreviewLoading(false);
    setPreviewError(null);
  }, [selectedWorkspaceId]);

  const handleExplorerFileClick = useCallback(
    async (fullPath: string) => {
      const workspace = selectedWorkspace;
      if (!workspace) return;

      setPreviewPath(fullPath);
      setPreviewContent("");
      setPreviewError(null);

      if (workspace.type === "local") {
        const rootPrefix = workspace.name.endsWith("/") ? workspace.name : `${workspace.name}/`;
        const relative = fullPath.startsWith(rootPrefix) ? fullPath.slice(rootPrefix.length) : fullPath;
        const fileObj = workspace.files?.[relative];
        if (!fileObj) {
          if (isBrowser() && selectedWorkspaceId) {
            const storageKey = `${LOCAL_FILECACHE_PREFIX}:${selectedWorkspaceId}:${relative}`;
            const cached = window.localStorage.getItem(storageKey);
            if (typeof cached === "string") {
              setPreviewLoading(false);
              setPreviewContent(cached);
              return;
            }
          }
          setPreviewLoading(false);
          setPreviewError("File not found in imported workspace. Please re-import the folder.");
          return;
        }
        try {
          setPreviewLoading(true);
          const text = await fileObj.text();
          setPreviewContent(text);
        } catch {
          setPreviewError("Failed to read file content.");
        } finally {
          setPreviewLoading(false);
        }
        return;
      }

      const owner = workspace.metadata.repo.owner?.login;
      const repoName = workspace.metadata.repo.name;
      const ref = workspace.metadata.branch || "main";

      if (!owner) {
        setPreviewError("Missing repository owner.");
        return;
      }

      setPreviewLoading(true);
      try {
        const repoPrefix = `${repoName}/`;
        const relativePath =
          fullPath === repoName ? "" : fullPath.startsWith(repoPrefix) ? fullPath.slice(repoPrefix.length) : fullPath;

        if (!relativePath) {
          setPreviewLoading(false);
          setPreviewError("Select a file to preview.");
          return;
        }

        const response = await fetch(
          `/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repoName
          )}/contents?path=${encodeURIComponent(relativePath)}&ref=${encodeURIComponent(ref)}`
        );
        const payload = await response.json();
        if (!response.ok) {
          const message = typeof payload?.message === "string" ? payload.message : "Unable to fetch file content.";
          throw new Error(message);
        }
        const content = typeof payload?.content === "string" ? payload.content : "";
        setPreviewContent(content);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load content.";
        setPreviewError(message);
      } finally {
        setPreviewLoading(false);
      }
    },
    [selectedWorkspace, selectedWorkspaceId]
  );

  return {
    previewPath,
    previewContent,
    previewLoading,
    previewError,
    handleExplorerFileClick,
  };
};
