# package.json

## Purpose
Defines the desktop app's JavaScript toolchain. Vite bundles the React frontend for Tauri, while the Tauri CLI drives development and production desktop builds.

## Components

### `dev:frontend`
- **Does**: Runs Vite against `Graphchan/vite.config.js` for Tauri development.
- **Interacts with**: Tauri `beforeDevCommand`.

### `build:frontend`
- **Does**: Produces static frontend assets in `Graphchan/dist`.
- **Interacts with**: Tauri `beforeBuildCommand`.

### `tauri:dev` / `tauri:build`
- **Does**: Starts or builds the Tauri desktop app.
- **Interacts with**: `src-tauri`.

## Contracts

| Dependent | Expects | Breaking changes |
|-----------|---------|------------------|
| `src-tauri/tauri.conf.json` | Script names remain stable | Renaming scripts |
| Frontend modules | React 18 runtime is bundled | Major React upgrade |
