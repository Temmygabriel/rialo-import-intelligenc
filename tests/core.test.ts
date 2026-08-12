import { describe, expect, it } from 'vitest';
import { detectMarketplace, analyzeMarketplaceProduct } from '@/lib/marketplaces/adapters';
import { calculateCbm, calculateChargeableAirWeight, calculateVolumetricWeightKg, sumRange } from '@/lib/costs/math';
import { estimateCosts } from '@/lib/costs/estimator';
import { scoreSupplier } from '@/lib/suppliers/scoring';
import { transitionProcurement } from '@/lib/procurement/state-machine';
import { MockRialoAdapter, RealRialoAdapter, getRialoAdapter } from '@/lib/rialo/adapter';
import { db } from '@/lib/db/memory';
import { POST as createProcurement } from '@/app/api/procurement/route';
import { GET as getProcurement } from '@/app/api/procurement/[id]/route';
import { POST as recordProcurementEvent } from '@/app/api/procurement/[id]/events/route';
import type { Procurement } from '@/lib/types';

describe('marketplace adapters', () => {
  it('detects supported marketplaces', () => {
    expect(detectMarketplace('https://detail.1688.com/offer/123.html').adapter.marketplace).toBe('1688');
    expect(detectMarketplace('https://item.taobao.com/item.htm?id=1').adapter.marketplace).toBe('Taobao');
    expect(detectMarketplace('https://mobile.yangkeduo.com/goods.html?goods_id=1').adapter.marketplace).toBe('Pinduoduo');
    expect(detectMarketplace('https://www.alibaba.com/product-detail/test.html').adapter.marketplace).toBe('Alibaba');
  });
  it('rejects invalid and unsupported URLs', () => {
    expect(() => detectMarketplace('not a url')).toThrow();
    expect(() => detectMarketplace('https://example.com/item')).toThrow(/Unsupported/);
  });
  it('normalizes product into unavailable state without fake extraction', async () => {
    const product = await analyzeMarketplaceProduct('https://detail.1688.com/offer/123.html#abc');
    expect(product.marketplace).toBe('1688');
    expect(product.extractionStatus).toBe('UNKNOWN');
    expect(product.supplier?.dataStatus).toBe('UNKNOWN');
  });
});

describe('freight math', () => {
  it('calculates CBM', () => expect(calculateCbm(100, 50, 40, 2)).toBeCloseTo(0.4));
  it('calculates volumetric weight', () => expect(calculateVolumetricWeightKg(60, 40, 30, 1, 6000)).toBeCloseTo(12));
  it('uses greater actual, volumetric, and minimum air weight', () => expect(calculateChargeableAirWeight(8, 12, 10)).toBe(12));
  it('propagates low/high ranges', () => expect(sumRange([{ amountLow: 10, amountHigh: 20 }, { amountLow: 5, amountHigh: 8 }])).toEqual({ low: 15, high: 28 }));
});

