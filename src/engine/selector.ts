// Core question engine logic (TypeScript port)

import type {
  ClusterRule,
  QuestionBank,
  Answer,
  NextQuestion,
  Candidate,
  EngineState,
  EngineConfig,
  FactValue,
} from "./types";
import { normalizeValue, isUnknown, evidenceSymbol, computeEntropy } from "./utils";

// Default configuration constants
const LR_POS = 3.0;
const LR_NEG = 0.6;
const LR_UNKNOWN = 1.0;
const REL_THRESH = 0.05;
const ABS_THRESH = 1e-4;
const DEFAULT_STOP_AT = 1;
const DEFAULT_TOPK = 1;
const DEFAULT_TAU = 0.85;

export class Selector {
  private clusters: ClusterRule[] = [];
  private candidateClusterIds: string[] = [];
  private factsKnown: Record<string, FactValue> = {};
  private questionsAsked: string[] = [];
  private posteriorOverClusters: Record<string, number> = {};
  private factToClusters: Record<string, { requires: Set<string>; excludes: Set<string>; indicates: Set<string> }> = {};
  private questionBank: QuestionBank | null = null;
  private roomType: string;
  private config: EngineConfig;
  private policyShims: any | null = null;
  private roomPriors: Record<string, number> | null = null;

  constructor(room: string, config: Partial<EngineConfig> = {}) {
    this.roomType = room;
    this.config = {
      room,
      stopAt: config.stopAt ?? DEFAULT_STOP_AT,
      topk: config.topk ?? DEFAULT_TOPK,
      tau: config.tau ?? DEFAULT_TAU,
      carrierGroup: config.carrierGroup,
      province: config.province,
    };
  }

  async initialize(
    clusters: ClusterRule[],
    questionBank: QuestionBank,
    opts?: { policyShims?: any; roomPriors?: Record<string, number> }
  ): Promise<void> {
    this.clusters = clusters;
    this.questionBank = questionBank;
    this.policyShims = opts?.policyShims || null;
    this.roomPriors = opts?.roomPriors || null;

    // Filter by room type (case-insensitive)
    const roomNorm = this.roomType.trim().toLowerCase();
    if (roomNorm) {
      this.clusters = this.clusters.filter((c) => {
        const rt = (c.room_type || "").trim().toLowerCase();
        return !rt || rt === roomNorm;
      });
    }

    // Filter out clusters without indicates
    this.clusters = this.clusters.filter((c) => {
      const ind = c.indicates || {};
      return Object.keys(ind).length > 0;
    });

    this.candidateClusterIds = this.clusters.map((c) => c.cluster_id).filter(Boolean) as string[];

    // Build fact index
    this._buildFactIndex();

    // Initialize uniform prior
    this._resetPosterior();
  }

  private _buildFactIndex(): void {
    this.factToClusters = {};
    for (const c of this.clusters) {
      const cid = c.cluster_id;
      if (!cid) continue;

      for (const key of ["requires", "excludes", "indicates"] as const) {
        const mapping = c[key] || {};
        for (const factId of Object.keys(mapping)) {
          if (!this.factToClusters[factId]) {
            this.factToClusters[factId] = {
              requires: new Set(),
              excludes: new Set(),
              indicates: new Set(),
            };
          }
          this.factToClusters[factId][key].add(cid);
        }
      }
    }
  }

  private _resetPosterior(): void {
    // If room priors provided, use them (restricted to remaining candidates and renormalized). Else uniform.
    const pri: Record<string, number> = {};
    if (this.roomPriors && Object.keys(this.roomPriors).length > 0) {
      let total = 0.0;
      for (const cid of this.candidateClusterIds) {
        const p = this.roomPriors[cid] || 0.0;
        if (p > 0) {
          pri[cid] = p;
          total += p;
        }
      }
      if (total > 0) {
        for (const cid of Object.keys(pri)) {
          pri[cid] = pri[cid] / total;
        }
        this.posteriorOverClusters = pri;
        return;
      }
    }
    {
      const n = Math.max(1, this.candidateClusterIds.length);
      const uniform = 1.0 / n;
      this.posteriorOverClusters = {};
      for (const cid of this.candidateClusterIds) {
        this.posteriorOverClusters[cid] = uniform;
      }
    }
  }

