import { z } from 'zod';
import { db } from '@/lib/db/memory';
import { getRialoAdapter } from '@/lib/rialo/adapter';
import { transitionProcurement } from '@/lib/procurement/state-machine';
import { jsonError, jsonOk } from '@/lib/api';

const schema = z.object({
  newState: z.enum(['DRAFT','QUOTE_CREATED','SUPPLIER_SELECTED','PROCUREMENT_STARTED','WAREHOUSE_PENDING','WAREHOUSE_RECEIVED','QC_PENDING','QC_PASSED','QC_FAILED','SHIPPING_PENDING','SHIPPING_BOOKED','IN_TRANSIT','ARRIVED_NIGERIA','DELIVERY_PENDING','COMPLETED','CANCELLED']),
  type: z.string().default('STATE_TRANSITION'),
  data: z.record(z.unknown()).default({}),
  verified: z.boolean().default(false)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const current = db.getProcurement(id);
    if (!current) return jsonError('Procurement not found.', 404);
    const body = schema.parse(await request.json());
    const updated = transitionProcurement(current, body.newState, body.type, body.data, body.verified);
    const event = updated.events.at(-1)!;
    await getRialoAdapter().recordProcurementEvent({
      procurementId: id,
      eventId: event.id,
      type: event.type,
      previousState: event.previousState,
      newState: event.newState,
      data: event.data,
      timestamp: event.timestamp,
    });
    db.saveProcurement(updated);
    return jsonOk(updated);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Could not record procurement event.', 400);
  }
}