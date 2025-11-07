"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import QuestionRang, { RoomId, Question as BaseQuestion } from "@/components/ui/QuestionRang";
import SavedAnswers, { AnswerEntry } from "@/components/ui/SavedAnswers";

export type Importance = number;

export type Question = BaseQuestion & {
  importance?: Importance; 
  createdAt?: number;       
};

// ---- Mock rooms ----
const ROOMS: Record<RoomId, { label: string; image: string }> = {
  bathroom: { label: "Bathroom", image: "/vanna1.jpg" },
  kitchen:  { label: "Kitchen",  image: "/kuhnya-eterno-790-1.jpg" },
  living:   { label: "Living Room", image: "/gostinaya-20-1.jpg" },
  bedroom:  { label: "Bedroom", image: "/spalnya-123-1.jpg" },
};

/* =========================
   Types & helpers
   ========================= */

type AnswersMap = Record<string, string>;

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

const OptionButton: React.FC<{ label: string; onClick?: () => void }> = ({ label, onClick }) => (
  <button
    className="w-full rounded-xl bg-rose-300/70 px-4 py-4 text-left font-medium text-neutral-800 transition hover:bg-rose-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
    type="button"
    onClick={onClick}
  >
    {label}
  </button>
);

const QuestionBlock: React.FC<{ question: Question; onSelect?: (value: string) => void }> = ({ question, onSelect }) => {
  const needScroll = question.options.length > 4;
  return (
    <Card className="p-4">
      <div className="text-sm font-semibold text-neutral-800">{question.title}</div>
      {question.subtitle && <div className="mt-2 text-sm text-neutral-500">{question.subtitle}</div>}
      <div className={needScroll ? "mt-4 max-h-64 space-y-3 overflow-y-auto pr-1" : "mt-4 space-y-3"}>
        {question.options.map((opt) => (
          <OptionButton key={opt} label={opt} onClick={() => onSelect?.(opt)} />
        ))}
      </div>
    </Card>
  );
};

/* =========================
   Content blocks
   ========================= */

const RoomGrid: React.FC<{ onPick: (room: RoomId) => void }> = ({ onPick }) => (
  <div className="w-full max-w-[560px] mx-auto">
    <h3 className="text-center text-sm font-semibold text-neutral-800 mb-4">Please select the room you are in</h3>
    <div className="grid grid-cols-2 gap-4">
      {(Object.keys(ROOMS) as RoomId[]).map((id) => (
        <button
          key={id}
          onClick={() => onPick(id)}
          className="group overflow-hidden rounded-xl ring-1 ring-black/5 transition hover:shadow-md bg-white"
          type="button"
        >
          <div className="h-24 w-full overflow-hidden">
            <img
              src={ROOMS[id].image}
              alt={ROOMS[id].label}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="px-3 py-2 text-center text-sm font-medium text-neutral-700">{ROOMS[id].label}</div>
        </button>
      ))}
    </div>
  </div>
);

