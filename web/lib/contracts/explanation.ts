// CP-2 Frozen Explanation JSON Schema
// Feeds the Evidence Drawer

import type { HumanAction } from './contractB';

export type CandidateScore = {
  doc_id: string;
  score: number;
  why: string;
};

export type ExplanationDetails = {
  item_id: string;
  model_tier: 'ultra' | 'nano';
  tokens?: number;
  latency_ms?: number;
  explanation: string;
  missing_evidence: string[];
  candidate_scores: CandidateScore[];
  recommended_action: HumanAction;
  confidence: number;
  citations: string[];
};
