# Rialo DevNet Proof-of-Transaction Worker

This repository now includes an isolated Rust worker in `rialo-worker/` for proving one real Rialo DevNet transaction lifecycle outside the Next.js/Vercel application.

## Architecture

```text
Next.js / Vercel app (unchanged)
  -> future RialoAdapter worker client (not implemented yet)
  -> rialo-worker Rust binary
  -> official rialo-cdk APIs
  -> Rialo DevNet RPC
```

The worker is intentionally not wired to `RealRialoAdapter`, procurement routes, procurement events, payments, escrow, freight booking, warehouse operations, customs brokerage, or production procurement.

## rialo-cdk version

The worker pins:

```toml
rialo-cdk = "0.12.2"
```

This matches the currently documented public `rialo-cdk` API used by the worker rather than mixing the older `rialo-examples` `0.10.1` workspace pins with newer APIs.

## Official APIs used

The worker is designed around the documented public Rust CDK APIs:

- `HttpRpcClient::new(RIALO_RPC_URL)` for Rialo RPC access.
- `FileKeyringProvider::new(RIALO_KEYRING_PATH)` plus `KeyringProvider::load(RIALO_KEYRING_NAME, RIALO_KEYRING_PASSWORD)` for encrypted file-backed keyring loading.
- `Keyring::pubkey()` for the payer account public key.
- `RpcClient::get_config_hash_prefix()` for transaction replay-protection configuration.
- `TransactionBuilder::new(payer, valid_from, config_hash_prefix)` for transaction construction.
- `TransactionBuilder::add_transfer_instruction(from, to, amount)` for the smallest documented transfer instruction.
- `TransactionBuilder::sign(&keyring)` for local signing with official keyring APIs.
- `RpcClient::send_and_confirm_transaction(...)` for submission plus confirmation.
- `RpcClient::get_signature_statuses(...)` and `RpcClient::get_transaction(...)` for post-confirmation retrieval.

## Environment variables

The worker reads configuration only from environment variables:

```bash
RIALO_NETWORK=devnet
RIALO_RPC_URL=http://devnet.rialo.io:4100
RIALO_KEYRING_PATH=/secure/path/to/rialo/keyrings
RIALO_KEYRING_NAME=devnet-worker
RIALO_KEYRING_PASSWORD=...
RIALO_RECIPIENT=<controlled DevNet recipient public key>
# Optional; defaults to 1 kelvin.
RIALO_TRANSFER_AMOUNT_KELVIN=1
```

Do not use production accounts. Use only a dedicated funded DevNet keyring and a controlled DevNet recipient.

## Keyring loading mechanism

The worker uses the official `FileKeyringProvider`; it does not parse private keys, base58 secrets, JSON secrets, mnemonics, or raw Ed25519 bytes itself.

`FileKeyringProvider` stores keyring files as `<name>.keyring` below the configured keyring directory. The CDK documentation describes file keyrings as JSON files with encrypted private keys.

## Transaction flow

1. Refuse to run unless `RIALO_NETWORK=devnet`.
2. Refuse RPC URLs that look production/mainnet-related or do not explicitly contain `devnet`.
3. Load the encrypted keyring using `FileKeyringProvider`.
4. Read the active keyring public key as the payer/from account.
5. Parse `RIALO_RECIPIENT` as a Rialo public key.
6. Fetch the current config hash prefix from DevNet with `get_config_hash_prefix()`.
7. Build a tiny DevNet transfer with `TransactionBuilder::add_transfer_instruction(...)`.
8. Sign locally using `TransactionBuilder::sign(&keyring)`.
9. Submit and confirm using `send_and_confirm_transaction(...)`.
10. Fetch signature status and transaction data.
11. Print a machine-readable JSON result containing the signature and confirmation metadata only; it never prints keyring passwords or private key material.

## How to run

From the repository root:

```bash
cd rialo-worker
RIALO_NETWORK=devnet \
RIALO_RPC_URL=http://devnet.rialo.io:4100 \
RIALO_KEYRING_PATH=/secure/path/to/rialo/keyrings \
RIALO_KEYRING_NAME=devnet-worker \
RIALO_KEYRING_PASSWORD='...' \
RIALO_RECIPIENT='<controlled DevNet recipient public key>' \
cargo run
```

## DevNet-only safety restrictions

- `RIALO_NETWORK` must be exactly `devnet`.
- `RIALO_RPC_URL` must include `devnet`.
- RPC URLs containing `mainnet`, `production`, or `prod` are rejected.
- The transfer amount defaults to one kelvin and must be greater than zero.
- The worker does not generate wallets automatically.
- The worker does not request airdrops automatically.
- The worker does not expose production transaction capability.

## What was actually verified in this repository

- The worker is isolated under `rialo-worker/` and does not change Next.js procurement behavior.
- DevNet-only configuration validation is unit-tested.
- The transaction implementation follows the documented public `rialo-cdk 0.12.2` API surface.

## What remains unimplemented

- No wiring to `RealRialoAdapter.recordProcurementEvent()`.
- No procurement event anchoring.
- No Venus workflow deployment or invocation.
- No Rialo E2E YAML runner integration.
- No payments, escrow, freight, warehouse, customs, or production procurement.
