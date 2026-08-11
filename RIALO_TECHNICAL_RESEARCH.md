# Rialo Technical Reconnaissance Report

**Date verified:** August 11, 2026  
**Scope:** Official Rialo website/docs links, SubzeroLabs GitHub repositories, crates/npm registry search results.  
**Important caveat:** Several `docs.rialo.io` pages referenced by Rialo's own README were not retrievable through the available browser/terminal fetch paths during reconnaissance. Where exact APIs or operational details could not be verified from accessible official sources, they are marked as **UNKNOWN — needs verification.**

## 1. Rialo stack

### What Rialo currently appears to be

Rialo presents itself as infrastructure for intelligent systems and a real-world blockchain stack. Its official dev portal describes these platform components:

- **Rialo Omni Account** — one account that transacts on multiple networks.
- **Rialo Interop** — native interoperability.
- **Rialo IPC** — identity, privacy, and compliance.
- **Rialo Stream** — native data feeds.
- **Rialo Execution Engine** — event-driven execution with Conditional Transactions.
- **Rialo Edge** — bidirectional Web2 interactivity.
- **Rialo Workflow** — native automation and workflows.
- **Rialo Read Path** — low-latency data access.
- **Rialo VM** — RISC-V, SVM compatibility, future EVM/MoveVM, REX for confidential computing.
- **Rialo Cruise** — gas-less / low-fee transactions.

Source: Rialo Dev Portal: <https://rialo.io/for-devs>

### Developer language and framework

The currently accessible official examples are **Rust-based** and use the **Venus PDK**.

The official `rialo-examples` README says the examples are runnable example programs for Rialo built with the Venus PDK, and that they are a generated read-only mirror of `developer-frameworks/examples/` in the private/unpublished `SubzeroLabs/rialo` monorepo.

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/README.md>

### SDK/package names found

| Package | Ecosystem | Current observed version | Purpose |
|---|---:|---:|---|
| `rialo-cdk` | Rust / crates.io | `0.10.1` in official examples Cargo workspace; crates.io search also showed a newer listing but not enough detail to confirm from page body | Core Rialo development toolkit |
| `rialo-s-sdk` | Rust / crates.io | `0.10.1` in examples workspace; search showed separate crates.io listing | SVM/Solana-like SDK layer |
| `rialo_venus_proc_macro` | Rust crate used in examples | version not directly visible in the snippet, but included through the workspace dependency set | Provides `rialo!` macro / Venus workflow DSL |
| `@rialo/wallet-standard` | npm | `0.1.1` according to npm search result | Wallet Standard interface for Rialo Network apps |

Sources:

- `rialo-examples` root `Cargo.toml` pins `rialo-cdk = "0.10.1"`, `rialo-s-sdk = "0.10.1"`, and many Rialo crates to `0.10.1`: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/Cargo.toml>
- `@rialo/wallet-standard` npm package: <https://www.npmjs.com/package/%40rialo/wallet-standard>
- `rialo-examples` README identifies the examples as built with Venus PDK: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/README.md>

### Installation

Verified:

- For examples: use a stock Rust toolchain and run `cargo check --workspace`.
- For network deployment: install `rialoman`, generate keypair with `rialo keytool generate`, and fund via `rialo client airdrop`.

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/README.md>

Exact `rialoman` install command: **UNKNOWN — needs verification** because the referenced installation page was not retrievable.

### Wallet/account APIs

Verified CLI-level wallet operations:

```bash
rialo keytool generate
rialo client airdrop
```

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/README.md>

Exact programmatic wallet/account API for Rust/JS: **UNKNOWN — needs verification**.

### Transaction APIs

Verified from examples:

- Programs are built/deployed.
- Workflow functions are invoked using a generated WIT manifest.
- Transactions can be asserted by signature in e2e YAML.
- Example e2e flow includes `build`, `create_wallet`, `airdrop`, `deploy`, `invoke`, `assert transaction_succeeded`, and `expect_log`.

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/http-fetch/e2e-test.yaml>

