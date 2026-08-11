# Architecture

```text
Next.js UI
→ API routes
→ Marketplace adapters
→ Supplier scoring
→ Cost engines / reference data
→ Procurement state machine
→ RialoAdapter interface
```

## Main modules

- `lib/marketplaces/adapters.ts`: marketplace detection and extraction interfaces for 1688, Taobao, Pinduoduo, and Alibaba.
- `lib/costs/`: CBM, volumetric weight, chargeable weight, sea estimate, air estimate, customs placeholders, and landed-cost aggregation.
- `lib/suppliers/scoring.ts`: evidence-based supplier score calculation.
- `lib/procurement/state-machine.ts`: controlled procurement states and audit events.
- `lib/rialo/adapter.ts`: mock Rialo integration boundary.
- `lib/db/memory.ts`: in-memory MVP persistence.
- `data/`: configurable reference rates and assumptions.

## Database schema target

The MVP uses in-memory maps but is structured around these entities:

- User
- Product
- Supplier
- SupplierEvidence
- CostEstimate
- CostComponent
- FreightRate
- Destination
- Procurement
- ProcurementEvent

A future free-tier database such as Vercel Postgres/Supabase/Neon can replace `lib/db/memory.ts` without changing the domain model.
