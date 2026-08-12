# Rialo Integration

The project treats `RIALO_TECHNICAL_RESEARCH.md` as the current research source.

## Current MVP status

Rialo is isolated behind `lib/rialo/adapter.ts`.

The adapter now supports two modes:

- `MockRialoAdapter` fallback, which keeps all existing API/UI contracts working without Rialo configuration.
- `RealRialoAdapter` devnet reachability probe, which calls the verified Rialo devnet RPC base URL only to confirm connectivity.

The real adapter does **not** create or submit Rialo workflows, transactions, payments, escrow releases, freight bookings, warehouse operations, customs brokerage actions, or live procurement execution.

## Verified real integration point

The only real Rialo capability currently implemented is a server-side HTTP reachability check against the verified devnet RPC endpoint from the research:

```text
http://devnet.rialo.io:4100
```

This is intentionally the smallest safe integration boundary because the repository research verifies the devnet RPC base URL but still marks exact transaction, status-query, browser wallet, and deployment APIs as unknown.

## Configuration

Mock fallback is the default. To enable the real devnet reachability probe, configure:

```bash
RIALO_ADAPTER=real
RIALO_NETWORK=devnet
RIALO_RPC_URL=http://devnet.rialo.io:4100
```

No Rialo secrets, private keys, wallet credentials, or API tokens are required for the current reachability-only integration.

## What remains mocked

- Quote snapshot anchoring.
- Procurement workflow creation.
- Procurement event recording.
- Workflow status beyond endpoint reachability.

## Future workflow target

Supplier selected → China warehouse receives goods → QC performed → shipping confirmed → landed-cost update accepted → settlement condition satisfied → payment released.

Potential future Rialo capabilities to verify and integrate later:

- Venus workflow deployment.
- `AFTER <timestamp> CALL [...]` for timeouts.
- REX HTTP confirmations returning `RexReport`.
- Transaction status queries.
- Conditional settlement primitives.
