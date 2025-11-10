"use client";
import React from "react";

export type RoomId = string;

export type Question = {
  id: string;
  title: string;
  subtitle?: string;
  options: string[];
};

type Props = {
  room: RoomId | null;
  questions: Question[];
  currentIndex: number;
  currentQuestion: Question | null;
};

const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({
  className = "",
  children,
}) => (
  <div className={`rounded-2xl bg-white shadow-sm ring-1 ring-black/5 ${className}`}>
    {children}
  </div>
);

export default function QuestionRang({
  room,
  questions,
  currentIndex,
  currentQuestion,
}: Props) {
  const hasRoom = room != null && questions.length > 0;

  // текущий и все следующие
  const start = Math.min(currentIndex, Math.max(questions.length, 0));
  const remaining = hasRoom ? questions.slice(start) : [];

  // индекс "следующего" глобально
  const hasNext = currentIndex + 1 < questions.length;
  const nextGlobalIndex = hasNext ? currentIndex + 1 : -1;

  return (
    <Card className="p-4 h-full">
      <div className="flex h-full flex-col gap-4">
        {/* 80% — серый блок со списком (только текущий и следующие) */}
        <div className="flex-[4] overflow-y-auto rounded-xl bg-neutral-200 p-4">
          {!hasRoom ? (
            <div className="text-sm text-neutral-600">
              Select a room to see questions here.
            </div>
          ) : remaining.length === 0 ? (
            <div className="text-sm text-neutral-600">No questions remaining.</div>
          ) : (
            <ul className="space-y-2">
              {remaining.map((q, i) => {
                const iGlobal = currentIndex + i;
                const isCurrent = iGlobal === currentIndex;

                // %: текущий 100, следующий 75, остальные 25
                const rating =
                  isCurrent ? 1.0 : iGlobal === nextGlobalIndex ? 0.75 : 0.25;
                const ratingLabel = `${Math.round(rating * 100)}%`;

                return (
                  <li
                    key={q.id}
                    className={`flex items-center justify-between rounded-lg border border-black/5 bg-white/70 px-3 py-2 ${
                      isCurrent ? "opacity-60" : ""
                    }`}
                    title={q.title}
                  >
                    <span className="truncate text-sm font-medium text-neutral-800">
                      {q.title}
                    </span>
                    <span className="ml-3 inline-flex min-w-[3.25rem] items-center justify-center rounded-md bg-neutral-900/10 px-2 py-1 text-xs font-semibold text-neutral-700">
                      {ratingLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 20% — жёлтая полоса с актуальным вопросом */}
        <div className="flex-[1] rounded-xl bg-yellow-300 grid place-items-center text-center text-sm font-medium text-neutral-800 px-4">
          {currentQuestion ? currentQuestion.title : "Please select the room you are in"}
        </div>
      </div>
    </Card>
  );
}
