# screens.jsx

## Purpose
Contains the main user-facing Graphchan screens and their backend-backed interactions. Screen components render the normalized `window.GC` view model and call `GCAPI` for mutations.

## Components

### `Catalog` / `NewThreadModal`
- **Does**: Lists threads, filters by search/topic/sync state, and creates new threads with optional files.
- **Interacts with**: `GC.THREADS`, `GCAPI.createThread`, `onRefresh`.

### `ThreadView` / `Composer`
- **Does**: Displays a thread as a graph/list/timeline, downloads announced threads, creates replies, uploads post files, and blocks authors.
- **Interacts with**: `DagCanvas` in `graphs.jsx`, `GCAPI.downloadThread`, `GCAPI.createPost`, `GCAPI.blockPeer`.

### `DMs`
- **Does**: Lists conversations, renders decrypted messages, and sends encrypted DMs through the backend.
- **Interacts with**: `GC.DMS`, `GCAPI.sendDm`.

### `Friends`
- **Does**: Shows known peers, displays the local friendcode, adds peers from friendcodes, and blocks peers.
- **Interacts with**: `GC.PEERS`, `GCAPI.addPeer`, `GCAPI.blockPeer`.

### `Topics`
- **Does**: Lists known/subscribed topics, subscribes/unsubscribes, and opens catalog filters.
- **Interacts with**: `GC.TOPICS`, `GCAPI.subscribeTopic`, `GCAPI.unsubscribeTopic`.

### `Settings`
- **Does**: Shows backend-derived identity, storage, relay, API, and operational status.
- **Interacts with**: `GC.HEALTH`, `GC.NETWORK_STATS`.

## Contracts

| Dependent | Expects | Breaking changes |
|-----------|---------|------------------|
| `app.jsx` | Screen components accept navigation and refresh props | Renaming props |
| `api.jsx` | `GCAPI` methods throw `Error` on failed backend actions | Returning silent failures |
| `graphs.jsx` | Thread posts have `id`, `author`, `parents`, `createdAt`, `files` | Changing normalized post shape |