const QuestionScreen: React.FC<{ question: Question | null; onAnswer: (qId: string, val: string) => void }> = ({ question, onAnswer }) => (
  <div className={`h-full ${question ? "" : "flex items-center justify-center"}`}>
    <AnimatePresence mode="wait">
      {question ? (
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          <QuestionBlock question={question} onSelect={(val) => onAnswer(question.id, val)} />
        </motion.div>
      ) : (
        <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm text-neutral-600">
          Done! No more questions.
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const PhoneShell: React.FC<{ room: RoomId | null; progress: number; onClose: () => void; children: React.ReactNode }> = ({ room, progress, onClose, children }) => {
  const title = room ? ROOMS[room].label : "Please select the room you are in";
  const showImage = Boolean(room);
  return (
    <div className="mx-auto w-[320px] sm:w-[360px]">
      <div className="relative rounded-[36px] bg-neutral-900/5 p-2 shadow-xl ring-1 ring-black/10">
        <div className="rounded-[32px] bg-white min-h-[640px] flex flex-col">
          <motion.div initial={false} animate={{ height: showImage ? 176 : 0 }} className="overflow-hidden rounded-t-[32px]">
            {showImage && (
              <motion.img
                key={room!}
                src={ROOMS[room!].image}
                alt={title}
                className="h-44 w-full object-cover"
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </motion.div>

          {showImage && (
            <div className="space-y-3 px-4 py-3">
              <div className="flex items-center justify-between text-sm font-semibold text-neutral-800">
                <span>{title}</span>
                <button
                  className="grid h-6 w-6 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100"
                  aria-label="close"
                  type="button"
                  onClick={onClose}
                >
                  ×
                </button>
              </div>
              <ProgressBar value={progress} />
            </div>
          )}

          <div className={`px-4 pb-5 flex-1 ${!showImage ? "flex items-center justify-center" : ""}`}>{children}</div>
        </div>
      </div>
    </div>
  );
};

/* =========================
   Sorting & recompute (importance-only)
   ========================= */

function sortByImportance(ids: string[], reg: Record<string, Question>): string[] {
  const arr = [...ids];
  arr.sort((a, b) => {
    const qa = reg[a];
    const qb = reg[b];
    const ia = qa?.importance ?? 0;
    const ib = qb?.importance ?? 0;
    if (ib !== ia) return ib - ia;            
    const ca = qa?.createdAt ?? 0;
    const cb = qb?.createdAt ?? 0;
    if (ca !== cb) return ca - cb;          
    return a.localeCompare(b);              
  });
  return arr;
}


/* reg: { q1: {importance: 100}, q2: {importance: 70}, q3: {importance: 95} }

answers: { q1: "Yes" }

unanswered: ["q2","q3"]

sortByImportance → ["q3","q2"]

Return: ["q3","q2"] → q2 will become current, then q3. */
function recomputeFlow(room: RoomId | null, answers: AnswersMap, reg: Record<string, Question>): string[] {
  if (!room) return [];
  const unanswered = Object.keys(reg).filter((id) => answers[id] === undefined);
  return sortByImportance(unanswered, reg);
}

/* =========================
   API mocks
   ========================= */

async function apiFetchInitial(room: RoomId): Promise<Question[]> {
  if (room === "bathroom") {
    return [
      { id: "q1", title: "Your bathroom was destroyed by a nuclear explosion?", subtitle: "You can choose one option", options: ["Yes", "No", "Maybe🤔", "More likely yes than no", "More likely no than yes"], importance: 100 },
      { id: "q2", title: "Was your bathroom destroyed by a 100 person party?", subtitle: "You can choose one option", options: ["Yes", "No", "Maybe", "There were only 15 people there"], importance: 95 },
      { id: "q3", title: "There is mold in the bathroom?", subtitle: "You can choose one option", options: ["Yes", "No", "Maybe", "More likely yes than no", "More likely no than yes"], importance: 80 },
    ];
  }
  if (room === "kitchen") {
    return [
      { id: "k1", title: "Kitchen layout", options: ["Single-wall", "L-shaped", "Island", "U-shaped"], importance: 90 },
    ];
  }
  if (room === "living") {
    return [
      { id: "l1", title: "Test 1", options: ["Answer 1", "Answer 2", "Answer 3", "Answer 4"], importance: 90 },
      { id: "l2", title: "Test 2", options: ["Answer 1", "Answer 2", "Answer 3", "Answer 4"], importance: 85 },
      { id: "l3", title: "Test 3", options: ["Answer 1", "Answer 2", "Answer 3", "Answer 4"], importance: 80 },
    ];
  }
  if (room === "bedroom") {
    return [
      { id: "b1", title: "Do you prefer soft lighting?", options: ["Yes", "No"], importance: 70 },
    ];
  }
  return [];
}

async function apiFetchFollowUps(room: RoomId, triggerId: string, answer: string): Promise<Question[]> {
  if (room === "bathroom" && triggerId === "q2") {
    return [
      { id: "l1", title: "Test 1", options: ["Answer 1", "Answer 2", "Answer 3", "Answer 4"], importance: 92 },
      { id: "l2", title: "Test 2", options: ["Answer 1", "Answer 2", "Answer 3", "Answer 4"], importance: 75 },
    ];
  }
  return [];
}

/* =========================
   Main component
   ========================= */

export default function SurveyClient({ initialRoom }: { initialRoom?: RoomId }) {
  const [room, setRoom] = React.useState<RoomId | null>(initialRoom ?? null);
  const [answers, setAnswers] = React.useState<AnswersMap>({});

  // Dynamic question catalog (fetched from API), grouped by room
  const [dynamicByRoom, setDynamicByRoom] = React.useState<Partial<Record<RoomId, Question[]>>>({});

  // Flow = ordered list of question IDs (only unanswered ones)
  const [flow, setFlow] = React.useState<string[]>([]);

  // Current question as ID (robust against reorders)
  const [currentId, setCurrentId] = React.useState<string | null>(null);

  // Answers journal (snapshot) — show ONLY actually answered questions, even if questions are later removed
  const [answerLog, setAnswerLog] = React.useState<AnswerEntry[]>([]);

  // Registry id -> Question for the active room (O(1) access by ID)
  const registry = React.useMemo(() => {
    const map: Record<string, Question> = {};
    if (!room) return map;
    for (const q of dynamicByRoom[room] ?? []) map[q.id] = q;
    return map;
  }, [room, dynamicByRoom]);

  // Ref with the latest registry — used inside async callbacks to avoid stale closures
  const registryRef = React.useRef<Record<string, Question>>({});
  React.useEffect(() => { registryRef.current = registry; }, [registry]);

  // Ordered Question objects for UI (only unanswered, in the current flow order)
  const orderedQuestions: Question[] = React.useMemo(
    () => flow.map((id) => registry[id]).filter(Boolean),
    [flow, registry]
  );

  // Progress: based on total known questions in the registry (not just flow length)
  const totalKnown = React.useMemo(() => Object.keys(registry).length, [registry]);
  const answeredCount = React.useMemo(() => Object.keys(answers).filter((id) => answers[id] !== undefined).length, [answers]);
  const progress = totalKnown > 0 ? Math.round((answeredCount / totalKnown) * 100) : 100;

  // Current question object (may be null if no unanswered left)
  const currentQuestion: Question | null = currentId ? (registry[currentId] ?? null) : null;

  // Merge helper (upsert by id) for incoming questions from API
  function mergeQuestions(room: RoomId, incoming: Question[]) {
    setDynamicByRoom((prev) => {
      const cur = prev[room] ?? [];
      const known = new Map(cur.map((q) => [q.id, q]));
      for (const q of incoming) {
        const existing = known.get(q.id);
        if (existing) known.set(q.id, { ...existing, ...q });    // update existing
        else known.set(q.id, { createdAt: Date.now(), ...q });   // insert new with timestamp
      }
      return { ...prev, [room]: Array.from(known.values()) };
    });
  }

  // Recompute the flow and pick the next current (most important among unanswered)
  function recomputeAndPick(a: AnswersMap) {
    const nextFlow = recomputeFlow(room, a, registryRef.current);
    setFlow(nextFlow);
    setCurrentId(nextFlow[0] ?? null);
  }

  // Handlers
  const handlePickRoom = async (r: RoomId) => {
    setRoom(r);
    const fresh: AnswersMap = {};
    setAnswers(fresh);
    setAnswerLog([]); // optional UX: reset answers journal when room changes

    const initial = await apiFetchInitial(r);
    mergeQuestions(r, initial);

    // First compute using the just-fetched questions
    const bootRegistry = { ...registryRef.current, ...Object.fromEntries(initial.map((q) => [q.id, q])) } as Record<string, Question>;
    const bootFlow = recomputeFlow(r, fresh, bootRegistry);
    setFlow(bootFlow);
    setCurrentId(bootFlow[0] ?? null);
  };

  const handleAnswer = (qId: string, val: string) => {
    setAnswers((prev) => {
      const nextAns = { ...prev, [qId]: val };

      // === answers journal (snapshot) ===
      setAnswerLog((prevLog) => {
        const idx = prevLog.findIndex((e) => e.id === qId);
        const titleSnapshot = registryRef.current[qId]?.title ?? `Question ${qId}`;
        const entry: AnswerEntry = {
          id: qId,
          title: titleSnapshot,
          answer: val,
          answeredAt: idx >= 0 ? prevLog[idx].answeredAt : Date.now(), // keep original timestamp if updating answer
        };
        if (idx >= 0) {
          const copy = [...prevLog];
          copy[idx] = entry; // update existing entry
          return copy;
        }
        return [...prevLog, entry]; // append new entry
      });

      // 1) Locally recompute: remove answered from flow and pick next by importance
      recomputeAndPick(nextAns);

      // 2) Async: fetch follow-ups if any, merge, then recompute again
      (async () => {
        if (!room) return;
        const more = await apiFetchFollowUps(room, qId, val);
        if (more.length) {
          mergeQuestions(room, more);
          recomputeAndPick(nextAns);
        }
      })();

      return nextAns;
    });
  };

  const handleClose = () => {
    // Reset everything to initial state
    setRoom(null);
    setFlow([]);
    setCurrentId(null);
    setAnswers({});
    setAnswerLog([]);
  };

  // Index for QuestionRang compatibility (used for highlighting current question)
  const currentIndexForCompat = currentId ? flow.indexOf(currentId) : 0;

  return (
    <div className="min-h-screen w-full bg-neutral-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* Left column: phone-like shell with the active question */}
          <div className="min-h-[80vh] flex">
            <PhoneShell room={room} progress={progress} onClose={handleClose}>
              <AnimatePresence mode="wait">
                {room ? (
                  <motion.div
                    key="questions"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                    className="h-full"
                  >
                    <QuestionScreen question={currentQuestion} onAnswer={handleAnswer} />
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
                    <RoomGrid onPick={handlePickRoom} />
                  </motion.div>
                )}
              </AnimatePresence>
            </PhoneShell>
          </div>

          {/* Right column: queue overview + saved answers */}
          <div className="grid gap-6">
            <QuestionRang
              room={room}
              questions={orderedQuestions}
              currentIndex={Math.max(0, currentIndexForCompat)}
              currentQuestion={currentQuestion}
            />
            <SavedAnswers
              items={[...answerLog].sort((a, b) => a.answeredAt - b.answeredAt)} // oldest → newest; invert to show newest first
            />
          </div>
        </div>
      </div>
    </div>
  );
}

