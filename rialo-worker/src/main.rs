use anyhow::{anyhow, Context, Result};
use rialo_cdk::{
    keyring::{FileKeyringProvider, KeyringProvider},
    rpc::{types::Pubkey, HttpRpcClient},
    RpcClient, TransactionBuilder,
};
use serde::Serialize;
use std::{
    env,
    io::{self, Write},
    path::Path,
    str::FromStr,
    time::{SystemTime, UNIX_EPOCH},
};

use rialo_worker::{WalletSetupConfig, WorkerConfig, DEVNET_KEYRING_NAME, DEVNET_MNEMONIC_STRENGTH_BITS};

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
    match env::args().nth(1).as_deref() {
        Some("setup-wallet") => setup_wallet().await,
        Some(command) => Err(anyhow!("unsupported rialo-worker command: {command}")),
        None => run_transaction_worker().await,
    }
}

async fn setup_wallet() -> Result<()> {
    let config = WalletSetupConfig::new(FileKeyringProvider::default_path())?;
    let keyring_file = config.keyring_file();

    if keyring_file.exists() {
        return Err(anyhow!(
            "keyring already exists at {}; refusing to overwrite it",
            keyring_file.display()
        ));
    }

    std::fs::create_dir_all(&config.keyring_path).with_context(|| {
        format!("failed to create Rialo keyring directory {}", config.keyring_path.display())
    })?;

    let password = read_password_once("Enter password for new Rialo DevNet keyring: ")?;
    let confirmation = read_password_once("Confirm password for new Rialo DevNet keyring: ")?;
    if password != confirmation {
        return Err(anyhow!("keyring password confirmation did not match"));
    }
    if password.trim().is_empty() {
        return Err(anyhow!("keyring password must not be empty"));
    }

    let provider = FileKeyringProvider::new(Path::new(&config.keyring_path));
    let (created_keyring, mnemonic) = provider
        .create_with_mnemonic(&config.keyring_name, DEVNET_MNEMONIC_STRENGTH_BITS, &password)
        .await
        .context("failed to create encrypted Rialo keyring")?;
    let created_pubkey = created_keyring.pubkey();

    let loaded_keyring = provider
        .load(&config.keyring_name, &password)
        .await
        .context("created keyring could not be loaded with the supplied password")?;
    let loaded_pubkey = loaded_keyring.pubkey();
    if loaded_pubkey != created_pubkey {
        return Err(anyhow!("created keyring pubkey did not match reloaded keyring pubkey"));
    }

    println!("WALLET CREATED: YES");
    println!("KEYRING NAME: {DEVNET_KEYRING_NAME}");
    println!("PUBLIC ADDRESS: {created_pubkey}");
    println!("KEYRING DIRECTORY: {}", config.keyring_path.display());
    println!("KEYRING FILE: {}", keyring_file.display());
    println!("RELOAD VERIFIED: YES");
    println!("MNEMONIC GENERATED: YES");
    println!("RECOVERY MNEMONIC - SAVE THIS NOW; IT WILL NOT BE WRITTEN TO DISK:");
    println!("{mnemonic}");
    println!("RECOVERY: keep the encrypted keyring file, this password, and the mnemonic in a secure vault. Later load this wallet with FileKeyringProvider::new(KEYRING_DIRECTORY).load(\"{DEVNET_KEYRING_NAME}\", password). Use recover_from_mnemonic only if the encrypted keyring file is lost.");
    println!("FUNDED: UNKNOWN");

    Ok(())
}

fn read_password_once(prompt: &str) -> Result<String> {
    print!("{prompt}");
    io::stdout().flush().context("failed to flush password prompt")?;
    let mut password = String::new();
    io::stdin().read_line(&mut password).context("failed to read keyring password")?;
    Ok(password.trim_end_matches(['\r', '\n']).to_string())
}

async fn run_transaction_worker() -> Result<()> {
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
