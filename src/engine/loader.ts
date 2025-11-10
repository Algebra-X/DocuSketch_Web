// Load and parse engine artifacts (YAML/JSON)

import { parse as parseYaml } from "yaml";
import type { ClusterRule, QuestionBank, AutoCluster, ClusterNames } from "./types";

export async function loadClusterRules(): Promise<ClusterRule[]> {
  try {
    const response = await fetch("/engine_assets/config/cluster_rules.yaml");
    if (!response.ok) {
      throw new Error(`Failed to load cluster_rules.yaml: ${response.statusText}`);
    }
    const text = await response.text();
    const data = parseYaml(text);
    if (!Array.isArray(data)) {
      throw new Error("cluster_rules.yaml must be an array");
    }
    return data as ClusterRule[];
  } catch (error) {
    console.error("Error loading cluster_rules.yaml:", error);
    throw error;
  }
}

export async function loadQuestionBank(): Promise<QuestionBank> {
  try {
    const response = await fetch("/engine_assets/ontology/fact_questions.json");
    if (!response.ok) {
      throw new Error(`Failed to load fact_questions.json: ${response.statusText}`);
    }
    const data = await response.json();
    return data as QuestionBank;
  } catch (error) {
    console.error("Error loading fact_questions.json:", error);
    throw error;
  }
}

export async function loadPolicyShims(): Promise<any> {
  try {
    const response = await fetch("/engine_assets/config/policy_shims.yaml");
    if (!response.ok) {
      // Optional: not fatal
      return {};
    }
    const text = await response.text();
    return parseYaml(text) as any;
  } catch (error) {
    console.warn("Policy shims not loaded:", error);
    return {};
  }
}

export async function loadRoomPriors(): Promise<Record<string, Record<string, number>>> {
  try {
    const response = await fetch("/engine_assets/config/room_priors.yaml");
    if (!response.ok) {
      // Optional: not fatal
      return {};
    }
    const text = await response.text();
    const data = parseYaml(text);
    if (data && typeof data === "object") {
      return data as Record<string, Record<string, number>>;
    }
    return {};
  } catch (error) {
    console.warn("Room priors not loaded:", error);
    return {};
  }
}

/**
 * UI helpers: load auto clusters (with core_item_codes) and cluster display names.
 */
export async function loadAutoClusters(): Promise<AutoCluster[]> {
  const res = await fetch("/engine_assets/config/clusters.yaml");
  if (!res.ok) throw new Error(`Failed to load clusters.yaml: ${res.statusText}`);
  const text = await res.text();
  const data = parseYaml(text);
  if (!Array.isArray(data)) {
    throw new Error("clusters.yaml must be an array");
  }
  // Basic shape guard
  return (data as any[]).map((row) => ({
    cluster_id: String(row.cluster_id),
    description: row.description ? String(row.description) : undefined,
    core_item_codes: Array.isArray(row.core_item_codes) ? row.core_item_codes.map(String) : [],
    room_type: row.room_type ? String(row.room_type) : undefined,
  }));
}

export async function loadClusterNames(): Promise<ClusterNames> {
  const res = await fetch("/engine_assets/config/cluster_names.yaml");
  if (!res.ok) throw new Error(`Failed to load cluster_names.yaml: ${res.statusText}`);
  const text = await res.text();
  const data = parseYaml(text);
  if (!data || typeof data !== "object") {
    throw new Error("cluster_names.yaml must be a mapping");
  }
  const out: ClusterNames = {};
  for (const [key, value] of Object.entries<any>(data as Record<string, any>)) {
    if (value && typeof value === "object") {
      out[key] = {
        name: String(value.name ?? key),
        summary: value.summary ? String(value.summary) : undefined,
      };
    }
  }
  return out;
}

/**
 * Parse CSV (simple, quote-aware) and build SEL -> Description map filtered by CAT=WTR.
 */
export async function loadWTRLineItems(): Promise<Record<string, string>> {
  const res = await fetch("/engine_assets/ontology/WTR-line-items.csv");
  if (!res.ok) throw new Error(`Failed to load WTR-line-items.csv: ${res.statusText}`);
  const csv = await res.text();

  function splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result.map((s) => s.trim());
  }

  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return {};
  const header = splitCsvLine(lines[0]);
  const catIdx = header.findIndex((h) => /xact\s*cat/i.test(h));
  const selIdx = header.findIndex((h) => /xact\s*sel/i.test(h));
  const descIdx = header.findIndex((h) => /xact\s*description/i.test(h));
  if (catIdx < 0 || selIdx < 0 || descIdx < 0) {
    throw new Error("CSV missing required columns: Xact CAT, Xact SEL, Xact Description");
    }

  const map: Record<string, string> = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const cat = cols[catIdx];
    if (cat !== "WTR") continue;
    const sel = cols[selIdx];
    const desc = cols[descIdx];
    if (sel) {
      // Prefer first occurrence; do not overwrite
      if (!(sel in map)) {
        map[sel] = desc || "";
      }
    }
  }
  return map;
}

