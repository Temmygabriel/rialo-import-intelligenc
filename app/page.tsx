'use client';

import { useMemo, useState } from 'react';
import type { CostComponent, CostEstimate, EvidenceStatus, FreightOption, Procurement, ProcurementState, Product } from '@/lib/types';
import { canTransition, procurementStates } from '@/lib/procurement/state-machine';

const money = (n: number) => `₦${Math.round(n).toLocaleString()}`;
type EstimateForm = { quantity: number; destination: string; shippingPreference: string; deliveryPreference: string; weightKg: number; lengthCm: number; widthCm: number; heightCm: number; productCategory: string; declaredValue: string };
const marketplaceChips = ['1688', 'Taobao', 'Pinduoduo', 'Alibaba'];
const evidenceOrder: EvidenceStatus[] = ['USER_PROVIDED', 'KNOWN', 'ESTIMATED', 'REQUIRES_QUOTE', 'UNKNOWN'];

const apiPost = async <T,>(url: string, body: unknown) => {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? 'Request failed');
  return json.data as T;
};

const apiGet = async <T,>(url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error?.message ?? 'Request failed');
  return json.data as T;
};

const stateLabel = (state: ProcurementState) => state.toLowerCase().replaceAll('_', ' ');
const actionLabel = (state: ProcurementState) => ({
  SUPPLIER_SELECTED: 'Mark supplier selected',
  PROCUREMENT_STARTED: 'Record procurement started',
  WAREHOUSE_PENDING: 'Record warehouse pending',
  WAREHOUSE_RECEIVED: 'Record warehouse received',
  QC_PENDING: 'Record QC pending',
  QC_PASSED: 'Record QC passed',
  QC_FAILED: 'Record QC failed',
  SHIPPING_PENDING: 'Record shipping pending',
  SHIPPING_BOOKED: 'Record shipping booked',
  IN_TRANSIT: 'Record in transit',
  ARRIVED_NIGERIA: 'Record arrived in Nigeria',
  DELIVERY_PENDING: 'Record delivery pending',
  COMPLETED: 'Record completed',
  CANCELLED: 'Cancel record',
  QUOTE_CREATED: 'Record quote created',
  DRAFT: 'Return to draft',
}[state]);

const getNextProcurementActions = (state: ProcurementState) => procurementStates.filter((candidate) => canTransition(state, candidate));
const selectedOption = (estimate: CostEstimate) => estimate.recommendedMode === 'SEA' ? estimate.sea : estimate.air;
const formatChargeable = (option: FreightOption) => `${option.chargeable.value} ${option.chargeable.unit}`;

