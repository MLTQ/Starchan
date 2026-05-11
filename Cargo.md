# Cargo.toml

## Purpose
Defines the repo-level Rust workspace for the extracted backend and the new Tauri desktop shell. It also carries the dependency patches required by the inherited backend cryptography stack.

## Components

### Workspace members
- **Does**: Builds `graphchan_backend` and `src-tauri` under one resolver and lockfile.
- **Interacts with**: Cargo commands run from the repository root.

### `[patch.crates-io]`
- **Does**: Pins `ed25519` and `ed25519-dalek` to the vendored revisions used by the original OrbWeaver workspace.
- **Rationale**: Prevents Cargo from resolving incompatible prerelease `pkcs8`/`ed25519-dalek` combinations.

## Contracts

| Dependent | Expects | Breaking changes |
|-----------|---------|------------------|
| `src-tauri` | Backend crypto dependencies resolve through workspace patches | Removing patches |
| `graphchan_backend` | Existing backend package remains a workspace member | Moving crate path |
