# api.jsx

## Purpose
Connects the React UI to the Graphchan REST backend and translates backend DTOs into the existing graph-oriented view model. This replaces the prior mock `GC` dataset with live state that can be refreshed after mutations.

## Components

### `loadGraphchanState`
- **Does**: Detects the backend URL, fetches health, identity, peers, topics, threads, and DM summaries, then populates `window.GC`.
- **Interacts with**: Backend routes `/health`, `/peers/self`, `/peers`, `/topics`, `/threads`, `/dms/conversations`.
- **Rationale**: Keeps the existing prototype components working while the app migrates from global mock data to explicit state.

### `normalizePeer`, `normalizeThreadDetails`, `normalizeThreadCard`, `normalizePost`
- **Does**: Converts Rust API response fields into the UI's expected peer/thread/post shapes.
- **Interacts with**: `PeerChip`, `Catalog`, `ThreadView`, and graph layouts.

### `GCAPI`
- **Does**: Exposes mutation helpers for creating threads/posts, uploading files, downloading announced threads, peer management, topic subscriptions, DMs, blocking, and profile updates.
- **Interacts with**: Screen components that perform user actions.

## Contracts

| Dependent | Expects | Breaking changes |
|-----------|---------|------------------|
| `app.jsx` | `GCAPI.load()` returns a complete `GC` state object | Removing globals or renaming state fields |
| `screens.jsx` | `GCAPI` mutation methods throw user-readable `Error` messages | Changing method names or payload shapes |
| Tauri shell | `graphchan_backend_info` may return `{ api_base_url, api_token }` | Renaming command fields |

## Notes
- Browser/dev fallback uses `localStorage.gc_api_base` or `http://127.0.0.1:8080`.
- Tauri mode asks the shell for the embedded backend URL via `window.__TAURI__.core.invoke`.
