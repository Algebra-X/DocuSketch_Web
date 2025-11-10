"use client";

import React, { useState, useEffect } from "react";
import { Selector } from "@/engine/selector";
import { loadClusterRules, loadQuestionBank } from "@/engine/loader";
import type { Answer, NextQuestion, Candidate } from "@/engine/types";
import QuestionCard from "@/components/engine/QuestionCard";
import CandidatesPanel from "@/components/engine/CandidatesPanel";
import TranscriptPanel from "@/components/engine/TranscriptPanel";

export default function EnginePage() {
  const [selector, setSelector] = useState<Selector | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<NextQuestion | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [transcript, setTranscript] = useState<Array<{ question: NextQuestion; answer: Answer }>>(
    []
  );
  const [stop, setStop] = useState({ shouldStop: false, reason: undefined as string | undefined });
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [room, setRoom] = useState("BATHROOM");

  useEffect(() => {
    async function initialize() {
      try {
        setLoading(true);
        setError(null);

        const [clusters, qbank] = await Promise.all([
          loadClusterRules(),
          loadQuestionBank(),
        ]);

        const sel = new Selector(room, {
          stopAt: 1,
          topk: 1,
          tau: 0.85,
        });

        sel.initialize(clusters, qbank);

        setSelector(sel);
        const state = sel.getState();
        setCurrentQuestion(state.nextQuestion);
        setCandidates(state.candidates);
        setStop(state.stop);
        setProgress(state.metrics?.topKMass);

        setLoading(false);
      } catch (err) {
        console.error("Failed to initialize engine:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize engine");
        setLoading(false);
      }
    }

    initialize();
  }, [room]);

  const handleAnswer = (value: string | number | boolean | "__UNKNOWN__") => {
    if (!selector || !currentQuestion) return;

    const answer: Answer = {
      factId: currentQuestion.factId,
      value,
    };

    selector.updateWithAnswer(answer.factId, answer.value);

    const state = selector.getState(answer);
    setCurrentQuestion(state.nextQuestion);
    setCandidates(state.candidates);
    setStop(state.stop);
    setProgress(state.metrics?.topKMass);

    // Add to transcript
    setTranscript((prev) => [...prev, { question: currentQuestion, answer }]);
  };

  const handleUndo = async () => {
    if (!selector || transcript.length === 0) return;

    // Remove last answer from transcript
    const newTranscript = transcript.slice(0, -1);
    setTranscript(newTranscript);

    // Reset selector and reapply all remaining answers
    try {
      setLoading(true);
      const [clusters, qbank] = await Promise.all([
        loadClusterRules(),
        loadQuestionBank(),
      ]);

      const sel = new Selector(room, {
        stopAt: 1,
        topk: 1,
        tau: 0.85,
      });

      sel.initialize(clusters, qbank);

      // Reapply all answers except the last one
      for (const entry of newTranscript) {
        sel.updateWithAnswer(entry.answer.factId, entry.answer.value);
      }

      setSelector(sel);
      const state = sel.getState();
      setCurrentQuestion(state.nextQuestion);
      setCandidates(state.candidates);
      setStop(state.stop);
      setProgress(state.metrics?.topKMass);

      setLoading(false);
    } catch (err) {
      console.error("Failed to undo:", err);
      setError(err instanceof Error ? err.message : "Failed to undo");
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (!selector) return;

    selector.reset();
    const state = selector.getState();
    setCurrentQuestion(state.nextQuestion);
    setCandidates(state.candidates);
    setStop(state.stop);
    setProgress(state.metrics?.topKMass);
    setTranscript([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading question engine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Question Engine</h1>
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600">
              Room Type:
              <select
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="ml-2 px-3 py-1 border border-gray-300 rounded"
                disabled={transcript.length > 0}
              >
                <option value="BATHROOM">Bathroom</option>
                <option value="BASEMENT">Basement</option>
                <option value="KITCHEN">Kitchen</option>
                <option value="LIVING_ROOM">Living Room</option>
                <option value="BEDROOM">Bedroom</option>
              </select>
            </label>
            {stop.shouldStop && (
              <span className="text-sm text-green-600 font-semibold">
                ✓ Stopped ({stop.reason})
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Question Area */}
          <div className="lg:col-span-2">
            <QuestionCard
              question={currentQuestion}
              onAnswer={handleAnswer}
              onReset={handleReset}
              onUndo={handleUndo}
              canUndo={transcript.length > 0}
              progress={progress}
              isStopped={stop.shouldStop}
            />
          </div>

          {/* Side Panels */}
          <div className="lg:col-span-1 space-y-6">
            <div className="h-[400px]">
              <CandidatesPanel candidates={candidates} />
            </div>
            <div className="h-[400px]">
              <TranscriptPanel transcript={transcript} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

