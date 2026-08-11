import { z } from 'zod';
import { analyzeMarketplaceProduct } from '@/lib/marketplaces/adapters';
import { jsonError, jsonOk } from '@/lib/api';
const schema = z.object({ url: z.string().min(8).max(2048) });
export async function POST(request: Request) { try { const body = schema.parse(await request.json()); const product = await analyzeMarketplaceProduct(body.url); return jsonOk(product); } catch (error) { return jsonError(error instanceof Error ? error.message : 'Could not analyze product URL.', 400); } }
