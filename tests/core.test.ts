import { describe, expect, it } from 'vitest';
import { detectMarketplace, analyzeMarketplaceProduct } from '@/lib/marketplaces/adapters';
import { calculateCbm, calculateChargeableAirWeight, calculateVolumetricWeightKg, sumRange } from '@/lib/costs/math';
import { estimateCosts } from '@/lib/costs/estimator';
import { scoreSupplier } from '@/lib/suppliers/scoring';
import { transitionProcurement } from '@/lib/procurement/state-machine';
import { MockRialoAdapter } from '@/lib/rialo/adapter';
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