  private _frontierFactIds(): Set<string> {
    const remaining = new Set(this.candidateClusterIds);
    const frontier = new Set<string>();

    for (const [factId, buckets] of Object.entries(this.factToClusters)) {
      const mentioned =
        (buckets.requires && Array.from(buckets.requires).some((cid) => remaining.has(cid))) ||
        (buckets.excludes && Array.from(buckets.excludes).some((cid) => remaining.has(cid))) ||
        (buckets.indicates && Array.from(buckets.indicates).some((cid) => remaining.has(cid)));

      if (mentioned) {
        frontier.add(factId);
      }
    }

    // Exclude already known/asked
    for (const factId of Object.keys(this.factsKnown)) {
      frontier.delete(factId);
    }
    for (const factId of this.questionsAsked) {
      frontier.delete(factId);
    }

    return frontier;
  }

  private _clusterCompatible(cluster: ClusterRule, facts: Record<string, FactValue>): boolean {
    // Check requires
    const req = cluster.requires || {};
    for (const [factId, allowed] of Object.entries(req)) {
      if (factId in facts) {
        const val = facts[factId];
        if (isUnknown(val)) continue;
        const allowedList = Array.isArray(allowed) ? allowed : [allowed];
        if (!allowedList.includes(val)) {
          return false;
        }
      }
    }

    // Check excludes
    const exc = cluster.excludes || {};
    for (const [factId, banned] of Object.entries(exc)) {
      if (factId in facts) {
        const val = facts[factId];
        if (isUnknown(val)) continue;
        const bannedList = Array.isArray(banned) ? banned : [banned];
        if (bannedList.includes(val)) {
          return false;
        }
      }
    }

    return true;
  }

  private _recomputeCandidates(): void {
    const remaining: string[] = [];
    for (const c of this.clusters) {
      const cid = c.cluster_id;
      if (cid && this._clusterCompatible(c, this.factsKnown)) {
        remaining.push(cid);
      }
    }
    this.candidateClusterIds = remaining;
  }

  private _bayesLR(cluster: ClusterRule, factId: string, value: FactValue): number {
    if (isUnknown(value)) {
      return LR_UNKNOWN;
    }

    const indicatesMap = cluster.indicates || {};
    if (!indicatesMap[factId]) {
      return 1.0;
    }

    const allowedRaw = indicatesMap[factId];
    const allowedList = Array.isArray(allowedRaw) ? allowedRaw : [allowedRaw];
    const allowedNorm = allowedList.map(normalizeValue);
    const normValue = normalizeValue(value);

    return allowedNorm.includes(normValue) ? LR_POS : LR_NEG;
  }

  private _applyBayesUpdate(factId: string, value: FactValue): void {
    if (!this.posteriorOverClusters || Object.keys(this.posteriorOverClusters).length === 0) {
      this._resetPosterior();
    }

    const post: Record<string, number> = { ...this.posteriorOverClusters };
    let total = 0.0;

    for (const c of this.clusters) {
      const cid = c.cluster_id;
      if (!cid) continue;

      const lr = this._bayesLR(c, factId, value);
      post[cid] = (post[cid] || 0.0) * lr;
      total += post[cid];
    }

    if (total <= 0.0) {
      this._resetPosterior();
      return;
    }

    // Normalize
    for (const cid of Object.keys(post)) {
      post[cid] = post[cid] / total;
    }

    this.posteriorOverClusters = post;

    // Prune low-probability clusters
    const maxP = Math.max(...this.candidateClusterIds.map((cid) => this.posteriorOverClusters[cid] || 0));
    const keep: string[] = [];

    for (const cid of this.candidateClusterIds) {
      const p = this.posteriorOverClusters[cid] || 0;
      if (p >= ABS_THRESH && (maxP <= 0 || p / maxP >= REL_THRESH)) {
        keep.push(cid);
      }
    }

    if (keep.length > 0 && keep.length < this.candidateClusterIds.length) {
      this.candidateClusterIds = keep;
    }
  }

  updateWithAnswer(factId: string, answer: FactValue): void {
    const value = normalizeValue(answer);
    this.factsKnown[factId] = value;
    if (!this.questionsAsked.includes(factId)) {
      this.questionsAsked.push(factId);
    }

    this._recomputeCandidates();
    this._applyBayesUpdate(factId, value);
  }

  currentPriorOverCandidates(): Record<string, number> {
    const filtered: Record<string, number> = {};
    let total = 0.0;

    for (const cid of this.candidateClusterIds) {
      const p = this.posteriorOverClusters[cid] || 0;
      filtered[cid] = p;
      total += p;
    }

    if (total <= 0.0) {
      const n = Math.max(1, this.candidateClusterIds.length);
      return Object.fromEntries(this.candidateClusterIds.map((cid) => [cid, 1.0 / n]));
    }

    return Object.fromEntries(
      Object.entries(filtered).map(([cid, p]) => [cid, p / total])
    );
  }

