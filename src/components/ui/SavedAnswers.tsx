// src/components/ui/SavedAnswers.tsx
"use client";
import React from "react";

export type Question = {
  id: string;
  title: string;
  subtitle?: string;
  options: string[];
};

type AnswerMap = Record<string, string>;

type Props = {
  questions: Question[];
  answers: AnswerMap; // { [questionId]: chosenOption }
};

export default function SavedAnswers({ questions, answers }: Props) {
  const answeredList = questions
    .map((q, idx) => ({
      index: idx + 1,
      id: q.id,
      title: q.title,
      answer: answers[q.id],
    }))
    .filter((x) => typeof x.answer === "string" && x.answer.length > 0);

  return (
    <div className="rounded-2xl ring-1 ring-black/5 bg-yellow-100 p-4 h-full max-h-[50vh] flex flex-col">
      <div className="text-sm font-semibold text-neutral-800">
        Saved answers
      </div>

      {answeredList.length === 0 ? (
        <div className="mt-2 text-sm text-neutral-700">
          No answers yet. Select a room and answer the questions.
        </div>
      ) : (
        <div className="mt-2 flex-1 overflow-auto pr-1">
          <ul className="space-y-4">
            {answeredList.map((item) => (
              <li key={item.id} className="text-sm">
                <div className="font-semibold text-neutral-800">
                  Question {item.index}
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
