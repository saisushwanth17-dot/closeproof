// Contract B: Evidence and ReconItem (Owner: CP-1)
// Frozen per CloseProof Squad Playbook

export type Evidence = {
  source: string;
  doc_id: string;
  field: string;
  value: string;
  url: string | null;
};

export const HUMAN_ACTIONS = [
  'approve_match',
  'request_receipt',
  'contact_vendor',
  'write_off',
  'escalate_accountant',
] as const;

export type HumanAction = (typeof HUMAN_ACTIONS)[number] | null;

export type ReconItem = {
  id: string;
  amount: number;
  status: 'matched' | 'exception';
  candidates: Evidence[];
  confidence: number;
  explanation: string | null;
  citations: string[];
  human_action: HumanAction;
};

/**
 * Exhaustive human-readable labels for each non-null HumanAction.
 * Using satisfies ensures compile-time exhaustiveness.
 */
export const HUMAN_ACTION_LABELS = {
  approve_match: 'Approve match',
  request_receipt: 'Request receipt',
  contact_vendor: 'Contact vendor',
  write_off: 'Write off',
  escalate_accountant: 'Escalate to accountant',
} as const satisfies Record<(typeof HUMAN_ACTIONS)[number], string>;
