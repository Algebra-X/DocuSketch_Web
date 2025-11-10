// Core types for the question engine

export type FactValue = string | number | boolean | "__UNKNOWN__";

export interface ClusterRule {
  cluster_id: string;
  room_type?: string;
  requires?: Record<string, FactValue[]>;
  excludes?: Record<string, FactValue[]>;
  indicates?: Record<string, FactValue[]>;
}

export interface QuestionSpec {
  fact_id: string;
  prompt?: string;
  options?: FactValue[];
  option_labels?: string[];
  type?: "single_choice" | "boolean";
}

export interface QuestionBank {
  version?: string;
  taxonomy?: string;
  questions: Record<string, QuestionSpec>;
}

export interface Answer {
  factId: string;
  value: FactValue;
}

export interface NextQuestion {
  factId: string;
  prompt: string;
  options: Array<{ label: string; value: FactValue }>;
  // Optional: where this question originated from
  // 'carrier' -> asked due to carrier-specific policy shims (Phase A)
  // 'normal'  -> regular entropy-based selection
  origin?: "carrier" | "normal";
}

export interface Candidate {
  id: string;
  p: number;
  evidence?: "+" | "-" | "·" | "?";
}

// Auto-generated cluster catalog (UI metadata)
export interface AutoCluster {
  cluster_id: string;
  description?: string;
  core_item_codes: string[];
  room_type?: string;
}

export type ClusterNames = Record<
  string,
  {
    name: string;
    summary?: string;
  }
>;

export interface EngineState {
  candidates: Candidate[];
  nextQuestion: NextQuestion | null;
  stop: {
    shouldStop: boolean;
    reason?: "count" | "mass" | "exhausted";
  };
  metrics?: {
    topKMass?: number;
    candidatesCount: number;
  };
}

export interface EngineConfig {
  room: string;
  stopAt?: number;
  topk?: number;
  tau?: number;
  carrierGroup?: number;
  province?: number;
}

