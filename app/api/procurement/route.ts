import { z } from 'zod';

import { db } from '@/lib/db/memory';
import { getRialoAdapter } from '@/lib/rialo/adapter';
import { Procurement } from '@/lib/types';
import { jsonError, jsonOk } from '@/lib/api';

const schema = z.object({
  estimateId: z.string().min(4),
  selectedMode: z.enum(['SEA', 'AIR']).optional(),
});

export async function POST(request: Request) {
  try {
    const { estimateId, selectedMode } = schema.parse(
      await request.json(),
    );

    const estimate = db.getEstimate(estimateId);

    if (!estimate) {
      return jsonError(
        'Estimate not found. Create a cost estimate before starting procurement.',
        404,
      );
    }

    const now = new Date().toISOString();
    const procurementId = `pr_${crypto.randomUUID()}`;
    const eventId = `evt_${crypto.randomUUID()}`;

    const mode = selectedMode ?? estimate.recommendedMode;
    const option = mode === 'SEA' ? estimate.sea : estimate.air;

    const rialo = getRialoAdapter();

    const workflow = await rialo.createProcurementWorkflow({
      procurementId,
    });

    const eventData: Record<string, unknown> = {
      estimateId,
      selectedMode: mode,
      note: `Procurement created with Rialo adapter status: ${workflow.status}.`,
    };

    const rialoEvent = await rialo.recordProcurementEvent({
      procurementId,
      eventId,
      type: 'QUOTE_CREATED',
      previousState: 'DRAFT',
      newState: 'QUOTE_CREATED',
      data: eventData,
      timestamp: now,
    });

    const procurement: Procurement = {
      id: procurementId,
      estimateId,
      state: 'QUOTE_CREATED',
      productName: estimate.product.name,
      destination: estimate.destination,
      selectedMode: mode,
      totalLow: option.totalLow,
      totalHigh: option.totalHigh,
      currency: 'NGN',

      rialoWorkflowId: workflow.workflowId,
      rialoStatus: workflow.status,

      createdAt: now,
      updatedAt: now,

      events: [
        {
          id: eventId,
          procurementId,
          type: 'QUOTE_CREATED',
          previousState: 'DRAFT',
          newState: 'QUOTE_CREATED',

          data: {
            ...eventData,

            rialoCommitmentId: rialoEvent.id,
            rialoEventHash: rialoEvent.eventHash,
            rialoNetwork: rialoEvent.network,
            rialoRecordedAt: rialoEvent.recordedAt,
          },

          timestamp: now,

          // This is a cryptographic commitment, not yet an
          // on-chain verification. Do not mark it verified.
          verified: false,
        },
      ],
    };

    db.saveProcurement(procurement);

    return jsonOk(procurement, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : 'Could not create procurement.',
      400,
    );
  }
}