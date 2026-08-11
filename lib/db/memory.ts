import { CostEstimate, Procurement } from '@/lib/types';
const estimates = new Map<string, CostEstimate>();
const procurements = new Map<string, Procurement>();
export const db = { saveEstimate(e: CostEstimate) { estimates.set(e.id, e); return e; }, getEstimate(id: string) { return estimates.get(id); }, saveProcurement(p: Procurement) { procurements.set(p.id, p); return p; }, getProcurement(id: string) { return procurements.get(id); } };