Exact low-level RPC transaction method names: **UNKNOWN — needs verification**.

### RPC/node endpoints

Verified from official example README:

```text
http://devnet.rialo.io:4100
```

Source: <https://github.com/SubzeroLabs/rialo-examples/tree/main/venus/http-fetch>

### Devnet configuration

Partially verified:

- `rialo-testnet` repo exists and contains validator config directories/files such as `node0.testnet.rialo.io`, `node1.testnet.rialo.io`, `node2.testnet.rialo.io`, validator host folders, `common-config.yaml`, and `genesis-signatures.json`.

Source: <https://github.com/SubzeroLabs/rialo-testnet>

Exact chain/network identifier: **UNKNOWN — needs verification**.

## 2. Devnet setup

### Verified

- Install Rialo toolchain with `rialoman`.
- Generate a keypair:

```bash
rialo keytool generate
```

- Fund it:

```bash
rialo client airdrop
```

- Deploying requires the Rialo toolchain.
- Example devnet RPC:

```text
http://devnet.rialo.io:4100
```

Sources:

- <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/README.md>
- <https://github.com/SubzeroLabs/rialo-examples/tree/main/venus/http-fetch>

### Faucet

Verified:

```bash
rialo client airdrop
```

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/README.md>

Web faucet URL: **UNKNOWN — needs verification**.

### Explorer

Explorer URL: **UNKNOWN — needs verification**.

### Transaction status

Verified only indirectly:

```yaml
type: "transaction_succeeded"
signature: "${signatures.start_tx}"
```

Logs can be checked by transaction signature:

```yaml
type: "expect_log"
signature: "${signatures.start_tx}"
contains: "HttpFetch::Start"
```

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/http-fetch/e2e-test.yaml>

Exact CLI/API command for reading transaction status: **UNKNOWN — needs verification**.

## 3. Wallet setup

### CLI wallet setup

```bash
rialo keytool generate
rialo client airdrop
```

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/README.md>

### Browser wallet setup

Verified package:

```bash
npm install @rialo/wallet-standard
```

The npm search result says the package provides the standard wallet interface for Rialo Network applications and latest observed version is `0.1.1`.

Source: <https://www.npmjs.com/package/%40rialo/wallet-standard>

Exact browser wallet names, connection flow, Next.js example, and transaction signing methods: **UNKNOWN — needs verification**.

## 4. Transaction flow

### Verified example flow

The smallest verified deploy/invoke flow appears in `venus/http-fetch/e2e-test.yaml`:

1. Build program.
2. Create deployer wallet.
3. Airdrop funds.
4. Deploy binary.
5. Invoke workflow using generated manifest `wit/rialo-http-fetch-manifest.json`.
6. Assert transaction succeeded.
7. Assert logs contain expected text.

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/http-fetch/e2e-test.yaml>

### Minimal verified invocation shape

```yaml
instruction:
  type: manifest
  manifest: "wit/rialo-http-fetch-manifest.json"
  function: "start"
  nonce: "random"
  args:
    url: "http://example.com"
```

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/http-fetch/e2e-test.yaml>

### Transaction submission API

Exact CLI command syntax for deploy/invoke outside the YAML runner: **UNKNOWN — needs verification**.

## 5. Reactive transaction implementation

### Conceptual model

The official Rialo post defines reactive transactions as transactions with predicates. A predicate is stored onchain and evaluated during block execution. If the predicate becomes true, associated transaction logic triggers automatically.

Source: <https://www.rialo.io/posts/reactive-transactions-a-model-for-native-automation-on-rialo/>

The post says predicates may reference:

- Onchain state.
- State transitions in the same block.
- Events emitted by earlier transactions.
- Validator-attested oracle data.
- Time-based conditions.
- Results of earlier workflow steps.

### Current developer implementation found

