// src/components/ui/SavedAnswers.tsx
"use client";
import React from "react";

export type AnswerEntry = {
  id: string;
  title: string;      // snapshot заголовка на момент ответа
  answer: string;     // выбранный вариант (label)
  value: string | number | boolean | "__UNKNOWN__"; // actual answer value for undo
  answeredAt: number; // timestamp (для сортировки по времени)
  phase?: "A" | "B";  // Phase A: carrier facts, Phase B: cluster distinction
};

type Props = {
  items: AnswerEntry[]; // уже отсортируем как нужно в родителе, но можно и здесь
  onUndo?: () => void;
  canUndo?: boolean;
};

export default function SavedAnswers({ items, onUndo, canUndo }: Props) {
  const hasItems = items.length > 0;

  return (
    <div className="rounded-2xl ring-1 ring-black/5 bg-yellow-100 p-4 h-full max-h-[50vh] flex flex-col">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-neutral-800">Saved answers</div>
        {onUndo && canUndo && (
          <button
            onClick={onUndo}
            className="px-3 py-1 rounded-lg bg-neutral-200 hover:bg-neutral-300 text-xs font-medium text-neutral-700 transition-colors"
            type="button"
            title="Undo last answer"
          >
            Undo
          </button>
        )}
      </div>

      {!hasItems ? (
        <div className="mt-2 text-sm text-neutral-700">
          No answers yet. Select a room and answer the questions.
        </div>
      ) : (
        <div className="mt-2 flex-1 overflow-auto pr-1">
          <ul className="space-y-4">
            {items.map((item, idx) => (
              <li key={item.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-800">Answer {idx + 1}</span>
                  {item.phase === "A" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                      Carrier
                    </span>
                  )}
                </div>
                <div className="mt-1 text-neutral-800">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-neutral-700"> — {item.answer}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
