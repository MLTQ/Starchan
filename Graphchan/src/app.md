# app.jsx

## Purpose
Owns the top-level Graphchan client shell, theme state, navigation, and live backend refresh cycle. It keeps `window.GC` synchronized with React state so the existing screen modules can render the latest backend data.

## Components

### `Sidebar`
- **Does**: Renders primary navigation, live unread DM badge, subscribed topic shortcuts, and local identity summary.
- **Interacts with**: `GC.TOPICS`, `GC.peerBy`, `GC.NETWORK_STATS`.

### `NetRail`
- **Does**: Shows backend-derived network counters and recent thread activity.
- **Interacts with**: `GC.NETWORK_STATS`, `GC.THREADS`.

### `TweaksPanel`
- **Does**: Applies local UI theme, density, and graph node preferences.
- **Interacts with**: `applyTheme` in `themes.jsx`, browser `localStorage`.

### `App`
- **Does**: Loads live Graphchan state, handles refreshes after mutations, and routes between catalog, thread, DM, friends, topics, and settings screens.
- **Interacts with**: `GCAPI` in `api.jsx`, screen components in `screens.jsx`.

## Contracts

| Dependent | Expects | Breaking changes |
|-----------|---------|------------------|
| `main.jsx` | Rendering `App` starts the UI | Removing root render |
| `screens.jsx` | Receives `onRefresh` for backend mutations | Dropping refresh prop |
| `api.jsx` | `GCAPI.load()` returns state compatible with `window.GC` | Renaming state fields |
