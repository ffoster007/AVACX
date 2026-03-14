"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, ShieldAlert, X } from "lucide-react";

import { SnipFinding, SnipReport } from "@/app/types/SnipPriority.types";

interface Props {
  report: SnipReport | null;
  open: boolean;
  onClose: () => void;
}

const priorityOrder = ["P0", "P1", "P2", "P3", "P4"];

function summarisePriority(findings: SnipFinding[]) {
  const summary = new Map<string, number>();
  findings.forEach((finding) => {
    const key = finding.Severity?.Priority ?? "unknown";
    summary.set(key, (summary.get(key) ?? 0) + 1);
  });
  return Array.from(summary.entries()).sort((a, b) => {
    const ai = priorityOrder.indexOf(a[0]);
    const bi = priorityOrder.indexOf(b[0]);
    if (ai === -1 && bi === -1) return a[0].localeCompare(b[0]);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

const SnipVulnerPanel: React.FC<Props> = ({ report, open, onClose }) => {
  const findings = report?.Findings ?? [];
  const summary = summarisePriority(findings);
  const [width, setWidth] = useState<number>(360);
  const draggingRef = useRef<boolean>(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Compute new width as distance from right edge to cursor
      const viewportWidth = window.innerWidth;
      const xFromRight = viewportWidth - e.clientX;
      // Clamp between 300px and 70% of viewport
      const maxW = Math.max(480, Math.floor(viewportWidth * 0.7));
      const newW = Math.max(300, Math.min(maxW, Math.floor(xFromRight)));
      setWidth(newW);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <aside
      ref={panelRef as React.RefObject<HTMLDivElement>}
      className={`relative flex h-full flex-col border-l border-[#2a2a2c] bg-[#111113] transition-transform duration-200 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      style={{ width }}
    >
      {/* Left edge resizer */}
      <div
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize"
        onMouseDown={(e) => {
          e.preventDefault();
          draggingRef.current = true;
        }}
        onDoubleClick={() => setWidth(360)}
        className="absolute left-0 top-0 h-full w-1 cursor-col-resize bg-[#232326] hover:bg-[#2d2d31]"
      />
      <header className="flex items-center justify-between border-b border-[#242426] px-4 py-3 text-sm text-gray-200">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-[#8abaff]" />
          <span className="font-semibold">Vulner</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-[#353538] bg-[#171719] p-1 text-gray-400 hover:text-white cursor-pointer"
        >
          <X size={14} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 text-sm text-gray-200">
        {report ? (
          <div className="space-y-4">
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-white">Scan summary</h2>
              <div className="rounded border border-[#262628] bg-[#151517] px-3 py-3 text-xs text-gray-300">
                <p className="leading-relaxed">
                  We analysed {report.Stats.FilesAnalyzed} item{report.Stats.FilesAnalyzed === 1 ? "" : "s"} in
                  approximately {report.Stats.Duration}. {findings.length === 0 ? "No" : findings.length}
                  {" "}potential issue{findings.length === 1 ? " was" : "s were"} identified.
                </p>
              </div>
              {summary.length > 0 ? (
                <ul className="grid grid-cols-2 gap-2 text-xs">
                  {summary.map(([priority, count]) => (
                    <li key={priority} className="rounded border border-[#2d2d30] bg-[#19191c] px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-gray-400">Priority {priority}</p>
                      <p className="text-sm font-medium text-white">{count} finding{count === 1 ? "" : "s"}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded border border-[#1f3327] bg-[#11291b] px-3 py-3 text-xs text-[#8ff0a4] inline-flex items-center gap-2">
                  <CheckCircle size={14} />
                  Everything looks good. No security findings were reported.
                </div>
              )}
            </section>

            {findings.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">What we noticed</h3>
                <div className="space-y-3">
                  {findings.map((finding) => (
                    <div
                      key={`${finding.ID}:${finding.Location.Path}:${finding.Location.StartLine}-${finding.Location.EndLine}`}
                      className="rounded border border-[#2c1f20] bg-[#1a1314] px-3 py-3 text-xs text-gray-200"
                    >
                      <div className="flex items-center gap-2 text-[#fca5a5]">
                        <AlertTriangle size={14} />
                        <span className="font-semibold text-sm text-white break-words">{finding.Title}</span>
                      </div>
                      <p className="mt-2 text-xs text-gray-300 leading-relaxed break-words">
                        {finding.Description}
                      </p>
                      <div className="mt-3 grid gap-2 text-[11px] text-gray-400">
                        <p>
                          <strong className="text-gray-200">Risk level:</strong> Priority {finding.Severity?.Priority ?? "unknown"}
                          {finding.Severity?.RiskScore ? ` (score ${finding.Severity.RiskScore.toFixed(1)})` : ""}
                        </p>
                        <p>
                          <strong className="text-gray-200">Location:</strong> <span className="break-all">{finding.Location.Path}</span> (
                          {finding.Location.StartLine === finding.Location.EndLine
                            ? `line ${finding.Location.StartLine}`
                            : `lines ${finding.Location.StartLine}-${finding.Location.EndLine}`}
                          )
                        </p>
                        {finding.OWASP?.length ? (
                          <p>
                            <strong className="text-gray-200">OWASP:</strong> <span className="break-words">{finding.OWASP.join(", ")}</span>
                          </p>
                        ) : null}
                        {finding.CWE?.length ? (
                          <p>
                            <strong className="text-gray-200">CWE:</strong> <span className="break-words">{finding.CWE.join(", ")}</span>
                          </p>
                        ) : null}
                        {finding.Tags?.length ? (
                          <p>
                            <strong className="text-gray-200">Tags:</strong> <span className="break-words">{finding.Tags.join(", ")}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Launch Snip to review security insights.
          </div>
        )}
      </div>
    </aside>
  );
};

export default SnipVulnerPanel;