describe('cost estimator', () => {
  const product = { id:'p1', url:'https://detail.1688.com/offer/1.html', normalizedUrl:'https://detail.1688.com/offer/1.html', marketplace:'1688' as const, name:'Manual product', currency:'CNY' as const, extractionStatus:'UNKNOWN' as const, warnings:[], updatedAt:new Date().toISOString(), demoMode:false };

  it('creates sea and air estimates with decomposed components', () => {
    const estimate = estimateCosts({ product, quantity: 20, destination: 'Lagos', shippingPreference: 'recommend', deliveryPreference: 'pickup', weightKg: 1.5, lengthCm: 30, widthCm: 20, heightCm: 15, declaredValue: 500000, productCategory: 'general_goods' });
    expect(estimate.sea.components.some((c) => c.category === 'SEA_FREIGHT')).toBe(true);
    expect(estimate.air.components.some((c) => c.category === 'AIR_FREIGHT')).toBe(true);
    expect(estimate.totalHigh).toBeGreaterThan(estimate.totalLow);
    expect(estimate.assumptions.join(' ')).toMatch(/Customs classification/);
  });

  it('creates procurement workflow against the actual procurement id', async () => {
    const estimate = estimateCosts({ product, quantity: 2, destination: 'Lagos', shippingPreference: 'sea', deliveryPreference: 'pickup', weightKg: 1, lengthCm: 20, widthCm: 20, heightCm: 20, declaredValue: 100000 });
    db.saveEstimate(estimate);
    const response = await createProcurement(new Request('http://localhost/api/procurement', { method: 'POST', body: JSON.stringify({ estimateId: estimate.id }) }));
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.rialoWorkflowId).toBe(`mock_workflow_${json.data.id}`);
    expect(json.data.events[0].procurementId).toBe(json.data.id);
  });

  it('recovers an existing procurement by id', async () => {
    const estimate = estimateCosts({ product, quantity: 3, destination: 'Abuja', shippingPreference: 'air', deliveryPreference: 'local_delivery', weightKg: 1, lengthCm: 20, widthCm: 20, heightCm: 20, declaredValue: 150000 });
    db.saveEstimate(estimate);
    const createdResponse = await createProcurement(new Request('http://localhost/api/procurement', { method: 'POST', body: JSON.stringify({ estimateId: estimate.id }) }));
    const createdJson = await createdResponse.json();

    const recoveredResponse = await getProcurement(new Request(`http://localhost/api/procurement/${createdJson.data.id}`), { params: Promise.resolve({ id: createdJson.data.id }) });
    const recoveredJson = await recoveredResponse.json();

    expect(recoveredJson.ok).toBe(true);
    expect(recoveredJson.data.id).toBe(createdJson.data.id);
    expect(recoveredJson.data.productName).toBe(createdJson.data.productName);
    expect(recoveredJson.data.events).toHaveLength(1);
    expect(recoveredJson.data.workflow.status).toBe('MOCKED_DISCONNECTED');
  });

  it('returns a clear not found response for invalid procurement recovery', async () => {
    const response = await getProcurement(new Request('http://localhost/api/procurement/pr_missing'), { params: Promise.resolve({ id: 'pr_missing' }) });
    const json = await response.json();
    expect(response.status).toBe(404);
    expect(json.ok).toBe(false);
    expect(json.error.message).toBe('Procurement not found.');
  });

  it('advances events on a recovered procurement record', async () => {
    const estimate = estimateCosts({ product, quantity: 4, destination: 'Lagos', shippingPreference: 'sea', deliveryPreference: 'pickup', weightKg: 1, lengthCm: 20, widthCm: 20, heightCm: 20, declaredValue: 200000 });
    db.saveEstimate(estimate);
    const createdResponse = await createProcurement(new Request('http://localhost/api/procurement', { method: 'POST', body: JSON.stringify({ estimateId: estimate.id }) }));
    const createdJson = await createdResponse.json();
    const id = createdJson.data.id;

    await getProcurement(new Request(`http://localhost/api/procurement/${id}`), { params: Promise.resolve({ id }) });
    const updatedResponse = await recordProcurementEvent(new Request(`http://localhost/api/procurement/${id}/events`, { method: 'POST', body: JSON.stringify({ newState: 'SUPPLIER_SELECTED', type: 'SUPPLIER_SELECTED', data: { source: 'test' } }) }), { params: Promise.resolve({ id }) });
    const updatedJson = await updatedResponse.json();

    expect(updatedJson.ok).toBe(true);
    expect(updatedJson.data.state).toBe('SUPPLIER_SELECTED');
    expect(updatedJson.data.events).toHaveLength(2);
    expect(updatedJson.data.events.at(-1).procurementId).toBe(id);
  });

  it('flags customs uncertainty and demo rates', () => {
    const estimate = estimateCosts({ product, quantity: 1, destination: 'Abuja', shippingPreference: 'air', deliveryPreference: 'local_delivery', weightKg: 1, lengthCm: 20, widthCm: 20, heightCm: 20, declaredValue: 100000 });
    expect(estimate.demoMode).toBe(true);
    expect(estimate.air.components.find((c) => c.category === 'CUSTOMS')?.status).toBe('ESTIMATED');
  });
});

