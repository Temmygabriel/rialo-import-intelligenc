# Rialo Integration

The project treats `RIALO_TECHNICAL_RESEARCH.md` as the current research source.

## Current MVP status

Rialo is isolated behind `lib/rialo/adapter.ts`.

The active implementation is `MockRialoAdapter`, which supports:

- `createQuoteSnapshot()`
- `recordProcurementEvent()`
- `createProcurementWorkflow()`
- `getWorkflowStatus()`

It does not call Rialo devnet, wallets, browser APIs, RPC endpoints, or Venus workflows.

## Why mock only

The research found verified Rust/Venus examples and devnet CLI hints, but exact browser wallet APIs, chain IDs, status-query APIs, and complete deployment commands remain unverified. The MVP must not invent Rialo APIs.

## Future workflow target

Supplier selected → China warehouse receives goods → QC performed → shipping confirmed → landed-cost update accepted → settlement condition satisfied → payment released.

Potential future Rialo capabilities to verify and integrate later:

- Venus workflow deployment.
- `AFTER <timestamp> CALL [...]` for timeouts.
- REX HTTP confirmations returning `RexReport`.
- Transaction status queries.
- Conditional settlement primitives.
