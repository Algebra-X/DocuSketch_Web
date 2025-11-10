"use client";

import React from "react";
import type { Answer, NextQuestion } from "@/engine/types";

interface TranscriptPanelProps {
  transcript: Array<{ question: NextQuestion; answer: Answer }>;
}

export default function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">Answered Questions</h2>
      {transcript.length === 0 ? (
        <p className="text-gray-500 text-sm">No questions answered yet.</p>
      ) : (
        <div className="space-y-3">
          {transcript.map((item, idx) => {
            const answerLabel =
              item.answer.value === "__UNKNOWN__"
                ? "Unknown"
                : item.question.options.find((opt) => opt.value === item.answer.value)?.label ||
                  String(item.answer.value);

            return (
              <div key={idx} className="border-l-4 border-blue-500 pl-3 py-2">
                <p className="text-sm font-medium text-gray-800 mb-1">{item.question.prompt}</p>
                <p className="text-xs text-gray-600">
                  Answer: <span className="font-semibold">{answerLabel}</span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

