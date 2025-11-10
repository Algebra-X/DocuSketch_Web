"use client";

import React from "react";
import type { NextQuestion } from "@/engine/types";
import Button from "@/components/ui/CustomButton";

interface QuestionCardProps {
  question: NextQuestion | null;
  onAnswer: (value: string | number | boolean | "__UNKNOWN__") => void;
  onReset: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  progress?: number;
  isStopped: boolean;
}

export default function QuestionCard({
  question,
  onAnswer,
  onReset,
  onUndo,
  canUndo,
  progress,
  isStopped,
}: QuestionCardProps) {
  if (isStopped) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Question Flow Complete</h2>
        <p className="text-gray-600 mb-4">
          The engine has converged on the best candidate cluster(s).
        </p>
        <Button text="Start Over" onClick={onReset} hoverColor="blue" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Loading...</h2>
        <p className="text-gray-600">Preparing the next question...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2 text-gray-800">{question.prompt}</h2>
        {progress !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress to finish</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => onAnswer(option.value)}
            className="w-full py-3 px-4 text-left rounded-lg border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-gray-800"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onAnswer("__UNKNOWN__")}
          className="flex-1 py-2 px-4 rounded-lg border-2 border-gray-300 hover:border-gray-500 hover:bg-gray-50 transition-all duration-200 text-gray-700"
        >
          Unknown
        </button>
        {onUndo && canUndo && (
          <button
            onClick={onUndo}
            className="px-4 py-2 rounded-lg border-2 border-orange-300 hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 text-orange-700"
          >
            Undo
          </button>
        )}
        <button
          onClick={onReset}
          className="px-4 py-2 rounded-lg border-2 border-red-300 hover:border-red-500 hover:bg-red-50 transition-all duration-200 text-red-700"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

