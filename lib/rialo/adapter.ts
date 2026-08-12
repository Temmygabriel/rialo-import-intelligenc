export type RialoConnectionStatus = 'MOCKED' | 'CONNECTED';

export interface RialoAdapter {
  createQuoteSnapshot(input: { estimateId: string; hash: string }): Promise<{ id: string; status: RialoConnectionStatus }>;
  recordProcurementEvent(input: { procurementId: string; eventId: string; type: string }): Promise<{ id: string; status: RialoConnectionStatus }>;
  createProcurementWorkflow(input: { procurementId: string }): Promise<{ workflowId: string; status: RialoConnectionStatus }>;
  getWorkflowStatus(workflowId: string): Promise<{ workflowId: string; status: string; note: string }>;
}

type FetchLike = typeof fetch;

interface RealRialoAdapterOptions {
  rpcUrl: string;
  network?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

const DEFAULT_RIALO_DEVNET_RPC_URL = 'http://devnet.rialo.io:4100';
const DEFAULT_TIMEOUT_MS = 5_000;
const REAL_ADAPTER_VALUES = new Set(['real', 'devnet']);

export class MockRialoAdapter implements RialoAdapter {
  async createQuoteSnapshot(input: { estimateId: string; hash: string }) {
    return { id: `mock_quote_${input.estimateId}_${input.hash.slice(0, 8)}`, status: 'MOCKED' as const };
  }

  async recordProcurementEvent(input: { procurementId: string; eventId: string; type: string }) {
    return { id: `mock_event_${input.eventId}_${input.type}`, status: 'MOCKED' as const };
  }

  async createProcurementWorkflow(input: { procurementId: string }) {
    return { workflowId: `mock_workflow_${input.procurementId}`, status: 'MOCKED' as const };
  }

  async getWorkflowStatus(workflowId: string) {
    return {
      workflowId,
      status: 'MOCKED_DISCONNECTED',
      note: 'Mock Rialo fallback is active because real Rialo configuration is absent or disabled. No Rialo API is called.',
    };
  }
}

export class RealRialoAdapter implements RialoAdapter {
  private readonly rpcUrl: string;
  private readonly network: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: RealRialoAdapterOptions) {
    if (!options.rpcUrl) throw new Error('RIALO_RPC_URL is required for the real Rialo adapter.');
    this.rpcUrl = options.rpcUrl;
    this.network = options.network ?? 'devnet';
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async createQuoteSnapshot(input: { estimateId: string; hash: string }) {
    await this.assertDevnetReachable('create quote snapshot connection check');
    return { id: `rialo_probe_quote_${input.estimateId}_${input.hash.slice(0, 8)}`, status: 'CONNECTED' as const };
  }

  async recordProcurementEvent(input: { procurementId: string; eventId: string; type: string }) {
    await this.assertDevnetReachable('record procurement event connection check');
    return { id: `rialo_probe_event_${input.procurementId}_${input.eventId}_${input.type}`, status: 'CONNECTED' as const };
  }

  async createProcurementWorkflow(input: { procurementId: string }) {
    await this.assertDevnetReachable('create procurement workflow connection check');
    return { workflowId: `rialo_probe_workflow_${input.procurementId}`, status: 'CONNECTED' as const };
  }

  async getWorkflowStatus(workflowId: string) {
    await this.assertDevnetReachable('workflow status connection check');
    return {
      workflowId,
      status: 'CONNECTED_PROBE_ONLY',
      note: `Real Rialo ${this.network} RPC endpoint is reachable at ${this.rpcUrl}. No workflow, payment, escrow, freight, warehouse, customs, or procurement transaction is executed.`,
    };
  }

  private async assertDevnetReachable(operation: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(this.rpcUrl, { method: 'GET', signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`Rialo RPC returned HTTP ${response.status}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown Rialo connectivity failure';
      throw new Error(`Real Rialo ${this.network} unavailable during ${operation}: ${reason}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function isRealRialoConfigured(env: Record<string, string | undefined> = process.env) {
  return REAL_ADAPTER_VALUES.has((env.RIALO_ADAPTER ?? '').toLowerCase()) && Boolean(env.RIALO_RPC_URL);
}

export function getRialoAdapter(env: Record<string, string | undefined> = process.env): RialoAdapter {
  if (!isRealRialoConfigured(env)) return new MockRialoAdapter();

  return new RealRialoAdapter({
    rpcUrl: env.RIALO_RPC_URL ?? DEFAULT_RIALO_DEVNET_RPC_URL,
    network: env.RIALO_NETWORK ?? 'devnet',
  });
}
