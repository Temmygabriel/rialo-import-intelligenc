import { estimateCosts } from '@/lib/costs/estimator';
import { db } from '@/lib/db/memory';
import { jsonError, jsonOk } from '@/lib/api';
export async function POST(request: Request) { try { const estimate = estimateCosts(await request.json()); db.saveEstimate(estimate); return jsonOk(estimate); } catch (error) { return jsonError(error instanceof Error ? error.message : 'Could not create estimate.', 400); } }