The accessible official examples implement reactive/workflow behavior using the **Venus DSL** inside Rust:

```rust
use rialo_venus_proc_macro::rialo;

rialo! {
    workflow {
        state {
            ...
        }
        program {
            initiating fn start(...) -> ProgramResult { ... }
            handler fn handle_response(...) -> ProgramResult { ... }
            terminating fn finish(...) -> ProgramResult { ... }
        }
    }
}
```

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/http-fetch/src/lib.rs>

### Predicate/action terminology mapping

From verified examples:

- **State** is declared in a `state { ... }` block.
- **Entry points** are `initiating fn`.
- **External/async result callbacks** are `handler fn`.
- **Workflow completion** uses `terminating fn`.
- **Control functions** exist in larger examples as `control fn`.
- Time/reactive scheduling uses `AFTER <timestamp> CALL [handler]`.
- External Web2 calls use `AFTER report = [http_get ...] CALL [handler report: report]`.

Sources:

- <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/http-fetch/src/lib.rs>
- <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/price-alert/src/lib.rs>

### Minimal verified reactive/time example

```rust
AFTER self.next_check_timestamp
    CALL [execute_scheduled_check];
```

Then the handler schedules an HTTP GET and later schedules the next check:

```rust
AFTER report = [http_get url: &url headers: &headers]
    CALL [handle_scheduled_price_response report: report];

AFTER self.next_check_timestamp
    CALL [execute_scheduled_check];
```

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/price-alert/src/lib.rs>

### Deployment/query/testing

Verified:

- Build with Rust `cargo check --workspace`.
- Deployment requires Rialo toolchain.
- e2e YAML demonstrates deploy/invoke/assert workflow.
- Generated WIT manifest is used for invocation.

Sources:

- <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/README.md>
- <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/http-fetch/e2e-test.yaml>

Exact query APIs for deployed reactive workflows: **UNKNOWN — needs verification**.

## 6. Async transaction implementation

### `AFTER wait until`

The exact phrase `AFTER wait until` was not found in the accessible official source. The verified current implementation uses the **`AFTER ... CALL ...`** construct.

### Wait for external/Web2 HTTP result

```rust
AFTER response = [http_get url: &self.url] CALL [handle_response report: response];
```

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/http-fetch/src/lib.rs>

The comments explain:

- HTTP request does **not** execute onchain.
- It runs offchain on REX nodes.
- Validators execute inside a TEE.
- Result is posted back onchain.
- Framework invokes the handler.

### Wait until timestamp

```rust
AFTER self.next_check_timestamp
    CALL [execute_scheduled_check];
```

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/price-alert/src/lib.rs>

### External/Web2 operation result handling

The result type is `RexReport`, imported from:

```rust
use rialo_rex_processor_interface::state::RexReport;
use rialo_types::RexOutput;
```

The handler iterates over validator outputs:

```rust
for output in report.outputs() {
    match output {
        RexOutput::Success(response) => { ... }
        RexOutput::RexError(err) => { ... }
        RexOutput::UnserializableResponse(err) => { ... }
        _ => {}
    }
}
```

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/http-fetch/src/lib.rs>

### HTTP POST example

```rust
AFTER report = [http_post url: &url body: &body content_type: &content_type headers: &headers]
    CALL [handle_single_response endpoint: endpoint report: report];
```

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/multi-http-post/src/lib.rs>

### Smallest working official example

Use `venus/http-fetch`.

Why:

- It is explicitly described as the hello-internet example for Rialo.
- It demonstrates initiating → async HTTP GET → handler → terminating.
- It has an e2e YAML for build/deploy/invoke/assert.

Sources:

- <https://github.com/SubzeroLabs/rialo-examples/tree/main/venus/http-fetch>
- <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/http-fetch/src/lib.rs>
- <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/http-fetch/e2e-test.yaml>

## 7. Web2/external-data capabilities

### Verified capabilities

