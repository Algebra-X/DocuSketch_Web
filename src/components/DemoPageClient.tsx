"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// ---- Типы ----
type RoomId = "bathroom" | "kitchen" | "living" | "bedroom";

type Question = {
  id: string;
  title: string;
  subtitle?: string;
  options: string[];
};

// ---- Моки ----
const ROOMS: Record<RoomId, { label: string; image: string }> = {
  bathroom: { label: "Bathroom", image: "/vanna1.jpg" },
  kitchen:  { label: "Kitchen",  image: "/kuhnya-eterno-790-1.jpg" },
  living:   { label: "Living Room", image: "/gostinaya-20-1.jpg" },
  bedroom:  { label: "Bedroom", image: "/spalnya-123-1.jpg" },
};

const QUESTIONS_BY_ROOM: Partial<Record<RoomId, Question[]>> = {
  bathroom: [
    {
      id: "q1",
      title: "Your bathroom was destroyed by a nuclear explosion?",
      subtitle: "You can choose one option",
      options: ["Yes", "No", "Maybe🤔", "More likely yes than no", "More likely no than yes"],
    },
    {
      id: "q2",
      title: "Was your bathroom destroyed by a 100 person party?",
      subtitle: "You can choose one option",
      options: ["Yes", "No", "Maybe", "There were only 15 people there"],
    },
  ],
  kitchen: [
    { id: "q1", title: "Кухня: планировка", options: ["Линейная", "Угловая", "Остров", "П-образная"] },
  ],
};

// ---- Атомы ----
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

// ---- Вопрос (скролл только при >4 опциях) ----
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

// ---- Контент: сетка комнат (без собственного вертикального центрирования) ----
const RoomGrid: React.FC<{ onPick: (room: RoomId) => void }> = ({ onPick }) => (
  <div className="w-full max-w-[560px] mx-auto">
    <h3 className="text-center text-sm font-semibold text-neutral-800 mb-4">
      Please select the room you are in
    </h3>
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
          <div className="px-3 py-2 text-center text-sm font-medium text-neutral-700">
            {ROOMS[id].label}
          </div>
        </button>
      ))}
    </div>
  </div>
);

// ---- Контент: экран вопроса ----
const QuestionScreen: React.FC<{
  question: Question | null;
  onAnswer: (qId: string, val: string) => void;
}> = ({ question, onAnswer }) => (
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
        <motion.div
          key="done"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-neutral-600"
        >
          Done! No more questions
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// ---- Общий «телефонный» фрейм ----
const PhoneShell: React.FC<{
  room: RoomId | null;
  progress: number;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ room, progress, onClose, children }) => {
  const title = room ? ROOMS[room].label : "Please select the room you are in";
  const showImage = Boolean(room);

  return (
    <div className="mx-auto w-[320px] sm:w-[360px]">
      <div className="relative rounded-[36px] bg-neutral-900/5 p-2 shadow-xl ring-1 ring-black/10">
        <div className="rounded-[32px] bg-white min-h-[640px] flex flex-col">
          {/* Фото: 0px для выбора, 176px для вопросов */}
          <motion.div
            initial={false}
            animate={{ height: showImage ? 176 : 0 }}
            className="overflow-hidden rounded-t-[32px]"
          >
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

          {/* Шапка + прогресс: только когда выбрана комната */}
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

          {/* Контентная зона: центрируем children, когда комната не выбрана */}
          <div
            className={`px-4 pb-5 flex-1 ${
              !showImage ? "flex items-center justify-center" : ""
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- Правые панели-заглушки (опционально) ----
const TopPanel: React.FC = () => (
  <Card className="p-4">
    <div className="flex flex-col gap-4">
      <div className="h-48 overflow-y-auto rounded-xl bg-neutral-200 p-4 text-center text-sm text-neutral-600">
        <div className="mx-auto max-w-prose space-y-3 text-left">
          <p>There should be data from the API here.</p>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.</p>
          <p>Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi.</p>
        </div>
      </div>
      <div className="rounded-xl bg-yellow-300 p-6 text-center text-sm font-medium text-neutral-800">Text</div>
    </div>
  </Card>
);

const BottomPanel: React.FC = () => (
  <Card className="p-4">
    <div className="rounded-xl bg-yellow-100 p-10 text-center text-sm font-medium text-neutral-700">Text</div>
  </Card>
);

// ---- Главный модульный компонент ----
export default function SurveyClient({ initialRoom }: { initialRoom?: RoomId }) {
  const [room, setRoom] = React.useState<RoomId | null>(initialRoom ?? null);

  const allQuestions = React.useMemo<Question[]>(
    () => (room ? QUESTIONS_BY_ROOM[room] ?? [] : []),
    [room]
  );
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // если нет вопросов — показываем 100% (готово)
  const progress = allQuestions.length
    ? Math.round((currentIndex / allQuestions.length) * 100)
    : 100;

  const currentQuestion = allQuestions[currentIndex] ?? null;

  const handlePickRoom = (r: RoomId) => {
    setRoom(r);
    setCurrentIndex(0);
  };

  const handleAnswer = (_qId: string, _val: string) => {
    setCurrentIndex((i) => Math.min(i + 1, allQuestions.length));
  };

  const handleClose = () => {
    setRoom(null);
    setCurrentIndex(0);
  };

  return (
    <div className="min-h-screen w-full bg-neutral-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* Левый столбец: один телефонный фрейм, внутри меняем контент */}
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

          {/* Правый столбец: заглушки (можно убрать) */}
          <div className="grid gap-6">
            <TopPanel />
            <BottomPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
