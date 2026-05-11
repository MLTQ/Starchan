# main.jsx

## Purpose
Bootstraps the browser runtime for the Graphchan React client. It imports React from bundled dependencies, exposes the globals expected by the prototype modules, and loads the modules in dependency order.

## Components

### Module bootstrap
- **Does**: Assigns `window.React` and `window.ReactDOM`, then imports API, theme, layout, graph, screen, and app modules.
- **Interacts with**: `app.jsx`, `screens.jsx`, `graphs.jsx`, `layout.jsx`, `themes.jsx`, `api.jsx`.
- **Rationale**: Keeps the existing multi-file prototype structure intact while making it bundleable by Vite and Tauri.

## Contracts

| Dependent | Expects | Breaking changes |
|-----------|---------|------------------|
| `graphchan.html` | `/src/main.jsx` starts the app | Changing entry path |
| Prototype modules | React globals exist before import | Removing global assignments |
