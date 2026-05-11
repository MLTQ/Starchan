# vite.config.js

## Purpose
Configures Vite to bundle the existing `graphchan.html` entrypoint and React modules into static assets for Tauri.

## Components

### Default Vite config
- **Does**: Uses `Graphchan` as the frontend root, writes builds to `Graphchan/dist`, and treats `graphchan.html` as the HTML entry.
- **Interacts with**: `package.json` scripts and `src-tauri/tauri.conf.json`.

## Contracts

| Dependent | Expects | Breaking changes |
|-----------|---------|------------------|
| Tauri config | `npm run build:frontend` creates `Graphchan/dist` | Changing `outDir` |
| Browser dev | Vite serves `/graphchan.html` on port 5173 | Changing `server.port` |