Rialo currently documents/examples the following Web2/external-data interactions:

- `http_get`
- `http_post`
- WebSocket feed examples are listed.
- TEE-backed WASM pipeline examples are listed.
- Encrypted TEE data example is listed.

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/README.md>

### REX

Verified from examples:

- REX nodes execute external HTTP work.
- The HTTP request runs offchain on REX nodes.
- Validators execute inside a TEE.
- Results are posted back onchain.
- Handlers receive a `RexReport`.
- A report can carry multiple validator responses.
- The example warns not to trust one numeric output; numeric feeds should aggregate, for example using a median.

Sources:

- <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/http-fetch/src/lib.rs>
- <https://github.com/SubzeroLabs/rialo-examples/tree/main/venus/http-fetch>

### Oracle/data feeds

Verified at a high level:

- Rialo Dev Portal describes Rialo Stream as native data feeds.
- Reactive transactions post says predicates can use validator-attested oracle data.
- Price Alert example fetches an external API and parses price JSON.

Sources:

- <https://rialo.io/for-devs>
- <https://www.rialo.io/posts/reactive-transactions-a-model-for-native-automation-on-rialo/>
- <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/price-alert/src/lib.rs>

Exact built-in oracle feed APIs and feed identifiers: **UNKNOWN — needs verification**.

### Encrypted/private execution

Verified at high level:

- Dev Portal says REX empowers confidential computing.
- Examples list `rex-wasm-pipeline` and `rex-wasm-crypto`, including encrypted data for the TEE.

Sources:

- <https://rialo.io/for-devs>
- <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/README.md>

Exact encryption API and deployment process: **UNKNOWN — needs verification**.

## 8. Next.js integration

### Verified facts

- There is an npm package `@rialo/wallet-standard`, latest observed version `0.1.1`, for Rialo Network wallet interface.
- Rialo examples are Rust/Venus programs, not Next.js applications.
- No official Next.js starter was found in accessible official sources.

Source: <https://www.npmjs.com/package/%40rialo/wallet-standard>

### Recommended architecture based on verified capabilities

Because the current examples are CLI/Rust/workflow oriented and because exact browser transaction APIs are not fully verified, the safest MVP architecture is:

```text
Browser / Next.js UI
→ Next.js backend API routes / server actions
→ Cost + supplier intelligence services
→ Procurement state database
→ Rialo CLI/SDK integration layer
→ Rialo devnet / Rialo programs
```

### Browser → wallet → Rialo?

Possible but **not yet verified enough** for MVP.

Use only after confirming:

- Which browser wallets support Rialo.
- How `@rialo/wallet-standard` exposes account connection.
- How transactions are built/signed/submitted in browser.
- Whether the wallet can sign Venus workflow invocations.

Status: **UNKNOWN — needs verification**.

### Browser → backend → Rialo?

Recommended for Phase 1/MVP, because:

- Product Phase 1 does not require user-controlled onchain settlement yet.
- Supplier analysis and landed-cost estimation should happen server-side anyway.
- Web2 scraping/API calls for 1688/Taobao/PDD/Alibaba are safer from a backend due to CORS, rate limits, anti-bot, and credential management.
- Rialo integration can be isolated behind a service interface until APIs stabilize.

## 9. Relevant official GitHub repositories

### `SubzeroLabs/rialo-examples`

URL: <https://github.com/SubzeroLabs/rialo-examples>

Purpose:

- Official runnable Rialo examples.
- Generated read-only mirror of `developer-frameworks/examples/` in `SubzeroLabs/rialo`.
- Built with Venus PDK.
- Contains examples relevant to Web2, workflows, REX, WASM, events, swaps, prediction market, compliant stablecoin, token redemption.

Language:

- Rust.

Important directories:

