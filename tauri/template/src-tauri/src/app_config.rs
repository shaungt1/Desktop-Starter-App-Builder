//! Runtime configuration written by the builder from the project plan
//! (app.config.json at the project root), compiled into the binary.
//! Contains no secrets.

use std::sync::LazyLock;

use serde::Deserialize;
use serde_json::{Map, Value};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub name: String,
    pub app_id: String,
    pub scheme: String,
    pub version: String,
    pub profile: String,
    pub remote_url: Option<String>,
    pub allowed_origins: Vec<String>,
    pub repository: Option<String>,
    pub modules: Vec<String>,
    pub module_options: Map<String, Value>,
}

static CONFIG: LazyLock<AppConfig> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../../app.config.json")).expect("app.config.json is invalid")
});

pub fn app_config() -> &'static AppConfig {
    &CONFIG
}

/// One option for one module, e.g. `module_option("auth-oidc", "issuer")`.
pub fn module_option(module: &str, key: &str) -> Option<&'static Value> {
    app_config().module_options.get(module)?.get(key)
}

/// A string option, or `None` when missing or empty.
pub fn module_option_str(module: &str, key: &str) -> Option<&'static str> {
    module_option(module, key)?.as_str().filter(|value| !value.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_config_parses() {
        let config = app_config();
        assert!(!config.name.is_empty());
        assert!(config.app_id.contains('.'));
    }
}
