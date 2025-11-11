"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Selector } from "@/engine/selector";
import { loadClusterRules, loadQuestionBank, loadPolicyShims, loadRoomPriors, loadAutoClusters, loadClusterNames, loadWTRLineItems } from "@/engine/loader";
import type { Answer, NextQuestion, Candidate, AutoCluster, ClusterNames } from "@/engine/types";
import { RoomId } from "@/components/ui/QuestionRang";
import SavedAnswers, { AnswerEntry } from "@/components/ui/SavedAnswers";
import { probabilityToColor, computeElbowColors } from "@/engine/utils";

// ---- Room assets and helpers ----
const ROOM_IMAGES: Record<string, string> = {
  BATHROOM: "/vanna1.jpg",
  KITCHEN: "/kuhnya-eterno-790-1.jpg",
  LIVING_ROOM: "/gostinaya-20-1.jpg",
  BEDROOM: "/spalnya-123-1.jpg",
  BASEMENT: "/Basement.jpg",
  CLOSET: "/closet.webp",
  CRAWLSPACE: "/crawlspace.jpg",
  GARAGE: "/garage.jpg",
  GENERAL: "/general.jpg",
  HALLWAY: "/hallway.jpg",
  LAUNDRY: "/laundry.webp",
  LIVING_AREA: "/living.jpg",
  OFFICE: "/office.webp",
  PATIO: "/patio.jpg",
  STAIRS: "/stairs.webp",
  STORAGE: "/storage.jpg",
  OTHER: "/other.jpg",
  UTILITY: "/utility.webp",
};

function toTitleCase(s: string): string {
  return s
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function getRoomLabel(roomType: string): string {
  return toTitleCase(roomType.trim());
}

function getRoomImage(roomType: string): string {
  return ROOM_IMAGES[roomType] ?? "/window.svg";
}

/* =========================
   Types & helpers
   ========================= */
type StopReason = "count" | "mass" | "exhausted";
type StopState = { shouldStop: boolean; reason?: StopReason };

const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className = "", children }) => (
  <div className={`rounded-2xl bg-white shadow-sm ring-1 ring-black/5 ${className}`}>{children}</div>
);

