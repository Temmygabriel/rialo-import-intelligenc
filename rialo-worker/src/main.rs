use anyhow::{Context, Result};
use rialo_cdk::{
    keyring::{FileKeyringProvider, KeyringProvider},
    rpc::{types::Pubkey, HttpRpcClient},
    RpcClient, TransactionBuilder,
};
use serde::Serialize;
use std::{path::Path, str::FromStr, time::{SystemTime, UNIX_EPOCH}};

use rialo_worker::WorkerConfig;

#[derive(Debug, Serialize)]
struct WorkerOutput {
    success: bool,
    network: String,
    rpc_url: String,
    payer: String,
    recipient: String,
    amount_kelvin: u64,
    signature: String,
    confirmed: bool,
    confirmation_error: Option<String>,
    signature_statuses: serde_json::Value,
    transaction: serde_json::Value,
}

#[tokio::main]
async fn main() -> Result<()> {
    let config = WorkerConfig::from_env()?;
    let client = HttpRpcClient::new(config.rpc_url.clone());

    let provider = FileKeyringProvider::new(Path::new(&config.keyring_path));
    let keyring = provider
        .load(&config.keyring_name, &config.keyring_password)
        .await
        .context("failed to load Rialo keyring with FileKeyringProvider")?;

    let payer = keyring.pubkey();
    let recipient = Pubkey::from_str(&config.recipient).context("RIALO_RECIPIENT must be a valid Rialo public key")?;
    let valid_from = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .context("system clock is before Unix epoch")?
        .as_millis() as i64;
    let config_hash_prefix = client
        .get_config_hash_prefix()
        .await
        .context("failed to fetch Rialo validator config hash prefix")?;

    let signed_transaction = TransactionBuilder::new(payer, valid_from, config_hash_prefix)
        .add_transfer_instruction(&payer, &recipient, config.amount_kelvin)
        .sign(&keyring)
        .context("failed to build and sign transfer transaction")?;

    let confirmation = client
        .send_and_confirm_transaction(&signed_transaction, None)
        .await
        .context("failed to submit and confirm Rialo transaction")?;

    let signature = rialo_cdk::generated::types::Signature::from_str(&confirmation.signature)
        .context("confirmed transaction returned an invalid signature")?;
    let signature_statuses = client
        .get_signature_statuses(&[signature])
        .await
        .context("failed to retrieve Rialo signature status")?;
    let transaction = client
        .get_transaction(&signature)
        .await
        .context("failed to retrieve Rialo transaction")?;

    let output = WorkerOutput {
        success: confirmation.executed && confirmation.err.is_none(),
        network: config.network,
        rpc_url: config.rpc_url,
        payer: payer.to_string(),
        recipient: recipient.to_string(),
        amount_kelvin: config.amount_kelvin,
        signature: confirmation.signature,
        confirmed: confirmation.executed,
        confirmation_error: confirmation.err,
        signature_statuses: serde_json::to_value(signature_statuses).unwrap_or_else(|err| serde_json::json!({ "serialization_error": err.to_string() })),
        transaction: serde_json::to_value(transaction).unwrap_or_else(|err| serde_json::json!({ "serialization_error": err.to_string() })),
    };

    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}
