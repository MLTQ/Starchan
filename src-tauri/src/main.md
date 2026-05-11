# main.rs

## Purpose
Tauri desktop entrypoint that embeds the Graphchan backend and exposes the selected local API URL to the frontend. This lets one desktop executable run both the Rust node and the React UI.

## Components

### `BackendState`
- **Does**: Stores the API base URL, auth token, readiness, and startup error for frontend lookup.
- **Interacts with**: `graphchan_backend_info` command and backend startup task.

### `graphchan_backend_info`
- **Does**: Returns backend connection metadata to JavaScript via Tauri invoke.
- **Interacts with**: `api.jsx` frontend backend detection.

### `start_backend`
- **Does**: Loads Graphchan config, chooses a free local API port, starts `GraphchanNode`, and runs the Axum REST server on a background task.
- **Interacts with**: `GraphchanConfig`, `GraphchanNode::start`, `GraphchanNode::run_http_server`.

### `main`
- **Does**: Initializes tracing, registers Tauri state/commands, and starts the desktop app.
- **Interacts with**: `tauri.conf.json`.

## Contracts

| Dependent | Expects | Breaking changes |
|-----------|---------|------------------|
| `api.jsx` | Command `graphchan_backend_info` returns `api_base_url` and optional `api_token` | Renaming serialized fields |
| Backend crate | `GraphchanConfig::from_env` and `GraphchanNode` APIs remain available | Lifecycle API changes |
| Tauri config | `src/main.rs` is the desktop binary entrypoint | Moving source path |
