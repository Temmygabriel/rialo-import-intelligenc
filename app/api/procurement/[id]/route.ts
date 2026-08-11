import { db } from '@/lib/db/memory';
import { getRialoAdapter } from '@/lib/rialo/adapter';
import { jsonError, jsonOk } from '@/lib/api';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const procurement = db.getProcurement(id); if (!procurement) return jsonError('Procurement not found.', 404); const workflow = procurement.rialoWorkflowId ? await getRialoAdapter().getWorkflowStatus(procurement.rialoWorkflowId) : undefined; return jsonOk({ ...procurement, workflow }); }