describe('supplier scoring', () => {
  it('returns unknown when evidence is unavailable', () => {
    const score = scoreSupplier([{ label:'reviews', value:'unavailable', status:'UNKNOWN', confidence:'LOW', impact:'neutral', source:'test' }]);
    expect(score.score).toBeNull();
    expect(score.riskLevel).toBe('UNKNOWN');
  });
  it('scores explainable evidence', () => {
    const score = scoreSupplier([{ label:'reviews', value:'4.8/5', status:'KNOWN', confidence:'HIGH', impact:'positive', source:'test' }, { label:'risk flag', value:'missing address', status:'KNOWN', confidence:'MEDIUM', impact:'negative', source:'test' }]);
    expect(score.score).toBe(45);
    expect(score.explanation.length).toBe(2);
  });
});

describe('procurement state machine', () => {
  const base: Procurement = { id:'pr1', estimateId:'e1', state:'QUOTE_CREATED', productName:'Item', destination:'Lagos', selectedMode:'SEA', totalLow:1, totalHigh:2, currency:'NGN', rialoStatus:'MOCKED', events:[], createdAt:'now', updatedAt:'now' };
  it('records valid state transitions', () => {
    const updated = transitionProcurement(base, 'SUPPLIER_SELECTED');
    expect(updated.state).toBe('SUPPLIER_SELECTED');
    expect(updated.events[0].previousState).toBe('QUOTE_CREATED');
  });
  it('rejects invalid state transitions', () => expect(() => transitionProcurement(base, 'COMPLETED')).toThrow(/Invalid/));
});

describe('Rialo adapter abstraction', () => {
  it('uses a mock adapter without calling unverified APIs', async () => {
    const adapter = new MockRialoAdapter();
    const workflow = await adapter.createProcurementWorkflow({ procurementId:'pr1' });
    expect(workflow.status).toBe('MOCKED');
    expect(workflow.workflowId).toContain('mock_workflow');
  });
});

describe('Rialo real adapter configuration boundary', () => {
  it('falls back to mock when real Rialo configuration is absent', async () => {
    const adapter = getRialoAdapter({ RIALO_ADAPTER: 'real' });
    const workflow = await adapter.createProcurementWorkflow({ procurementId: 'pr_unconfigured' });
    expect(workflow.status).toBe('MOCKED');
    expect(workflow.workflowId).toBe('mock_workflow_pr_unconfigured');
  });

  it('initializes the real adapter when devnet RPC configuration is present', async () => {
    const fetchImpl = async () => new Response('ok', { status: 200 });
    const adapter = new RealRialoAdapter({ rpcUrl: 'http://devnet.rialo.io:4100', fetchImpl });
    const workflow = await adapter.createProcurementWorkflow({ procurementId: 'pr_real' });
    const status = await adapter.getWorkflowStatus(workflow.workflowId);

    expect(workflow).toEqual({ workflowId: 'rialo_workflow_pr_real', status: 'CONNECTED' });
    expect(status.status).toBe('CONNECTED');
    expect(status.note).toMatch(/reachable/);
  });

  it('surfaces real Rialo connectivity failures without falling through to mocked success', async () => {
    const fetchImpl = async () => new Response('unavailable', { status: 503 });
    const adapter = new RealRialoAdapter({ rpcUrl: 'http://devnet.rialo.io:4100', fetchImpl });

    await expect(adapter.recordProcurementEvent({
      procurementId: 'pr_real',
      eventId: 'evt_real',
      type: 'STATE_TRANSITION',
      previousState: 'QUOTE_CREATED',
      newState: 'SUPPLIER_SELECTED',
      data: {},
      timestamp: new Date().toISOString(),
    })).rejects.toThrow(/HTTP 503/);
  });
});