  selectNextQuestion(): NextQuestion | null {
    // Phase A: only if a carrier is selected AND policy shims exist.
    // This meets the requirement: do not use general/global must-asks; only apply when carrier is chosen.
    const frontierPhase = this._frontierFactIds();
    if (this.config.carrierGroup != null && this.policyShims) {
      try {
        const carrierKey = `carrier:${parseInt(String(this.config.carrierGroup), 10)}`;
        const rtUpper = this.roomType.trim().toUpperCase();
        const must: string[] =
          (this.policyShims?.[carrierKey]?.[rtUpper]?.must_asks as string[]) || [];
        if (Array.isArray(must) && must.length > 0) {
          for (const factId of must) {
            // ask if not answered/asked yet and relevant to current frontier
            if (
              !this.questionsAsked.includes(factId) &&
              !(factId in this.factsKnown) &&
              frontierPhase.has(factId)
            ) {
              // Build NextQuestion for this fact id
              const q = this._buildNextQuestionForFact(factId, "carrier");
              if (q) {
                return q;
              }
            }
          }
        }
      } catch {
        // ignore must-asks if malformed
      }
    }

    const frontier = this._frontierFactIds();
    if (frontier.size === 0) {
      return null;
    }

    // Get question specs from bank
    const qbank = this.questionBank?.questions || {};
    const frontierArray = Array.from(frontier);

    // Score each fact by entropy (disagreement among candidates)
    const scores: Array<{ factId: string; entropy: number }> = [];

    for (const factId of frontierArray) {
      const spec = qbank[factId];

      // Collect options from question bank or infer from indicates
      let options: FactValue[] = spec?.options || [];
      if (options.length === 0) {
        // Infer from indicates: collect all values mentioned for this fact
        const seen = new Set<FactValue>();
        for (const c of this.clusters) {
          if (!this.candidateClusterIds.includes(c.cluster_id)) continue;
          const ind = c.indicates?.[factId];
          if (ind) {
            const list = Array.isArray(ind) ? ind : [ind];
            for (const v of list) {
              seen.add(v);
            }
          }
        }
        options = Array.from(seen);
      }

      if (options.length === 0) continue;

      // Compute probability distribution over options based on candidate posteriors
      const prior = this.currentPriorOverCandidates();
      const optionProbs: number[] = [];

      for (const opt of options) {
        let prob = 0.0;
        for (const c of this.clusters) {
          const cid = c.cluster_id;
          if (!cid || !this.candidateClusterIds.includes(cid)) continue;
          const ind = c.indicates?.[factId];
          if (ind) {
            const list = Array.isArray(ind) ? ind : [ind];
            const normList = list.map(normalizeValue);
            if (normList.includes(normalizeValue(opt))) {
              prob += prior[cid] || 0;
            }
          }
        }
        optionProbs.push(prob);
      }

      // Normalize probabilities
      const totalProb = optionProbs.reduce((a, b) => a + b, 0);
      if (totalProb > 0) {
        for (let i = 0; i < optionProbs.length; i++) {
          optionProbs[i] /= totalProb;
        }
      } else {
        // Uniform if no matches
        const uniform = 1.0 / optionProbs.length;
        for (let i = 0; i < optionProbs.length; i++) {
          optionProbs[i] = uniform;
        }
      }

      const entropy = computeEntropy(optionProbs);
      scores.push({ factId, entropy });
    }

    if (scores.length === 0) {
      return null;
    }

    // Pick fact with highest entropy (most disagreement)
    scores.sort((a, b) => b.entropy - a.entropy);
    const bestFactId = scores[0].factId;
    const spec = qbank[bestFactId];

    // Build options with labels
    const optionsRaw = spec?.options || [];
    const labelsRaw = spec?.option_labels || [];
    const options: Array<{ label: string; value: FactValue }> = [];

    for (let i = 0; i < optionsRaw.length; i++) {
      const value = optionsRaw[i];
      const label = labelsRaw[i] || String(value);
      options.push({ label, value });
    }

    // Fallback: if no options in spec, infer from indicates
    if (options.length === 0) {
      const seen = new Set<FactValue>();
      for (const c of this.clusters) {
        if (!this.candidateClusterIds.includes(c.cluster_id)) continue;
        const ind = c.indicates?.[bestFactId];
        if (ind) {
          const list = Array.isArray(ind) ? ind : [ind];
          for (const v of list) {
            seen.add(v);
          }
        }
      }
      for (const v of Array.from(seen)) {
        options.push({ label: String(v), value: v });
      }
    }

    return {
      factId: bestFactId,
      prompt: spec?.prompt || bestFactId,
      options,
      origin: "normal",
    };
  }

