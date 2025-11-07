// src/components/ui/SavedAnswers.tsx
"use client";
import React from "react";

export type AnswerEntry = {
  id: string;
  title: string;      // snapshot заголовка на момент ответа
  answer: string;     // выбранный вариант
  answeredAt: number; // timestamp (для сортировки по времени)
};

type Props = {
  items: AnswerEntry[]; // уже отсортируем как нужно в родителе, но можно и здесь
};

export default function SavedAnswers({ items }: Props) {
  const hasItems = items.length > 0;

  return (
    <div className="rounded-2xl ring-1 ring-black/5 bg-yellow-100 p-4 h-full max-h-[50vh] flex flex-col">
      <div className="text-sm font-semibold text-neutral-800">Saved answers</div>

      {!hasItems ? (
        <div className="mt-2 text-sm text-neutral-700">
          No answers yet. Select a room and answer the questions.
        </div>
      ) : (
        <div className="mt-2 flex-1 overflow-auto pr-1">
          <ul className="space-y-4">
            {items.map((item, idx) => (
              <li key={item.id} className="text-sm">
                <div className="font-semibold text-neutral-800">Answer {idx + 1}</div>
                <div className="mt-1 text-neutral-800">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-neutral-700"> — {item.answer}</span>
                </div>
                {/* при желании покажи время:
                <div className="text-xs text-neutral-500">
                  {new Date(item.answeredAt).toLocaleString()}
                </div>
                */}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
