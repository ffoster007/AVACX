"use client";

import { useMemo, useState } from "react";
import { Box, Crosshair, ShieldAlert, type LucideIcon } from "lucide-react";

type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  enabledByDefault?: boolean;
};

type CategoryDefinition = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tools: ToolDefinition[];
};

const TOOLBOX_CATEGORIES: CategoryDefinition[] = [
  {
    id: "vulnerability",
    title: "Vulnerability Detection Tools",
    description: "Manage scanners that surface weaknesses before adversaries do.",
    icon: ShieldAlert,
    tools: [
      {
        id: "snip-static-analyzer",
        name: "Snip",
        description: "Run static analysis to uncover common misconfigurations and code risks.",
        enabledByDefault: true,
      },
    ],
  },
  {
    id: "offensive",
    title: "Offensive Tools",
    description: "Coordinate offensive tooling for purple-team simulations and readiness drills.",
    icon: Crosshair,
    tools: [
      {
        id: "phishing-simulator",
        name: "Vulture",
        description: "Design phishing engagements that exercise user awareness and reporting.",
      },
    ],
  },
];

type ToggleRecord = Record<string, boolean>;

const buildInitialToolState = (): ToggleRecord => {
  const initial: ToggleRecord = {};
  for (const category of TOOLBOX_CATEGORIES) {
    for (const tool of category.tools) {
      initial[tool.id] = Boolean(tool.enabledByDefault);
    }
  }
  return initial;
};

const ToolboxPanel = () => {
  const [toolStates, setToolStates] = useState<ToggleRecord>(() => buildInitialToolState());

  const categoryStates = useMemo(() => {
    return TOOLBOX_CATEGORIES.reduce<Record<string, { allOn: boolean; anyOn: boolean }>>((acc, category) => {
      const enabledCount = category.tools.reduce((count, tool) => (toolStates[tool.id] ? count + 1 : count), 0);
      acc[category.id] = {
        allOn: enabledCount === category.tools.length && category.tools.length > 0,
        anyOn: enabledCount > 0,
      };
      return acc;
    }, {});
  }, [toolStates]);

  const handleToolToggle = (toolId: string) => {
    setToolStates((prev) => ({
      ...prev,
      [toolId]: !prev[toolId],
    }));
  };

  const handleCategoryToggle = (categoryId: string, nextEnabled: boolean) => {
    setToolStates((prev) => {
      const next = { ...prev };
      const category = TOOLBOX_CATEGORIES.find((item) => item.id === categoryId);
      if (!category) return prev;
      for (const tool of category.tools) {
        next[tool.id] = nextEnabled;
      }
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#101013] text-gray-200">
      <header className="border-b border-[#232326] bg-[#0d0d10] px-6 py-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-gray-400">
            <Box size={16} />
            ToolBox
          </div>
          <p className="text-sm text-gray-300">
            Toggle tooling on or off per category to tailor the security workflow for your.
          </p>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid gap-5 lg:grid-cols-2">
          {TOOLBOX_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const state = categoryStates[category.id];
            const categoryLabel = state?.allOn ? "On" : state?.anyOn ? "Partial" : "Off";
            return (
              <section
                key={category.id}
                className="flex flex-col rounded-lg border border-[#232326] bg-[#151518] p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-gray-100">
                      <Icon size={18} />
                      <h2 className="text-base font-semibold">{category.title}</h2>
                    </div>
                    <p className="text-sm text-gray-400">{category.description}</p>
                    <span className="text-xs uppercase tracking-wide text-gray-500">Category status: {categoryLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCategoryToggle(category.id, !(state?.allOn ?? false))}
                    className="inline-flex items-center gap-2 rounded border border-[#2b2b30] bg-[#1b1b1f] px-3 py-1.5 text-xs text-gray-200 hover:text-white cursor-pointer"
                  >
                    {(state?.allOn ?? false) ? "Disable all" : "Enable all"}
                  </button>
                </div>
                <div className="mt-5 space-y-3">
                  {category.tools.map((tool) => {
                    const enabled = Boolean(toolStates[tool.id]);
                    return (
                      <ToolRow
                        key={tool.id}
                        name={tool.name}
                        description={tool.description}
                        enabled={enabled}
                        onToggle={() => handleToolToggle(tool.id)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ToolboxPanel;

function ToolRow({
  name,
  description,
  enabled,
  onToggle,
}: {
  name: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded border border-[#1f1f23] bg-[#1a1a1d] px-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{name}</p>
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      </div>
      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
        <span className={`font-semibold ${enabled ? "text-[#8ff0a4]" : "text-[#fca5a5]"}`}>{enabled ? "On" : "Off"}</span>
        <Toggle active={enabled} onToggle={onToggle} />
      </div>
    </div>
  );
}

function Toggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const toggleClass = active ? "bg-[#3c89ff]" : "bg-[#2d2d31]";
  const knobClass = active ? "translate-x-[22px]" : "translate-x-1";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3c89ff] focus-visible:ring-offset-[#111113] ${toggleClass}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-150 ${knobClass}`} />
    </button>
  );
}
