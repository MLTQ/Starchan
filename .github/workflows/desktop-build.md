# desktop-build.yml

## Purpose
Builds Graphchan desktop artifacts on pushes to `master` and on manual dispatch. The workflow follows the OrbWeaver release workflow pattern but targets only the new Tauri desktop app for macOS and Linux.

## Components

### `build-macos`
- **Does**: Installs Rust and Node, runs `npm ci`, then runs `npm run tauri:build`.
- **Interacts with**: `package.json`, `src-tauri/tauri.conf.json`, `Cargo.toml`.
- **Artifact**: Uploads `target/release/graphchan_desktop` and `target/release/bundle/macos/Graphchan.app`.

### `build-linux`
- **Does**: Installs GTK/WebKit/Tauri system dependencies, installs Rust and Node, builds frontend assets, then builds the release Tauri executable with Cargo.
- **Interacts with**: Vite output in `Graphchan/dist`, Tauri build script, workspace Cargo lockfile.
- **Artifact**: Uploads `target/release/graphchan_desktop`.

## Contracts

| Dependent | Expects | Breaking changes |
|-----------|---------|------------------|
| GitHub Actions | Workflow triggers on pushes to `master` | Renaming branch trigger |
| `package.json` | `npm run tauri:build` and `npm run build:frontend` exist | Renaming scripts |
| Tauri build | `Graphchan/dist` exists before Linux Cargo build | Changing Vite output path |

## Notes
- The workspace-level vendored crypto patches replace OrbWeaver's `scripts/patch_deps.sh`, so no patch script is invoked here.
