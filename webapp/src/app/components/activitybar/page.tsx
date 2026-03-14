"use client";
import React from "react";
import { History, Files, Box, Boxes, TerminalSquare, Grip, Layers } from "lucide-react";

const tabs = [
  { id: 'overview', icon: Grip, label: 'Overview' },
  { id: 'explorer', icon: Files, label: 'Explorer' },
  { id: 'workspace', icon: Layers, label: 'Workspace' },
  { id: 'toolbox', icon: Box, label: 'ToolBox' },
  { id: 'workbox', icon: Boxes, label: 'WorkBox' },
  { id: 'history', icon: History, label: 'History' },
] as const;

type ActivityTabId = (typeof tabs)[number]['id'];

type ActivityBarProps = {
  activeTab: ActivityTabId;
  onTabSelect: (tabId: ActivityTabId) => void;
  isTerminalOpen: boolean;
  onTerminalToggle: () => void;
};

export default function ActivityBar({
  activeTab,
  onTabSelect,
  isTerminalOpen,
  onTerminalToggle,
}: ActivityBarProps) {
  return (
    <div className="h-full w-12 bg-[#161616] border-r border-[#1f1f1f] flex flex-col items-center justify-between text-gray-300 py-2">
      <div className="flex flex-col items-center space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabSelect(tab.id)}
              className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors duration-150 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3c89ff] cursor-pointer ${
                isActive ? "text-white bg-[#383838]" : ""
              }`}
              title={tab.label}
              aria-label={tab.label}
              aria-pressed={isActive}
              type="button"
            >
              <Icon size={20} strokeWidth={1.75} />
            </button>
          );
        })}
      </div>
      <button
        onClick={onTerminalToggle}
        className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors duration-150 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3c89ff] cursor-pointer ${
          isTerminalOpen ? "text-white bg-[#383838]" : ""
        }`}
        title={isTerminalOpen ? 'Hide Terminal' : 'Show Terminal'}
        aria-label="Toggle Terminal"
        aria-pressed={isTerminalOpen}
        type="button"
      >
        <TerminalSquare size={20} strokeWidth={1.75} />
      </button>
    </div>
  );
}