const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
  const pct = Math.min(100, Math.max(0, value));
  const fillClass = pct >= 100 ? "bg-emerald-500" : "bg-rose-400";
  return (
    <div className="w-full h-3 rounded-full bg-neutral-200">
      <div
        className={`h-3 rounded-full transition-[width,background-color] duration-300 ${fillClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

type OptionButtonProps = {
  label: string;
  onClick?: () => void;
  variant?: "default" | "muted";
};

const OptionButton: React.FC<OptionButtonProps> = ({
  label,
  onClick,
  variant = "default",
}) => (
  <button
    className={
      "w-full rounded-xl px-4 py-4 text-left font-medium transition focus:outline-none focus-visible:ring-2 " +
      (variant === "muted"
        ? "bg-neutral-200 text-neutral-700 hover:bg-neutral-300 focus-visible:ring-neutral-300"
        : "bg-rose-300/70 text-neutral-800 hover:bg-rose-300 focus-visible:ring-rose-400")
    }
    type="button"
    onClick={onClick}
  >
    {label}
  </button>
);

const QuestionBlock: React.FC<{ question: NextQuestion; onSelect?: (value: string | number | boolean | "__UNKNOWN__") => void }> = ({ question, onSelect }) => {
  const needScroll = question.options.length > 4;
  return (
    <Card className="p-4">
      <div className="text-sm font-semibold text-neutral-800">{question.prompt}</div>
      <div className={needScroll ? "mt-4 max-h-64 space-y-3 overflow-y-auto pr-1" : "mt-4 space-y-3"}>
        {question.options.map((opt, idx) => (
          <OptionButton key={idx} label={opt.label} onClick={() => onSelect?.(opt.value)} />
        ))}
        <OptionButton label="Unknown" variant="muted" onClick={() => onSelect?.("__UNKNOWN__")} />
      </div>
    </Card>
  );
};

/* =========================
   Content blocks
   ========================= */

const RoomGrid: React.FC<{
  rooms: string[];
  onPick: (room: string) => void;
}> = ({ rooms, onPick }) => (
  <div className="w-full max-w-[640px] mx-auto pt-2 pb-8 sm:pt-3 sm:pb-10">
    <h3 className="text-center text-sm font-semibold text-neutral-800 mb-4">Please select the room you are in</h3>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {rooms.map((roomType) => (
        <button
          key={roomType}
          onClick={() => onPick(roomType)}
          className="group overflow-hidden rounded-xl ring-1 ring-black/5 transition hover:shadow-md bg-white"
          type="button"
        >
          <div className="h-24 w-full overflow-hidden">
            <img
              src={getRoomImage(roomType)}
              alt={getRoomLabel(roomType)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="px-3 py-2 text-center text-sm font-medium text-neutral-700">{getRoomLabel(roomType)}</div>
        </button>
      ))}
    </div>
  </div>
);

const QuestionScreen: React.FC<{ question: NextQuestion | null; onAnswer: (q: NextQuestion, val: string | number | boolean | "__UNKNOWN__") => void; isStopped: boolean }> = ({ question, onAnswer, isStopped }) => (
  <div className={`h-full ${question ? "" : "flex items-center justify-center"}`}>
    <AnimatePresence mode="wait">
      {isStopped ? (
        <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm text-neutral-600">
          Done! The engine has converged on the best candidate cluster(s).
        </motion.div>
      ) : question ? (
        <motion.div
          key={question.factId}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          <QuestionBlock question={question} onSelect={(val) => onAnswer(question, val)} />
        </motion.div>
      ) : (
        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm text-neutral-600">
          Loading...
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const PhoneShell: React.FC<{ room: string | null; progress: number; onClose: () => void; onUndo?: () => void; canUndo?: boolean; children: React.ReactNode }> = ({ room, progress, onClose, onUndo, canUndo, children }) => {
  const title = room ? getRoomLabel(room) : "Please select the room you are in";
  const showImage = Boolean(room);
  return (
    <div className="mx-auto w-[320px] sm:w-[360px]">
      <div className="relative rounded-[36px] bg-neutral-900/5 p-2 shadow-xl ring-1 ring-black/10">
        <div className="rounded-[32px] bg-white h-[700px] flex flex-col overflow-hidden">
          <motion.div initial={false} animate={{ height: showImage ? 160 : 0 }} className="overflow-hidden rounded-t-[32px] flex-shrink-0">
            {showImage && (
              <motion.img
                key={room!}
                src={getRoomImage(room!)}
                alt={title}
                className="h-40 w-full object-cover"
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </motion.div>

          {showImage && (
            <div className="space-y-3 px-4 py-3 flex-shrink-0">
              <div className="flex items-center justify-between text-sm font-semibold text-neutral-800">
                <span>{title}</span>
                <div className="flex items-center gap-2">
                  {onUndo && canUndo && (
                    <button
                      className="grid h-6 w-6 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100"
                      aria-label="undo"
                      type="button"
                      onClick={onUndo}
                      title="Undo last answer"
                    >
                      ←
                    </button>
                  )}
                  <button
                    className="grid h-6 w-6 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100"
                    aria-label="close"
                    type="button"
                    onClick={onClose}
                  >
                    ×
                  </button>
                </div>
              </div>
              <ProgressBar value={progress} />
            </div>
          )}

          <div className="px-4 pt-4 pb-10 flex-1 overflow-y-auto min-h-0">{children}</div>
        </div>
      </div>
    </div>
  );
};

const CandidatesPanel: React.FC<{ candidates: Candidate[] }> = ({ candidates }) => {
  const [names, setNames] = React.useState<ClusterNames>({});
  const [autoClusters, setAutoClusters] = React.useState<Record<string, AutoCluster>>({});
  const [selDesc, setSelDesc] = React.useState<Record<string, string>>({});
  const [hover, setHover] = React.useState<{ id: string; x: number; y: number } | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [nmap, clist, sdesc] = await Promise.all([
          loadClusterNames(),
          loadAutoClusters(),
          loadWTRLineItems(),
        ]);
        if (!mounted) return;
        const cmap: Record<string, AutoCluster> = {};
        for (const c of clist) cmap[c.cluster_id] = c;
        setNames(nmap);
        setAutoClusters(cmap);
        setSelDesc(sdesc);
      } catch (e) {
        console.warn("Failed loading UI catalogs:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function parseItemToSel(itemCode: string): string {
    // Formats like 'WTR_DHM>>>_+', 'WTR_MASKFLP_I', 'WTR_EXT+_+'
    const firstUnderscore = itemCode.indexOf("_");
    if (firstUnderscore < 0) return itemCode;
    const afterCat = itemCode.slice(firstUnderscore + 1);
    const lastUnderscore = afterCat.lastIndexOf("_");
    if (lastUnderscore < 0) return afterCat;
    return afterCat.slice(0, lastUnderscore);
  }

  const getDisplayName = React.useCallback((id: string) => {
    return names[id]?.name || id;
  }, [names]);

  const getClusterSels = React.useCallback((id: string): string[] => {
    const ac = autoClusters[id];
    if (!ac) return [];
    const uniq = new Set<string>();
    for (const itm of ac.core_item_codes || []) {
      uniq.add(parseItemToSel(itm));
    }
    return Array.from(uniq);
  }, [autoClusters]);

  const maxP = candidates.length > 0 ? Math.max(...candidates.map((c) => c.p)) : 0;
  const elbowColors =
    candidates.length >= 3 ? computeElbowColors(candidates.map((c) => c.p)) : null;

  return (
    <Card className="p-4 h-full flex flex-col">
      <div className="text-sm font-semibold text-neutral-800 mb-4">Candidate Clusters</div>
      {candidates.length === 0 ? (
        <div className="text-sm text-neutral-600">No candidates remaining.</div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1">
          <ul className="space-y-2">
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
                <li
                  key={candidate.id}
                  className="relative border border-black/5 rounded-lg bg-white/70 px-3 py-2"
                  onMouseEnter={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setHover({ id: candidate.id, x: rect.right + 8, y: rect.top });
                  }}
                  onMouseMove={(e) => {
                    setHover((prev) => prev ? { id: prev.id, x: e.clientX + 12, y: e.clientY + 12 } : null);
                  }}
                  onMouseLeave={() => setHover(null)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-neutral-700 truncate flex-1 mr-2">
                      {getDisplayName(candidate.id)}
                    </span>
                    <span className="text-xs font-semibold text-neutral-600">{percentage}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
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
                        className="text-xs font-mono px-1.5 py-0.5 rounded"
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
                  {/* Hover detail panel */}
                  {hover && hover.id === candidate.id && (
                    <div
                      className="fixed z-50 bg-white opacity-100 shadow-2xl rounded-lg px-3 py-2 text-xs text-neutral-800 ring-1 ring-black/10"
                      style={{
                        left: Math.min(hover.x, window.innerWidth - 280),
                        top: Math.min(hover.y, window.innerHeight - 200),
                        width: 260,
                      }}
                    >
                      <div className="font-semibold mb-1">{getDisplayName(candidate.id)}</div>
                      <div>
                        <table className="w-full text-left border-separate border-spacing-y-1">
                          <thead className="sticky top-0 bg-white">
                            <tr className="text-neutral-500">
                              <th className="pr-2">SEL</th>
                              <th>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getClusterSels(candidate.id).map((sel) => (
                              <tr key={sel}>
                                <td className="pr-2 font-mono text-[11px] text-neutral-700 whitespace-nowrap">{sel}</td>
                                <td className="text-[11px]">
                                  {selDesc[sel] || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="mt-4 pt-4 border-t border-black/5">
        <p className="text-xs text-neutral-500">
          Legend: <span className="font-mono">[+]</span> supports{" "}
          <span className="font-mono">[-]</span> contradicts{" "}
          <span className="font-mono">[·]</span> not relevant{" "}
          <span className="font-mono">[?]</span> unknown
        </p>
      </div>
    </Card>
  );
};

/* =========================
   Main component
   ========================= */

// Carrier mapping: ID -> Name
const CARRIERS: Record<number, string> = {
  92: "State Farm (US)",
  91: "United Services Automobile Association (USAA)",
  13: "Co-Operators",
  35: "TD Insurance",
  87: "Allstate / Encompass / Esurance",
  41: "Wawanesa",
  45: "Cooperators",
  120: "Farmers Insurance",
};

export default function DemoPageClient({ initialRoom }: { initialRoom?: RoomId }) {
  // room holds the canonical room type string, e.g. "BATHROOM"
  const [room, setRoom] = React.useState<string | null>((initialRoom as string | undefined) ?? null);
  const [availableRooms, setAvailableRooms] = React.useState<string[]>([]);
  const [carrierGroupId, setCarrierGroupId] = React.useState<number | undefined>(undefined);
  const [provinceId, setProvinceId] = React.useState<number | undefined>(undefined);
  const [selector, setSelector] = React.useState<Selector | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = React.useState<NextQuestion | null>(null);
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [answerLog, setAnswerLog] = React.useState<AnswerEntry[]>([]);
  const [stop, setStop] = React.useState<StopState>({ shouldStop: false });
  const [progress, setProgress] = React.useState(0);

  // Load available room types from cluster rules on mount
  React.useEffect(() => {
    async function loadRooms() {
      try {
        const clusters = await loadClusterRules();
        const roomSet = new Set<string>();
        for (const c of clusters) {
          const rt = (c.room_type || "").trim();
          if (rt) roomSet.add(rt.toUpperCase());
        }
        const list = Array.from(roomSet).sort();
        setAvailableRooms(list);
      } catch (err) {
        // Non-fatal for UI; will also surface when initializing selector if needed
        console.error("Failed to load rooms from cluster rules:", err);
      }
    }
    loadRooms();
  }, []);

  // Initialize engine when room, carrier, or province changes
  React.useEffect(() => {
    async function initialize() {
      if (!room) return;

      try {
        setLoading(true);
        setError(null);

        const [clusters, qbank, shims, priors] = await Promise.all([
          loadClusterRules(),
          loadQuestionBank(),
          loadPolicyShims(),
          loadRoomPriors(),
        ]);

        const sel = new Selector(room, {
          stopAt: 1,
          topk: 1,
          tau: 0.85,
          carrierGroup: carrierGroupId,
          province: provinceId,
        });

        // Select per-room priors if available
        const priForRoom = priors?.[room?.toUpperCase?.() || ""] as Record<string, number> | undefined;
        await sel.initialize(clusters, qbank, {
          policyShims: shims,
          roomPriors: priForRoom || {},
        });

        setSelector(sel);
        const state = sel.getState();
        setCurrentQuestion(state.nextQuestion);
        setCandidates(state.candidates);
        setStop(state.stop);
  // Compute progress as answered / (answered + frontier). If frontier
  // info is not available, fall back to the model's topKMass metric.
  const answered = state.metrics?.answeredCount ?? 0;
  const frontier = state.metrics?.frontierCount ?? 0;
  const total = answered + frontier;
  const pct = total > 0 ? (answered / total) * 100 : state.metrics?.topKMass ? state.metrics.topKMass * 100 : 0;
  setProgress(pct);

        setLoading(false);
      } catch (err) {
        console.error("Failed to initialize engine:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize engine");
        setLoading(false);
      }
    }

    initialize();
  }, [room, carrierGroupId, provinceId]);

  const handlePickRoom = (r: string) => {
    setRoom(r);
    setAnswerLog([]);
    setCurrentQuestion(null);
    setCandidates([]);
    setStop({ shouldStop: false });
    setProgress(0);
  };

  const handleAnswer = (q: NextQuestion, val: string | number | boolean | "__UNKNOWN__") => {
    if (!selector) return;

    const answer: Answer = {
      factId: q.factId,
      value: val,
    };

    selector.updateWithAnswer(answer.factId, answer.value);

    const state = selector.getState(answer);
    setCurrentQuestion(state.nextQuestion);
    setCandidates(state.candidates);
    setStop(state.stop);
    {
      const answered = state.metrics?.answeredCount ?? 0;
      const frontier = state.metrics?.frontierCount ?? 0;
      const total = answered + frontier;
      const pct = total > 0 ? (answered / total) * 100 : state.metrics?.topKMass ? state.metrics.topKMass * 100 : 0;
      setProgress(pct);
    }

    // Update answer log
    const answerLabel = val === "__UNKNOWN__" ? "Unknown" : q.options.find((opt) => opt.value === val)?.label || String(val);
    // Flag as Carrier (Phase A) only when question originated from carrier shims
    const phase = q.origin === "carrier" ? "A" : undefined;
    setAnswerLog((prev) => [
      ...prev,
      {
        id: q.factId,
        title: q.prompt,
        answer: answerLabel,
        value: val, // Store actual value for undo
        answeredAt: Date.now(),
        phase,
      },
    ]);
  };

  const handleUndo = async () => {
    if (!selector || answerLog.length === 0 || !room) return;

    // Remove last answer from log
    const newAnswerLog = answerLog.slice(0, -1);
    setAnswerLog(newAnswerLog);

    // Reset selector and reapply all remaining answers
    try {
      setLoading(true);
      const [clusters, qbank, shims, priors] = await Promise.all([
        loadClusterRules(),
        loadQuestionBank(),
        loadPolicyShims(),
        loadRoomPriors(),
      ]);

      const sel = new Selector(room, {
        stopAt: 1,
        topk: 1,
        tau: 0.85,
        carrierGroup: carrierGroupId,
        province: provinceId,
      });

      const priForRoom = priors?.[room.toUpperCase()] as Record<string, number> | undefined;
      await sel.initialize(clusters, qbank, {
        policyShims: shims,
        roomPriors: priForRoom || {},
      });

      // Reapply all answers except the last one
      for (const entry of newAnswerLog) {
        sel.updateWithAnswer(entry.id, entry.value);
      }

      setSelector(sel);
      const state = sel.getState();
      setCurrentQuestion(state.nextQuestion);
      setCandidates(state.candidates);
      setStop(state.stop);
      {
        const answered = state.metrics?.answeredCount ?? 0;
        const frontier = state.metrics?.frontierCount ?? 0;
        const total = answered + frontier;
        const pct = total > 0 ? (answered / total) * 100 : state.metrics?.topKMass ? state.metrics.topKMass * 100 : 0;
        setProgress(pct);
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to undo:", err);
      setError(err instanceof Error ? err.message : "Failed to undo");
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRoom(null);
    setSelector(null);
    setCurrentQuestion(null);
    setCandidates([]);
    setAnswerLog([]);
    setStop({ shouldStop: false });
    setProgress(0);
  };

  if (error) {
    return (
      <div className="min-h-screen w-full bg-neutral-100 flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <div className="text-sm font-semibold text-red-600 mb-2">Error</div>
          <div className="text-sm text-neutral-700">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-rose-400 text-white rounded-xl hover:bg-rose-500"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top controls: Carrier and Province */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-xs font-medium text-neutral-700">
            Carrier
            <select
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
              value={carrierGroupId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setCarrierGroupId(val === "" ? undefined : parseInt(val, 10));
              }}
            >
              <option value="">Select carrier (optional)</option>
              {Object.entries(CARRIERS)
                .sort(([idA], [idB]) => parseInt(idA, 10) - parseInt(idB, 10))
                .map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs font-medium text-neutral-700">
            Province ID
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
              placeholder="e.g., 1, 2, 3"
              value={provinceId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setProvinceId(val === "" ? undefined : parseInt(val, 10));
              }}
            />
          </label>
        </div>
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* Left column: phone-like shell with the active question */}
          <div className="min-h-[80vh] flex">
            <PhoneShell room={room} progress={progress} onClose={handleClose} onUndo={handleUndo} canUndo={answerLog.length > 0}>
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-sm text-neutral-600"
                  >
                    Loading engine...
                  </motion.div>
                ) : room ? (
                  <motion.div
                    key="questions"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                    className="h-full"
                  >
                    <QuestionScreen question={currentQuestion} onAnswer={handleAnswer} isStopped={stop.shouldStop} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="picker"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                    className="h-full"
                  >
                    <RoomGrid rooms={availableRooms} onPick={handlePickRoom} />
                  </motion.div>
                )}
              </AnimatePresence>
            </PhoneShell>
          </div>

          {/* Right column: candidates + saved answers */}
          <div className="grid gap-6">
            <CandidatesPanel candidates={candidates} />
            <SavedAnswers
              items={[...answerLog].sort((a, b) => a.answeredAt - b.answeredAt)}
              onUndo={handleUndo}
              canUndo={answerLog.length > 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
