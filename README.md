# Starchan / Graphchan

**Starchan is a Tauri frontend for Graphchan, a decentralized encrypted imageboard backend.**

This repository bundles a new web/Tauri frontend with the Graphchan backend. The goal is to keep the backend protocol and REST API open enough that multiple frontends can exist: Starchan is this repo's frontend, Graphchan is the backend, and other clients can talk to the same local API.
<img width="1435" height="889" alt="image" src="https://github.com/user-attachments/assets/8d050bac-d75e-4e07-b52b-3f7c78bf779d" />

## Related Frontends

The native Rust frontend is [MLTQ/OrbWeaver](https://github.com/MLTQ/OrbWeaver), a sibling/reference implementation that is useful when comparing Graphchan API usage, desktop lifecycle, or native Rust UI behavior.

## What Graphchan Does

Graphchan is a peer-to-peer discussion system where:

- Threads and posts are signed with local cryptographic identity keys.
- Content propagates between peers through gossip and topic discovery.
- Data is local-first: your node stores its own database and files.
- Conversations are DAG-shaped, so replies can branch instead of forcing one linear thread.
- Frontends are replaceable: anything that can call the REST API can become a Graphchan client.

## Repository Layout

- `Graphchan/`: Starchan frontend source. This is the React/Vite UI packaged by Tauri.
- `graphchan_backend/`: Graphchan backend crate. It owns SQLite storage, identity, P2P networking, files, DMs, topics, blocking, and the REST API.
- `src-tauri/`: Tauri shell. It launches the embedded Graphchan backend and loads the Starchan frontend.
- `vendor/`: vendored crypto prerelease patches inherited from the backend dependency stack.
- `.github/workflows/desktop-build.yml`: CI build for macOS and Linux on pushes to `master`.

## Quick Start

### Run the Built App

After a release build, run the executable:

```bash
./target/release/graphchan_desktop
```

On macOS you can also open the app bundle:

```bash
open target/release/bundle/macos/Graphchan.app
```

The app starts a local Graphchan backend in the same process, then the Starchan UI connects to that backend automatically.

### Development

Install dependencies:

```bash
npm install
```

Run the Tauri app in development mode:

```bash
npm run tauri:dev
```

Build only the frontend:

```bash
npm run build:frontend
```

Build the desktop app:

```bash
npm run tauri:build
```

Current build outputs:

```text
target/release/graphchan_desktop
target/release/bundle/macos/Graphchan.app
```

## Running Backend and Frontend Separately

The backend can be run as a standalone REST API server:

```bash
cargo run -p graphchan_backend -- serve
```

By default it listens on `http://127.0.0.1:8080`, with port fallback if that port is already in use.

For frontend development against a separate backend:

```bash
npm run dev:frontend
```

Starchan uses `localStorage.gc_api_base` or the `?api=` query parameter when it is not running inside Tauri. Example:

```text
http://127.0.0.1:5173/graphchan.html?api=http://127.0.0.1:8080
```

## Packaging and CI

Local release build:

```bash
npm run tauri:build
```

GitHub Actions builds macOS and Linux artifacts on pushes to `master` and on manual dispatch:

- macOS: uploads `target/release/graphchan_desktop` and `target/release/bundle/macos/Graphchan.app`
- Linux: uploads `target/release/graphchan_desktop`

The CI workflow uses the workspace-level vendored crypto patches in this repo.

## Core Concepts

### Friends and Friend Codes

Friend codes are how nodes discover and trust each other for direct peer connections. A friend code may be short, containing identity information, or long, containing additional relay/address information useful for NAT traversal.

In Starchan:

1. Open `friends`.
2. Use `show my friendcode` to copy your code.
3. Use `add friend` to paste another node's code.

Friend codes are one-way. For bidirectional following, both people should add each other.

### Threads and Posts

A thread is a DAG of posts. A post can reply to one or more parents, which lets a conversation branch without treating every side discussion as derailment. Starchan renders this as graph, tree, timeline, and list views.

### Topics

Topics are public discovery channels. Following a topic announces your interest and lets your node discover other peers posting about the same topic without making those peers permanent friends.

### Files

Files are stored locally and announced through the backend. The frontend uses the backend upload and download endpoints; file availability may depend on whether peers are online and whether the content has already been fetched.

### Direct Messages

DMs are encrypted by the backend. Starchan lists conversations, shows unread counts from the backend, and sends messages through the Graphchan DM API.

## Graphchan REST API

Graphchan exposes a local REST API. Main route groups include:

- `/health`: node health, identity, and network status.
- `/threads`: list/create/fetch threads, create posts, download announced threads.
- `/posts`: recent posts, reactions, and post files.
- `/files` and `/blobs`: file and blob access.
- `/peers`: local identity and followed peers.
- `/topics`: subscribe/unsubscribe topic discovery.
- `/dms`: conversations, encrypted messages, unread counts.
- `/blocking`: peer and IP blocking.
- `/settings`: local settings.

This API is the boundary that allows Starchan and future clients to share the same backend.

## Model Context Protocol

The Graphchan backend has MCP-oriented support for external AI tools and agents. MCP clients can use a Graphchan server process to inspect threads, read posts, send DMs, and work with local node data through the backend API.

Example MCP configuration shape:

```json
{
  "mcpServers": {
    "graphchan": {
      "command": "/absolute/path/to/graphchan_mcp",
      "args": []
    }
  }
}
```

## Configuration

Useful environment variables:

- `GRAPHCHAN_API_PORT`: backend server port, default `8080` outside Tauri.
- `GRAPHCHAN_API_TOKEN`: optional bearer token for the REST API.
- `GRAPHCHAN_CORS_ORIGINS`: comma-separated allowed CORS origins.
- `GRAPHCHAN_RELAY_URL`: optional relay URL override.
- `GRAPHCHAN_PUBLIC_ADDRS`: comma-separated public address hints.
- `GRAPHCHAN_DISABLE_DHT`: set to `1` or `true` to disable DHT discovery.
- `GRAPHCHAN_DISABLE_MDNS`: set to `1` or `true` to disable mDNS discovery.
- `GRAPHCHAN_MAX_UPLOAD_BYTES`: backend upload body limit.

## Storage

Graphchan is portable by design. The backend derives its storage paths from the executable location and creates local directories for:

- SQLite database
- keys
- uploaded/downloaded files
- blob store
- logs

The Tauri app starts the backend in-process, so moving the built app directory moves the node state with it when the data directories live beside the executable.

## Current Status

Starchan is the current frontend revision in this repository. It is wired to live Graphchan backend data and no longer uses the original mock dataset.
