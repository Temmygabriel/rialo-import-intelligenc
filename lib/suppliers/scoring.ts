import { Supplier, SupplierEvidence, SupplierScore } from '@/lib/types';
export function scoreSupplier(evidence: SupplierEvidence[]): SupplierScore { if (evidence.length === 0 || evidence.every((e) => e.status === 'UNKNOWN')) return { score: null, riskLevel: 'UNKNOWN', confidence: 'LOW', explanation: ['Supplier data unavailable; do not treat this as a trustworthy supplier score.'], missingEvidence: ['store age','review quality','transaction signals','supplier type'] };
 let score = 50; const explanation: string[] = []; const missing: string[] = [];
 for (const e of evidence) { if (e.status === 'UNKNOWN') { missing.push(e.label); continue; } if (e.impact === 'positive') { score += 10; explanation.push(`Positive: ${e.label} (${e.value})`); } if (e.impact === 'negative') { score -= 15; explanation.push(`Risk: ${e.label} (${e.value})`); } }
 score = Math.max(0, Math.min(100, score)); return { score, riskLevel: score >= 75 ? 'LOW' : score >= 50 ? 'MEDIUM' : 'HIGH', confidence: missing.length > 2 ? 'MEDIUM' : 'HIGH', explanation, missingEvidence: missing } }
export function analyzeSupplier(supplier: Supplier): Supplier { return { ...supplier, score: scoreSupplier(supplier.evidence) }; }