export default function Home() {
  const [url, setUrl] = useState('');
  const [product, setProduct] = useState<Product>();
  const [estimate, setEstimate] = useState<CostEstimate>();
  const [procurement, setProcurement] = useState<Procurement>();
  const [error, setError] = useState('');
  const [recoveryId, setRecoveryId] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [eventError, setEventError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<EstimateForm>({ quantity: 10, destination: 'Lagos', shippingPreference: 'recommend', deliveryPreference: 'pickup', weightKg: 1, lengthCm: 30, widthCm: 20, heightCm: 15, productCategory: 'general_goods', declaredValue: '' });

  async function analyze() {
    setLoading(true); setError(''); setRecoveryError(''); setEventError(''); setEstimate(undefined); setProcurement(undefined);
    try { setProduct(await apiPost<Product>('/api/products/analyze', { url })); }
    catch (e) { setProduct(undefined); setError(e instanceof Error ? e.message : 'Analysis failed'); }
    finally { setLoading(false); }
  }

  async function estimateCost() {
    if (!product) return;
    setLoading(true); setError(''); setEventError(''); setProcurement(undefined);
    try { setEstimate(await apiPost<CostEstimate>('/api/costs/estimate', { product, ...form, declaredValue: form.declaredValue ? Number(form.declaredValue) : undefined })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Estimate failed'); }
    finally { setLoading(false); }
  }

  async function startProcurement() {
    if (!estimate) return;
    setLoading(true); setError(''); setEventError('');
    try { setProcurement(await apiPost<Procurement>('/api/procurement', { estimateId: estimate.id, selectedMode: estimate.recommendedMode })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not create procurement record'); }
    finally { setLoading(false); }
  }

  async function recoverProcurement() {
    const id = recoveryId.trim();
    setRecoveryError(''); setEventError('');
    if (!id) { setRecoveryError('Enter a procurement ID beginning with pr_.'); return; }
    if (!id.startsWith('pr_')) { setRecoveryError('Procurement IDs in this MVP begin with pr_.'); return; }
    setLoading(true);
    try {
      const recovered = await apiGet<Procurement>(`/api/procurement/${encodeURIComponent(id)}`);
      setProduct(undefined); setEstimate(undefined); setProcurement(recovered);
    } catch (e) {
      setProcurement(undefined);
      setRecoveryError(e instanceof Error ? e.message : 'Could not open that procurement record.');
    } finally { setLoading(false); }
  }

  async function advanceProcurement(newState: ProcurementState) {
    if (!procurement) return;
    setLoading(true); setEventError('');
    try {
      setProcurement(await apiPost<Procurement>(`/api/procurement/${procurement.id}/events`, { newState, type: 'STATE_TRANSITION', data: { source: 'buyer_ui' }, verified: false }));
    } catch (e) { setEventError(e instanceof Error ? e.message : 'Could not update procurement record.'); }
    finally { setLoading(false); }
  }

  return <main className="page">
    <section className="hero">
      <nav className="nav"><div className="brand">Import Intelligence</div><div className="badge">Demo mode · reference rates only</div></nav>
      <div className="heroGrid">
        <div>
          <div className="eyebrow">China → Nigeria import intelligence</div>
          <h1>HOW MUCH WILL THIS REALLY COST IN NIGERIA?</h1>
          <p className="sub">Paste a China marketplace link, fill the missing shipment details, then compare estimated Sea and Air landed cost before you buy.</p>
          <div className="marketplaces">{marketplaceChips.map((m) => <span className="marketChip" key={m}>{m}</span>)}</div>
          <div className="analyzeBox"><label className="label">Paste product link</label><div className="urlRow"><input value={url} onChange={e => setUrl(e.target.value)} placeholder="1688 / Taobao / Pinduoduo / Alibaba URL" /><button onClick={analyze} disabled={loading}>{loading ? 'Working…' : 'Analyze import link'}</button></div>{error && <div className="warn">{error}</div>}</div>
          <div className="trustList"><div className="trustItem"><span className="dot" />Marketplace facts are not fabricated; unavailable facts are marked UNKNOWN.</div><div className="trustItem"><span className="dot" />Freight and customs are reference estimates, not live quotes.</div><div className="trustItem"><span className="dot" />Rialo execution is mocked/disconnected in this MVP.</div></div>
        </div>
        <aside className="panel"><small>Single-page import decision flow</small><div className="metric">Sea vs Air</div><p>Evidence labels, missing inputs, uncertainty, and an auditable procurement record in one workflow.</p></aside>
      </div>
    </section>

    {product && <VerifiedSection product={product} />}
    {product && <InputsSection form={form} setForm={setForm} loading={loading} estimateCost={estimateCost} />}
    {estimate && <DecisionSection estimate={estimate} />}
    {estimate && <EvidenceLedger product={product} estimate={estimate} />}
    {estimate && <ProcurementCheckpoint estimate={estimate} loading={loading} startProcurement={startProcurement} />}
    {procurement && <ProcurementRecord procurement={procurement} loading={loading} eventError={eventError} advanceProcurement={advanceProcurement} />}
    <RecoverySection recoveryId={recoveryId} setRecoveryId={setRecoveryId} recoverProcurement={recoverProcurement} recoveryError={recoveryError} loading={loading} />
    <footer className="footer">Software intelligence layer only. Not a freight company, warehouse, customs broker, sourcing agency, or payment company.</footer>
  </main>;
}

function VerifiedSection({ product }: { product: Product }) {
  const supplier = product.supplier;
  return <section className="section"><div className="stepLabel">Step 2 · What we could verify</div><div className="grid2">
    <div className="card"><div className="cardTop"><span className="pill">{product.marketplace}</span><EvidenceBadge status={product.extractionStatus} /></div><h2>{product.name}</h2><p className="muted">Marketplace live extraction is unavailable when facts are UNKNOWN. Use the next section to provide shipment and commercial inputs.</p><div className="factsGrid"><Fact label="Price" value={product.priceLow ? `${product.currency} ${product.priceLow}${product.priceHigh ? ` – ${product.priceHigh}` : ''}` : 'Unavailable'} status={product.priceLow ? 'KNOWN' : 'UNKNOWN'} /><Fact label="MOQ" value={product.moq ?? 'Unavailable'} status={product.moq ? 'KNOWN' : 'UNKNOWN'} /><Fact label="Weight" value={product.weightKg ? `${product.weightKg}kg` : 'Needs input'} status={product.weightKg ? 'KNOWN' : 'UNKNOWN'} /><Fact label="Dimensions" value={product.dimensionsCm ? `${product.dimensionsCm.length}×${product.dimensionsCm.width}×${product.dimensionsCm.height}cm` : 'Needs input'} status={product.dimensionsCm ? 'KNOWN' : 'UNKNOWN'} /></div>{product.warnings.map(w => <div className="warn" key={w}>{w}</div>)}</div>
    <SupplierCard supplier={supplier} />
  </div></section>;
}

function SupplierCard({ supplier }: { supplier: Product['supplier'] }) {
  const score = supplier?.score.score;
  return <div className="card"><div className="cardTop"><span className="label">Supplier status</span>{supplier && <EvidenceBadge status={supplier.dataStatus} />}</div>{typeof score === 'number' ? <div className="risk">{score} / 100</div> : <div className="unavailableScore">Verified supplier score unavailable</div>}<p><b>Risk:</b> {supplier?.score.riskLevel ?? 'UNKNOWN'} · Confidence: {supplier?.score.confidence ?? 'LOW'}</p><p className="muted">{supplier?.score.explanation.join(' ') ?? 'Live supplier extraction is unavailable in this MVP.'}</p>{supplier?.evidence.length ? <div className="evidenceRows">{supplier.evidence.map((e) => <div className="evidenceRow" key={e.label}><div><b>{e.label}</b><div className="status">{e.confidence} · {e.source}</div><span className="muted">{e.value}</span></div><EvidenceBadge status={e.status} /></div>)}</div> : null}{supplier?.score.missingEvidence.length ? <div className="missingList"><b>Missing supplier evidence</b><ul>{supplier.score.missingEvidence.map(m => <li key={m}>{m}</li>)}</ul></div> : null}</div>;
}

function InputsSection({ form, setForm, loading, estimateCost }: { form: EstimateForm; setForm: (next: EstimateForm) => void; loading: boolean; estimateCost: () => void }) {
  return <section className="section card"><div className="stepLabel">Step 3 · What we still need from you</div><h2>Estimate landed cost</h2><p className="muted">These inputs fill the marketplace gaps without changing the estimator contract.</p><div className="inputGroups"><div className="inputGroup"><h3>Shipment</h3><p className="helper">Needed to calculate sea CBM and air chargeable weight.</p><div className="grid3"><Field label="Quantity" type="number" value={form.quantity} onChange={v => setForm({ ...form, quantity: Number(v) })} /><Field label="Unit weight (kg)" type="number" value={form.weightKg} onChange={v => setForm({ ...form, weightKg: Number(v) })} /><Field label="Length (cm)" type="number" value={form.lengthCm} onChange={v => setForm({ ...form, lengthCm: Number(v) })} /><Field label="Width (cm)" type="number" value={form.widthCm} onChange={v => setForm({ ...form, widthCm: Number(v) })} /><Field label="Height (cm)" type="number" value={form.heightCm} onChange={v => setForm({ ...form, heightCm: Number(v) })} /></div></div><div className="inputGroup"><h3>Commercial</h3><p className="helper">Used for customs placeholder estimates. Confirm HS classification before relying on final duties.</p><Field label="Declared/product value (₦ optional)" value={form.declaredValue} onChange={v => setForm({ ...form, declaredValue: v })} /><input type="hidden" value={form.productCategory} readOnly /></div><div className="inputGroup"><h3>Nigeria delivery</h3><p className="helper">Used for clearing and local delivery allowance.</p><div className="grid3"><Select label="Destination" value={String(form.destination)} options={[{ value: 'Lagos', label: 'Lagos' }, { value: 'Abuja', label: 'Abuja' }, { value: 'Port Harcourt', label: 'Port Harcourt' }, { value: 'Kano', label: 'Kano' }, { value: 'Other', label: 'Other Nigeria city' }]} onChange={v => setForm({ ...form, destination: v })} /><Select label="Pickup or local delivery" value={String(form.deliveryPreference)} options={[{ value: 'pickup', label: 'Pickup from clearing point' }, { value: 'local_delivery', label: 'Include local delivery allowance' }]} onChange={v => setForm({ ...form, deliveryPreference: v })} /><Select label="Shipping decision" value={String(form.shippingPreference)} options={[{ value: 'recommend', label: 'Recommend Sea or Air' }, { value: 'sea', label: 'Force Sea estimate' }, { value: 'air', label: 'Force Air estimate' }]} onChange={v => setForm({ ...form, shippingPreference: v })} /></div></div></div><button onClick={estimateCost} disabled={loading}>Calculate Sea vs Air</button></section>;
}

function DecisionSection({ estimate }: { estimate: CostEstimate }) {
  const selected = selectedOption(estimate);
  return <section className="section"><div className="stepLabel">Step 4 · Sea vs Air import decision</div><div className="decisionHero"><div><div className="label">Which import mode should I choose?</div><h2>Recommended: {estimate.recommendedMode}</h2><div className="range">{money(estimate.totalLow)} – {money(estimate.totalHigh)}</div><p>Destination: <b>{estimate.destination}</b> · Confidence: <b>{estimate.confidence}</b></p><p>{cleanRecommendation(estimate)}</p><p className="caveat">Reference-rate estimate only — not a live freight quote or customs assessment.</p></div><div className="decisionMeta"><span>{selected.transitDaysLow}–{selected.transitDaysHigh} days</span><span>{formatChargeable(selected)} chargeable</span></div></div><div className="optionGrid"><Option title="SEA" option={estimate.sea} recommended={estimate.recommendedMode === 'SEA'} /><Option title="AIR" option={estimate.air} recommended={estimate.recommendedMode === 'AIR'} /></div></section>;
}

function EvidenceLedger({ product, estimate }: { product?: Product; estimate: CostEstimate }) {
  const components = selectedOption(estimate).components;
  const grouped = useMemo(() => evidenceOrder.map((status) => ({ status, components: components.filter((c) => c.status === status) })).filter((g) => g.components.length || g.status === 'UNKNOWN'), [components]);
  const productUnknowns = [!product?.priceLow && 'Marketplace price', !product?.weightKg && 'Unit weight', !product?.dimensionsCm && 'Dimensions', product?.supplier?.score.score == null && 'Verified supplier score'].filter(Boolean) as string[];
  return <section className="section"><div className="stepLabel">Step 5 · What is known / estimated / uncertain</div><div className="grid2"><div className="card evidenceLedger"><h2>Evidence ledger for {estimate.recommendedMode}</h2>{grouped.map(({ status, components }) => <div className="ledgerGroup" key={status}><EvidenceBadge status={status} />{components.length ? components.map((c) => <ComponentEvidence component={c} key={`${c.category}-${c.name}`} />) : <p className="muted">No selected-mode cost component currently has this status.</p>}</div>)}</div><div className="card"><h2>Warnings</h2>{productUnknowns.length ? <div className="warn"><b>Product/supplier unknowns:</b> {productUnknowns.join(', ')}.</div> : null}{estimate.warnings.map((w) => <div className="warn" key={w}>{w}</div>)}<h3>General assumptions</h3>{estimate.assumptions.map((a) => <p className="assumption" key={a}>{a}</p>)}</div></div></section>;
}

function ProcurementCheckpoint({ estimate, loading, startProcurement }: { estimate: CostEstimate; loading: boolean; startProcurement: () => void }) {
  return <section className="section card checkpoint"><div className="stepLabel">Step 6 · Procurement checkpoint</div><h2>Create an auditable procurement record?</h2><p>Creates an auditable procurement record only.</p><div className="summaryGrid"><Info label="Selected mode" value={estimate.recommendedMode} /><Info label="Estimated range" value={`${money(estimate.totalLow)} – ${money(estimate.totalHigh)}`} /><Info label="Destination" value={estimate.destination} /></div><div className="notList"><span>Does not book freight</span><span>Does not make payment</span><span>Does not activate escrow</span><span>Does not operate a warehouse</span><span>Does not execute a live Rialo transaction</span></div>{estimate.warnings.slice(0, 2).map((w) => <div className="warn" key={w}>{w}</div>)}<button onClick={startProcurement} disabled={loading}>Create procurement record</button></section>;
}

function ProcurementRecord({ procurement, loading, eventError, advanceProcurement }: { procurement: Procurement; loading: boolean; eventError: string; advanceProcurement: (state: ProcurementState) => void }) {
  const actions = getNextProcurementActions(procurement.state);
  return <section className="section card receipt"><div className="stepLabel">Step 7 · Procurement record / timeline</div><span className="pill">Auditable record only</span><h2>{procurement.productName}</h2><div className="receiptGrid"><Info label="Procurement ID" value={procurement.id} /><Info label="Selected mode" value={procurement.selectedMode} /><Info label="Estimated range" value={`${money(procurement.totalLow)} – ${money(procurement.totalHigh)}`} /><Info label="Destination" value={procurement.destination} /><Info label="Current state" value={stateLabel(procurement.state)} /><Info label="Rialo status" value={`${procurement.rialoStatus.toLowerCase()} / disconnected`} /></div>{procurement.rialoWorkflowId && <p className="muted wrap">Mock workflow reference: {procurement.rialoWorkflowId}</p>}<h3>Next available action</h3>{eventError && <div className="warn">{eventError}</div>}<div className="actionRow">{actions.length ? actions.map((state) => <button className={state === 'CANCELLED' ? 'danger' : 'secondary'} disabled={loading} key={state} onClick={() => advanceProcurement(state)}>{actionLabel(state)}</button>) : <p className="muted">No further state transitions are available for this record.</p>}</div><h3>Audit timeline</h3><div className="timeline">{procurement.events.map(e => <div className="event" key={e.id}><b>{stateLabel(e.previousState)}</b> → <b>{stateLabel(e.newState)}</b><br /><span className="muted">{new Date(e.timestamp).toLocaleString()} · verified: {String(e.verified)} · {e.type}</span></div>)}</div></section>;
}

function RecoverySection({ recoveryId, setRecoveryId, recoverProcurement, recoveryError, loading }: { recoveryId: string; setRecoveryId: (value: string) => void; recoverProcurement: () => void; recoveryError: string; loading: boolean }) {
  return <section className="section recovery"><div className="card"><div className="stepLabel">Step 8 · Open existing procurement record</div><h2>Already have a procurement id?</h2><p className="muted">Paste a procurement ID beginning with pr_. This opens the existing record without re-running analysis, recalculating an estimate, or creating a new procurement.</p><div className="urlRow"><input value={recoveryId} onChange={e => setRecoveryId(e.target.value)} placeholder="pr_..." /><button className="secondary" onClick={recoverProcurement} disabled={loading}>Open record</button></div>{recoveryError && <div className="warn">{recoveryError}</div>}</div></section>;
}

function cleanRecommendation(estimate: CostEstimate) {
  const seaMid = (estimate.sea.totalLow + estimate.sea.totalHigh) / 2;
  const airMid = (estimate.air.totalLow + estimate.air.totalHigh) / 2;
  const diff = Math.abs(seaMid - airMid);
  if (estimate.recommendedMode === 'SEA') return `Sea is the lower estimated landed-cost option by about ${money(diff)} using the current reference inputs. It usually takes longer than Air in this estimate.`;
  return `Air is the selected recommendation for the current inputs. It is estimated to move faster than Sea, but compare the landed-cost ranges before buying.`;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) { return <div className="info"><div className="label">{label}</div><div className="value wrap">{value}</div></div>; }
function Fact({ label, value, status }: { label: string; value: React.ReactNode; status: EvidenceStatus }) { return <div className="fact"><div><div className="label">{label}</div><div className="value">{value}</div></div><EvidenceBadge status={status} /></div>; }
function Field({ label, value, onChange, type = 'text' }: { label: string; value: string | number; type?: string; onChange: (v: string) => void }) { return <label><span className="label">{label}</span><input type={type} value={value} onChange={e => onChange(e.target.value)} /></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) { return <label><span className="label">{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>; }
function EvidenceBadge({ status }: { status: EvidenceStatus }) { return <span className={`evidenceBadge evidence-${status.toLowerCase()}`}>{status}</span>; }
function ComponentEvidence({ component }: { component: CostComponent }) { return <div className="component"><div><b>{component.name}</b><div className="status">{component.confidence} confidence · {component.source}</div>{component.assumptions.map((a) => <p className="assumption" key={a}>{a}</p>)}</div><div className="componentAmount">{money(component.amountLow)}–{money(component.amountHigh)}</div></div>; }
function Option({ title, option, recommended }: { title: string; option: FreightOption; recommended: boolean }) { return <div className={`optionCard ${recommended ? 'recommended' : ''}`}><div className="cardTop"><span className="pill">{title}</span>{recommended && <span className="recommendedTag">Recommended</span>}</div><div className="value">{money(option.totalLow)}–{money(option.totalHigh)}</div><p className="muted">{option.transitDaysLow}–{option.transitDaysHigh} estimated days · freight only {money(option.freightOnlyLow)}–{money(option.freightOnlyHigh)}</p><div className="miniFacts"><span>{formatChargeable(option)} chargeable</span><span>{option.confidence} confidence</span></div>{option.warnings.map((w) => <div className="warn smallWarn" key={w}>{w}</div>)}</div>; }
