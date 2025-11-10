"use client";

import React from "react";
import type { Candidate } from "@/engine/types";
import { probabilityToColor, computeElbowColors } from "@/engine/utils";

interface CandidatesPanelProps {
  candidates: Candidate[];
}

export default function CandidatesPanel({ candidates }: CandidatesPanelProps) {
  const maxP = candidates.length > 0 ? Math.max(...candidates.map((c) => c.p)) : 0;
  const elbowColors =
    candidates.length >= 3 ? computeElbowColors(candidates.map((c) => c.p)) : null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Candidate Clusters</h2>
      {candidates.length === 0 ? (
        <p className="text-gray-500 text-sm">No candidates remaining.</p>
      ) : (
        <div className="space-y-2">
          {candidates.map((candidate, idx) => {
            const color = elbowColors ? elbowColors[idx] : probabilityToColor(candidate.p, maxP);
            const percentage = Math.round(candidate.p * 100);
            const evidenceLabel =
              candidate.evidence === "+"
                ? "supports"
                : candidate.evidence === "-"
                ? "contradicts"
                : candidate.evidence === "?"
                ? "unknown"
                : "not relevant";

            return (
              <div
                key={candidate.id}
                className="border border-gray-200 rounded p-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-gray-700 truncate flex-1 mr-2">
                    {candidate.id}
                  </span>
                  <span className="text-xs font-semibold text-gray-600">{percentage}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  {candidate.evidence && (
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded"
                      title={evidenceLabel}
                      style={{
                        backgroundColor:
                          candidate.evidence === "+"
                            ? "rgba(34, 197, 94, 0.1)"
                            : candidate.evidence === "-"
                            ? "rgba(239, 68, 68, 0.1)"
                            : candidate.evidence === "?"
                            ? "rgba(156, 163, 175, 0.1)"
                            : "rgba(229, 231, 235, 0.5)",
                        color:
                          candidate.evidence === "+"
                            ? "rgb(22, 163, 74)"
                            : candidate.evidence === "-"
                            ? "rgb(220, 38, 38)"
                            : candidate.evidence === "?"
                            ? "rgb(107, 114, 128)"
                            : "rgb(156, 163, 175)",
                      }}
                    >
                      {candidate.evidence}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Legend: <span className="font-mono">[+]</span> supports{" "}
          <span className="font-mono">[-]</span> contradicts{" "}
          <span className="font-mono">[·]</span> not relevant{" "}
          <span className="font-mono">[?]</span> unknown
        </p>
      </div>
    </div>
  );
}

