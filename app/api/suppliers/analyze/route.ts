import { z } from 'zod';
import { analyzeSupplier } from '@/lib/suppliers/scoring';
import { jsonError, jsonOk } from '@/lib/api';
const schema = z.object({ supplier: z.any() });
export async function POST(request: Request) { try { const { supplier } = schema.parse(await request.json()); return jsonOk(analyzeSupplier(supplier)); } catch (error) { return jsonError(error instanceof Error ? error.message : 'Could not analyze supplier.', 400); } }
