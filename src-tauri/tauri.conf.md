# tauri.conf.json

## Purpose
Configures the Graphchan desktop shell. It points Tauri at the Vite-built frontend and defines the main application window.

## Components

### `build`
- **Does**: Runs Vite before dev/build and serves `graphchan.html` in dev mode.
- **Interacts with**: root `package.json` scripts and `Graphchan/vite.config.js`.

### `app.windows`
- **Does**: Creates a 1400x900 Graphchan window loading the bundled frontend entrypoint.
- **Interacts with**: `Graphchan/dist/graphchan.html`.

### `bundle`
- **Does**: Enables native Tauri bundling for supported targets.

## Contracts

| Dependent | Expects | Breaking changes |
|-----------|---------|------------------|
| Tauri CLI | Valid v2 config schema | Schema changes |
| Frontend build | `../Graphchan/dist` contains `graphchan.html` | Changing Vite output |