  private _buildNextQuestionForFact(factId: string, origin: "carrier" | "normal" = "normal"): NextQuestion | null {
    const qbank = this.questionBank?.questions || {};
    const spec = qbank[factId];
    let optionsRaw: FactValue[] = spec?.options || [];
    let labelsRaw: string[] = spec?.option_labels || [];
    if (optionsRaw.length === 0) {
      // infer from indicates
      const seen = new Set<FactValue>();
      for (const c of this.clusters) {
        if (!this.candidateClusterIds.includes(c.cluster_id)) continue;
        const ind = c.indicates?.[factId];
        if (ind) {
          const list = Array.isArray(ind) ? ind : [ind];
          for (const v of list) {
            seen.add(v);
          }
        }
      }
      optionsRaw = Array.from(seen);
      labelsRaw = [];
    }
    if (optionsRaw.length === 0) {
      return null;
    }
    const options: Array<{ label: string; value: FactValue }> = [];
    for (let i = 0; i < optionsRaw.length; i++) {
      const value = optionsRaw[i];
      const label = labelsRaw[i] || String(value);
      options.push({ label, value });
    }
    return {
      factId,
      prompt: spec?.prompt || factId,
      options,
      origin,
    };
  }

  checkStop(): { shouldStop: boolean; reason?: "count" | "mass" | "exhausted" } {
    // Stop by count
    if (this.candidateClusterIds.length <= this.config.stopAt!) {
      return { shouldStop: true, reason: "count" };
    }

    // Stop by mass
    if (this.config.topk! > 0 && this.config.tau! > 0) {
      const prior = this.currentPriorOverCandidates();
      const probs = Object.values(prior).sort((a, b) => b - a);
      const topK = probs.slice(0, this.config.topk!);
      const mass = topK.reduce((a, b) => a + b, 0);
      if (mass >= this.config.tau!) {
        return { shouldStop: true, reason: "mass" };
      }
    }

    // Check if exhausted (no more questions)
    const frontier = this._frontierFactIds();
    if (frontier.size === 0) {
      return { shouldStop: true, reason: "exhausted" };
    }

    return { shouldStop: false };
  }

  getState(lastAnswer?: Answer): EngineState {
    const prior = this.currentPriorOverCandidates();
    const candidates: Candidate[] = [];

    for (const cid of this.candidateClusterIds) {
      const p = prior[cid] || 0;
      let evidence: "+" | "-" | "·" | "?" | undefined;
      if (lastAnswer) {
        const cluster = this.clusters.find((c) => c.cluster_id === cid);
        if (cluster) {
          evidence = evidenceSymbol(cluster.indicates || {}, lastAnswer.factId, lastAnswer.value);
        }
      }
      candidates.push({ id: cid, p, evidence });
    }

    // Sort by probability descending
    candidates.sort((a, b) => b.p - a.p);

    const nextQuestion = this.selectNextQuestion();
    const stop = this.checkStop();

    // Compute top-K mass for metrics
    let topKMass: number | undefined;
    if (this.config.topk! > 0) {
      const probs = candidates.map((c) => c.p).slice(0, this.config.topk!);
      topKMass = probs.reduce((a, b) => a + b, 0);
    }

    return {
      candidates,
      nextQuestion,
      stop,
      metrics: {
        topKMass,
        candidatesCount: this.candidateClusterIds.length,
      },
    };
  }

  reset(): void {
    this.factsKnown = {};
    this.questionsAsked = [];
    this.candidateClusterIds = this.clusters.map((c) => c.cluster_id).filter(Boolean) as string[];
    this._resetPosterior();
  }

  /**
   * Determines the phase of a fact/question.
   * Phase A (carrier): facts used in requires/excludes (for filtering clusters)
   * Phase B (cluster): facts only used in indicates (for distinguishing clusters)
   */
  getFactPhase(factId: string): "A" | "B" | undefined {
    const buckets = this.factToClusters[factId];
    if (!buckets) return undefined;

    const hasRequiresOrExcludes = buckets.requires.size > 0 || buckets.excludes.size > 0;
    const hasIndicates = buckets.indicates.size > 0;

    // If fact appears in requires/excludes, it's Phase A (carrier filtering)
    if (hasRequiresOrExcludes) {
      return "A";
    }
    // If fact only appears in indicates, it's Phase B (cluster distinction)
    if (hasIndicates) {
      return "B";
    }

    return undefined;
  }
}

