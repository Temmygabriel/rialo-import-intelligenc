use anyhow::{anyhow, Context, Result};
use std::{env, path::{Path, PathBuf}};

pub const DEFAULT_DEVNET_RPC_URL: &str = "http://devnet.rialo.io:4100";
pub const DEFAULT_TRANSFER_AMOUNT_KELVIN: u64 = 1;
pub const DEVNET_KEYRING_NAME: &str = "import-intelligence-devnet";
pub const DEVNET_MNEMONIC_STRENGTH_BITS: usize = 128;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WorkerConfig {
    pub network: String,
    pub rpc_url: String,
    pub keyring_path: String,
    pub keyring_name: String,
    pub keyring_password: String,
    pub recipient: String,
    pub amount_kelvin: u64,
}

impl WorkerConfig {
    pub fn from_env() -> Result<Self> {
        let network = required_env("RIALO_NETWORK")?;
        let rpc_url = env::var("RIALO_RPC_URL").unwrap_or_else(|_| DEFAULT_DEVNET_RPC_URL.to_string());
        validate_devnet(&network, &rpc_url)?;

        let amount_kelvin = env::var("RIALO_TRANSFER_AMOUNT_KELVIN")
            .ok()
            .map(|raw| raw.parse::<u64>().context("RIALO_TRANSFER_AMOUNT_KELVIN must be an unsigned integer"))
            .transpose()?
            .unwrap_or(DEFAULT_TRANSFER_AMOUNT_KELVIN);

        if amount_kelvin == 0 {
            return Err(anyhow!("RIALO_TRANSFER_AMOUNT_KELVIN must be greater than zero"));
        }

        Ok(Self {
            network,
            rpc_url,
            keyring_path: required_env("RIALO_KEYRING_PATH")?,
            keyring_name: required_env("RIALO_KEYRING_NAME")?,
            keyring_password: required_env("RIALO_KEYRING_PASSWORD")?,
            recipient: required_env("RIALO_RECIPIENT")?,
            amount_kelvin,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WalletSetupConfig {
    pub keyring_path: PathBuf,
    pub keyring_name: String,
}

impl WalletSetupConfig {
    pub fn new(default_keyring_path: PathBuf) -> Result<Self> {
        let keyring_path = env::var("RIALO_KEYRING_PATH")
            .map(PathBuf::from)
            .unwrap_or(default_keyring_path);
        ensure_keyring_outside_repo(&keyring_path)?;

        Ok(Self { keyring_path, keyring_name: DEVNET_KEYRING_NAME.to_string() })
    }

    pub fn keyring_file(&self) -> PathBuf {
        self.keyring_path.join(format!("{}.keyring", self.keyring_name))
    }
}

pub fn validate_devnet(network: &str, rpc_url: &str) -> Result<()> {
    if network != "devnet" {
        return Err(anyhow!("Rialo worker is DevNet-only: RIALO_NETWORK must be devnet"));
    }

    let normalized = rpc_url.to_ascii_lowercase();
    if normalized.contains("mainnet") || normalized.contains("production") || normalized.contains("prod") {
        return Err(anyhow!("Rialo worker refused a production-looking RPC URL"));
    }

    if !normalized.contains("devnet") {
        return Err(anyhow!("Rialo worker requires an explicit DevNet RPC URL"));
    }

    Ok(())
}

pub fn ensure_keyring_outside_repo(path: &Path) -> Result<()> {
    let repo = env::current_dir().context("failed to resolve current repository directory")?;
    let absolute = if path.is_absolute() { path.to_path_buf() } else { repo.join(path) };

    if absolute.starts_with(&repo) {
        return Err(anyhow!(
            "RIALO_KEYRING_PATH must point outside the Git repository; refusing to create keyring at {}",
            absolute.display()
        ));
    }

    Ok(())
}

fn required_env(name: &str) -> Result<String> {
    let value = env::var(name).with_context(|| format!("{name} is required"))?;
    if value.trim().is_empty() {
        return Err(anyhow!("{name} must not be empty"));
    }
    Ok(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_verified_devnet_url() {
        validate_devnet("devnet", DEFAULT_DEVNET_RPC_URL).expect("devnet should be accepted");
    }

    #[test]
    fn rejects_non_devnet_network() {
        let err = validate_devnet("mainnet", DEFAULT_DEVNET_RPC_URL).unwrap_err().to_string();
        assert!(err.contains("DevNet-only"));
    }

    #[test]
    fn rejects_production_looking_url() {
        let err = validate_devnet("devnet", "https://mainnet.rialo.io").unwrap_err().to_string();
        assert!(err.contains("production-looking"));
    }

    #[test]
    fn rejects_url_without_devnet_marker() {
        let err = validate_devnet("devnet", "https://rpc.rialo.io").unwrap_err().to_string();
        assert!(err.contains("explicit DevNet"));
    }

    #[test]
    fn reports_expected_keyring_file_name() {
        let config = WalletSetupConfig { keyring_path: PathBuf::from("/tmp/rialo-keyrings"), keyring_name: DEVNET_KEYRING_NAME.to_string() };
        assert_eq!(config.keyring_file(), PathBuf::from("/tmp/rialo-keyrings/import-intelligence-devnet.keyring"));
    }
}
