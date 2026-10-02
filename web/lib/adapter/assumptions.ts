/**
 * ASSUMPTION(G-1) through ASSUMPTION(G-8)
 * Documented contract gap assumptions for the CloseProof frontend adapter.
 *
 * These assumptions are isolated in this single module and must be ratified
 * by the squad (Varma, CP-1, CP-2, CP-3) before the payload spec is tagged.
 *
 * See web/CONTRACT_C_PAYLOADS.md for the full proposed specification.
 */

/**
 * ASSUMPTION(G-1): Event payload shapes
 * Proposed in CONTRACT_C_PAYLOADS.md. recon_match and recon_exception
 * payloads carry a full ReconItem (Contract B). feed_ingested carries count.
 * Pending core/telemetry.py inspection and squad vote.
 */
export const G1_PAYLOAD_SPEC = 'proposed' as const;

/**
 * ASSUMPTION(G-2): Run ID resolution
 * The envelope has no run_id field. We resolve run ID from:
 *   1. payload.run_id on feed_ingested (proposed as required)
 *   2. Manifest metadata in replay mode
 * When unavailable, header shows "Run ID unavailable" and live backend
 * export links are disabled. Replay sample downloads remain enabled.
 */
export const G2_RUN_ID = 'payload-or-manifest' as const;

/**
 * ASSUMPTION(G-3): Timestamp normalization
 * ts may be in seconds or milliseconds. Normalized via normalizeTs().
 */
export const G3_TIMESTAMP = 'normalize-in-parser' as const;

/**
 * ASSUMPTION(G-4): Explanation data path
 * explain_done payload carries CP-2 explanation JSON.
 * Stored in explanations[item_id]. Drawer joins ReconItem + explanation.
 * ReconItem is authoritative per Contract B and Product Law 4.
 */
export const G4_EXPLANATION_PATH = 'explain-done-payload' as const;

/**
 * ASSUMPTION(G-5): API run endpoints
 * POST /api/runs and GET /api/runs/{id} are typed but no UI trigger exists.
 */
export const G5_API_RUNS = 'typed-no-ui' as const;

/**
 * ASSUMPTION(G-6): Evidence source vocabulary
 * source is kept as open string. No narrowing in the parser.
 * Citations matching http/https are rendered as external links.
 */
export const G6_EVIDENCE_SOURCE = 'open-string' as const;

/**
 * ASSUMPTION(G-7): Base currency
 * ReconItem has no currency field. Using USD.
 * See constants.ts BASE_CURRENCY.
 */
export const G7_CURRENCY = 'USD' as const;

/**
 * ASSUMPTION(G-8): useTelemetry extension
 * Signature: useTelemetry(url: string, options?: TelemetryOptions)
 * Return shape is strictly additive. Reported to Varma for ratification.
 */
export const G8_HOOK_EXTENSION = 'additive-optional-param' as const;
