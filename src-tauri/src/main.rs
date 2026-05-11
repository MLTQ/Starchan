use graphchan_backend::config::GraphchanConfig;
use graphchan_backend::node::GraphchanNode;
use serde::Serialize;
use std::net::TcpListener;
use std::sync::{Arc, RwLock};

#[derive(Clone, Default)]
struct BackendState {
    inner: Arc<RwLock<BackendInfo>>,
}

#[derive(Clone, Default, Serialize)]
struct BackendInfo {
    api_base_url: Option<String>,
    api_token: Option<String>,
    ready: bool,
    error: Option<String>,
}

impl BackendState {
    fn set_starting(&self, api_base_url: String, api_token: Option<String>) {
        let mut info = self.inner.write().expect("backend state poisoned");
        *info = BackendInfo {
            api_base_url: Some(api_base_url),
            api_token,
            ready: false,
            error: None,
        };
    }

    fn set_ready(&self) {
        let mut info = self.inner.write().expect("backend state poisoned");
        info.ready = true;
        info.error = None;
    }

    fn set_error(&self, error: impl Into<String>) {
        let mut info = self.inner.write().expect("backend state poisoned");
        info.ready = false;
        info.error = Some(error.into());
    }

    fn get(&self) -> BackendInfo {
        self.inner.read().expect("backend state poisoned").clone()
    }
}

#[tauri::command]
fn graphchan_backend_info(state: tauri::State<'_, BackendState>) -> BackendInfo {
    state.get()
}

fn choose_api_port() -> anyhow::Result<u16> {
    let listener = TcpListener::bind(("127.0.0.1", 0))?;
    Ok(listener.local_addr()?.port())
}

fn start_backend(state: BackendState) -> anyhow::Result<()> {
    let mut config = GraphchanConfig::from_env()?;
    config.api_port = choose_api_port()?;
    let api_base_url = format!("http://127.0.0.1:{}", config.api_port);
    let api_token = config.auth.token.clone();

    state.set_starting(api_base_url, api_token);
    tauri::async_runtime::spawn(async move {
        match GraphchanNode::start(config).await {
            Ok(node) => {
                state.set_ready();
                if let Err(err) = node.run_http_server().await {
                    tracing::error!(error = ?err, "embedded Graphchan API stopped with error");
                    state.set_error(err.to_string());
                }
            }
            Err(err) => {
                tracing::error!(error = ?err, "failed to start embedded Graphchan backend");
                state.set_error(err.to_string());
            }
        }
    });

    Ok(())
}

fn main() {
    graphchan_backend::telemetry::init_tracing();
    let backend_state = BackendState::default();

    tauri::Builder::default()
        .manage(backend_state.clone())
        .invoke_handler(tauri::generate_handler![graphchan_backend_info])
        .setup(move |_| {
            start_backend(backend_state.clone())
                .map_err(|err| format!("failed to launch Graphchan backend: {err}"))?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Graphchan desktop app");
}