- `venus/http-fetch/` — smallest Web2 HTTP GET workflow.
- `venus/price-alert/` — recurring price monitor; best example for scheduled workflows.
- `venus/websocket-feed/` — WebSocket external data stream.
- `venus/rex-wasm-pipeline/` — TEE-backed WASM pipeline.
- `venus/rex-wasm-crypto/` — encrypted data for TEE.
- `venus/multi-http-post/` — multiple HTTP POST patterns.
- Other directories include event, swap, prediction market, stablecoin patterns.

Source: <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/README.md>

### `SubzeroLabs/rialo-testnet`

URL: <https://github.com/SubzeroLabs/rialo-testnet>

Purpose:

- For syncing pubkeys and configs during genesis.
- Contains testnet validator config folders and common config/genesis signatures.

Language:

- Config/YAML/JSON primarily.

Important files/directories visible:

- `node0.testnet.rialo.io`
- `node1.testnet.rialo.io`
- `node2.testnet.rialo.io`
- validator host directories
- `common-config.yaml`
- `genesis-signatures.json`

Source: <https://github.com/SubzeroLabs/rialo-testnet>

### `SubzeroLabs/wallet-standard`

URL: <https://github.com/SubzeroLabs/wallet-standard>

Purpose:

- Source repository for npm package `@rialo/wallet-standard`.

Language:

- Likely TypeScript/JavaScript, but exact language from accessible repo body was not retrieved.

Important directories/examples:

- **UNKNOWN — needs verification** because GitHub/raw content was not accessible enough through terminal fetch, and search result only confirmed package/repo existence.

### `SubzeroLabs/rialo`

URL: <https://github.com/SubzeroLabs/rialo>

Purpose:

- Referenced as the monorepo/homepage/repository for crates and source of `developer-frameworks/examples/`.

Status:

- Not publicly accessible/visible in available search/open results except as a referenced repository in official examples and crate metadata.

Sources:

- <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/README.md>
- <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/Cargo.toml>

## 10. Free development setup

### Verified free path

For no-budget development:

1. Use local Rust toolchain to type-check examples:

```bash
cargo check --workspace
```

2. Install Rialo toolchain via `rialoman`.
3. Generate dev wallet:

```bash
rialo keytool generate
```

4. Get devnet funds:

```bash
rialo client airdrop
```

5. Use devnet RPC:

```text
http://devnet.rialo.io:4100
```

6. Deploy/invoke example workflows using the manifest/e2e process.

Sources:

- <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/README.md>
- <https://github.com/SubzeroLabs/rialo-examples/tree/main/venus/http-fetch>
- <https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/venus/http-fetch/e2e-test.yaml>

### Unknown / not yet verified

- Whether there is a free local Rialo validator.
- Whether REX can be fully tested locally without paid infrastructure.
- Whether public devnet REX supports arbitrary external endpoints reliably.
- Any rate limits on `rialo client airdrop`.
- Whether devnet is permissionless for program deployment.
- Whether a public explorer is available.

All are **UNKNOWN — needs verification**.

## 11. What we should use for the import project

### Phase 1: Import intelligence / landed-cost calculator

Use Rialo minimally and honestly:

```text
Next.js UI
→ Next.js backend
→ Product URL parser
→ Supplier intelligence
→ Landed cost engine
→ Quote/procurement state
→ Optional Rialo proof/state anchor
```

For Phase 1, Rialo should **not** be forced into the calculator. The calculator can run offchain and only use Rialo when there is a trust/settlement boundary, such as:

- Anchoring a quote assumption snapshot.
- Recording procurement milestones.
- Creating a workflow for warehouse/QC/shipping confirmations.
- Later escrow/settlement once payment and fulfillment states are involved.

### Later procurement workflow

Rialo becomes more relevant when the workflow requires verifiable state transitions:

```text
Supplier selected
→ China warehouse receives goods
→ QC performed
→ Shipping method confirmed
→ Buyer accepts landed-cost update
→ Settlement condition satisfied
→ Payment released
```

Potential Rialo/Venus fit:

