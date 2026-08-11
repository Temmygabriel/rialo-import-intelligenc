# Import Intelligence

A China → Nigeria import intelligence MVP for estimating supplier risk, landed cost, and sea-vs-air tradeoffs before a buyer commits to procurement.

## What it does

- Accepts a 1688, Taobao, Pinduoduo, or Alibaba product URL.
- Detects the marketplace and normalizes the product record.
- Avoids fake scraping: if live marketplace data is unavailable, the product/supplier fields are explicitly marked unknown.
- Collects only the missing inputs needed for a useful estimate: quantity, Nigerian destination, shipping preference, delivery preference, weight, dimensions, category, and optional declared value.
- Calculates sea and air landed-cost ranges from local configurable reference data.
- Creates a protected procurement record with an audit-event state machine.
- Keeps Rialo behind a mock adapter so the app works without unverified Rialo APIs.

## Local setup

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Checks

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## Deployment

Deploy on Vercel using the free Next.js flow. No paid services are required for the MVP.

## External dependencies

Runtime dependencies are Next.js, React, React DOM, and Zod. Dev dependencies are TypeScript, ESLint/Next config, Vitest, and type packages.

## Demo/reference data warning

Freight, customs, clearing, and local-delivery data are controlled reference tables under `data/`. They are not live quotes, official customs advice, or confirmed forwarder rates.
