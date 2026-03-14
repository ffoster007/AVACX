"use client";

import React, { useState } from "react";
import { ChevronRight, Folder } from "lucide-react";
import { ExplorerNode } from "@/app/types/gitwork.types";
import FileIcon from "@/app/components/popup/fileIcons";

type Props = {
  node: ExplorerNode;
  depth?: number;
  path?: string;
  onFileClick?: (fullPath: string) => void;
};

const ExplorerTreeItem: React.FC<Props> = ({ node, depth = 0, path, onFileClick }) => {
  const currentPath = path ?? node.name;
  // Default collapsed: only expand when the user clicks a folder
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const toggle = () => {
    if (node.type === "folder") {
      setIsExpanded((prev) => !prev);
    } else if (node.type === "file" && onFileClick) {
      onFileClick(currentPath);
    }
  };

  const paddingLeft = depth * 12 + 8;
  return (
    <div className="select-none">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-2 text-left text-sm text-gray-300 hover:text-white px-2 py-1 rounded cursor-pointer"
        style={{ paddingLeft }}
      >
        {node.type === "folder" ? (
          <ChevronRight
            size={14}
            strokeWidth={2}
            className={`transition-transform duration-150 ${isExpanded ? "rotate-90" : ""} text-gray-400`}
          />
        ) : (
          <span className="w-[14px]" />
        )}
        {node.type === "folder" ? (
          <Folder size={14} className="text-[#6aa0ff]" />
        ) : (
          // Use file-specific icon when possible, fallback to FileText
          <>
            <FileIcon name={node.name} className="w-[14px] h-[14px] mr-0" />
          </>
        )}
        <span className="truncate text-xs">{node.name}</span>
      </button>
      {node.type === "folder" && isExpanded && node.children && (
        <div className="mt-0.5">
          {node.children.map((child) => (
            <ExplorerTreeItem
              key={`${currentPath}/${child.name}`}
              node={child}
              depth={depth + 1}
              path={`${currentPath}/${child.name}`}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ExplorerTreeItem;