- `AFTER <timestamp> CALL [...]` for deadlines and timeout escalations.
- `AFTER report = [http_get/http_post ...] CALL [...]` for external confirmations where validators/REX can independently verify an API.
- `RexReport` handlers for warehouse/QC/shipping data returned from external APIs.
- REX TEE/WASM later for confidential supplier/payment logic, only after APIs are verified.

## 12. What we should NOT use yet

Do **not** rely on the following yet:

- Browser-side Rialo transactions in the MVP — exact wallet + transaction APIs are not verified.
- Hardcoded chain ID/network identifier — **UNKNOWN — needs verification**.
- Public explorer links — **UNKNOWN — needs verification**.
- Specific oracle feeds — only generic Rialo Stream and validator-attested data are documented at a high level.
- Encrypted/private REX execution for MVP — examples exist, but exact implementation details still need verification.
- `AFTER wait until` syntax — the verified syntax is `AFTER <timestamp> CALL [...]` and `AFTER report = [http_get/http_post ...] CALL [...]`.
- Any paid RPC/automation/oracle providers — no paid infrastructure appears necessary for initial local/type-check/devnet experimentation, but devnet availability/rate limits remain unverified.

## Proposed technical architecture

```text
Next.js App
  ├─ Public UI
  │   ├─ Product URL input
  │   ├─ Supplier analysis result
  │   ├─ SEA vs AIR landed-cost comparison
  │   ├─ Assumptions + confidence display
  │   └─ Procurement CTA
  │
  ├─ Next.js Backend / API Routes
  │   ├─ URL normalization
  │   ├─ Job orchestration
  │   ├─ Supplier intelligence API calls
  │   ├─ Cost-calculation API
  │   ├─ User/session management
  │   └─ Rialo integration adapter
  │
  ├─ Cost/Supplier Intelligence
  │   ├─ Marketplace parser: 1688 / Taobao / PDD / Alibaba
  │   ├─ Supplier risk scoring
  │   ├─ Product category inference
  │   ├─ China domestic freight estimate
  │   ├─ SEA freight estimate
  │   ├─ AIR freight estimate
  │   ├─ FX assumptions
  │   ├─ Nigeria duties/taxes assumptions
  │   └─ Confidence model
  │
  ├─ Procurement State
  │   ├─ Quote snapshot
  │   ├─ Supplier selected
  │   ├─ Warehouse pending/received
  │   ├─ QC pending/pass/fail
  │   ├─ Shipping pending/booked/in transit/arrived
  │   ├─ Payment pending/confirmed/released
  │   └─ Audit trail
  │
  └─ Rialo Layer
      ├─ Phase 1: optional quote/procurement-state anchoring
      ├─ Phase 2: Venus workflow for procurement milestones
      ├─ REX HTTP callbacks for external confirmations where practical
      ├─ Timeouts using AFTER <timestamp> CALL [...]
      └─ Settlement release conditions after verified workflow states
```

## Recommended MVP boundary

For the next implementation prompt, build the MVP as:

```text
Browser
→ Next.js backend
→ offchain intelligence/calculation
→ database quote/procurement state
→ Rialo adapter interface only
```

The Rialo adapter should initially be an abstraction with no assumptions baked in. Once Rialo SDK/CLI commands are fully verified, the adapter can be wired to:

- deploy/invoke Venus workflows,
- record quote assumptions,
- trigger procurement milestones,
- query transaction status,
- and later settle funds.

## Verification notes

Terminal commands used during reconnaissance:

- `git status --short`
- `find .. -name AGENTS.md -print`
- `curl -I -L --max-time 20 https://raw.githubusercontent.com/SubzeroLabs/rialo-examples/main/README.md` — blocked by environment proxy with HTTP 403.
- `curl -I -L --max-time 20 https://docs.rialo.io/user/latest/llms-full.txt` — blocked by environment proxy with HTTP 403.
