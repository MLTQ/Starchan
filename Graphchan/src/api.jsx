/* Live Graphchan REST adapter and UI view-model normalization. */

const EMPTY_GC = {
  PEERS: [],
  peerBy: {},
  TOPICS: [],
  THREADS: [],
  THREAD_BY_ID: {},
  DMS: [],
  NETWORK_STATS: {
    peers_connected: 0,
    peers_known: 0,
    relays: 0,
    topics_subscribed: 0,
    threads_mine: 0,
    threads_cached: 0,
    messages_unread: 0,
    blobs_bytes: 0,
    uptime: "starting",
  },
  UNREAD_THREADS: new Set(),
  UNREAD_POSTS: {},
  SELF_ID: null,
  HEALTH: null,
  API_BASE: null,
  API_TOKEN: null,
  LOAD_ERROR: null,
};

window.GC = EMPTY_GC;

function hashColor(seed) {
  const colors = ["#5ab8ff", "#5affa3", "#ffd05a", "#ff5a7a", "#a07cff", "#5affd0", "#ff9ad5"];
  let h = 0;
  for (let i = 0; i < String(seed || "").length; i++) h = (h * 31 + String(seed).charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

function shortId(value, fallback = "unknown") {
  if (!value) return fallback;
  const str = String(value);
  return str.length > 14 ? `${str.slice(0, 8)}…${str.slice(-4)}` : str;
}

function displayName(peer) {
  return peer?.username || peer?.alias || shortId(peer?.gpg_fingerprint || peer?.id);
}

function timeAgo(value) {
  const t = Date.parse(value || "");
  if (!Number.isFinite(t)) return "now";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function numericTime(value, index) {
  const t = Date.parse(value || "");
  return Number.isFinite(t) ? t : index;
}

function fileLabel(file) {
  if (!file) return "file";
  if (typeof file === "string") return file;
  return file.original_name || file.path || file.download_url || file.id || "file";
}

function normalizePeer(peer, selfId) {
  const id = peer?.id || peer?.gpg_fingerprint || "unknown";
  const alias = displayName(peer);
  const trust = peer?.trust_state || "unknown";
  const agents = peer?.agents || [];
  return {
    id,
    alias,
    fp: peer?.gpg_fingerprint || id,
    color: hashColor(id),
    role: id === selfId ? "self" : agents.length ? "agent" : trust === "blocked" ? "blocked" : "friend",
    online: Boolean(peer?.last_seen),
    friendcode: peer?.friendcode || null,
    shortFriendcode: peer?.short_friendcode || null,
    raw: peer,
  };
}

function ensurePeer(peerBy, id, selfId) {
  if (!id) id = "unknown";
  if (!peerBy[id]) {
    peerBy[id] = normalizePeer({ id, gpg_fingerprint: id, alias: shortId(id) }, selfId);
  }
  return peerBy[id];
}

function normalizePost(post, index, selfId) {
  return {
    id: post.id,
    threadId: post.thread_id,
    author: post.author_peer_id || selfId || "unknown",
    body: post.body || "",
    parents: post.parent_post_ids || [],
    createdAt: numericTime(post.created_at, index),
    createdAtRaw: post.created_at,
    files: (post.files || []).map(fileLabel),
    fileViews: post.files || [],
    redacted: false,
    reason: null,
    raw: post,
  };
}

function normalizeThreadDetails(details, selfId) {
  const thread = details.thread || {};
  const posts = (details.posts || []).map((post, index) => normalizePost(post, index, selfId));
  const files = posts.reduce((n, post) => n + (post.files?.length || 0), 0);
  return {
    id: thread.id,
    title: thread.title || "untitled thread",
    topics: thread.topics || [],
    creator: thread.creator_peer_id || posts[0]?.author || selfId || "unknown",
    visibility: thread.visibility || "social",
    createdAt: numericTime(thread.created_at, 0),
    createdAtRaw: thread.created_at,
    sync: thread.sync_status || "downloaded",
    peers: details.peers?.length || new Set(posts.map((p) => p.author)).size,
    posts,
    files,
    raw: details,
  };
}

function normalizeThreadCard(details, fallback, selfId) {
  const thread = normalizeThreadDetails(details || { thread: fallback, posts: [], peers: [] }, selfId);
  const op = thread.posts[0];
  return {
    id: thread.id,
    title: thread.title,
    op: thread.creator,
    posts: thread.posts.length,
    files: thread.files,
    last: timeAgo(thread.posts.at(-1)?.createdAtRaw || thread.createdAtRaw),
    topics: thread.topics,
    sync: thread.sync,
    pinned: Boolean((details?.thread || fallback)?.pinned),
    preview: op?.body || "[no posts yet]",
    raw: details?.thread || fallback,
  };
}

async function tauriBackendInfo() {
  const invoke = window.__TAURI__?.core?.invoke;
  if (!invoke) return null;
  return invoke("graphchan_backend_info");
}

function configuredApiBase() {
  const qs = new URLSearchParams(window.location.search);
  return qs.get("api") || localStorage.getItem("gc_api_base") || "http://127.0.0.1:8080";
}

async function detectBackend() {
  const tauri = await tauriBackendInfo().catch(() => null);
  if (tauri?.api_base_url) {
    return { apiBase: tauri.api_base_url, apiToken: tauri.api_token || null };
  }
  return {
    apiBase: configuredApiBase().replace(/\/$/, ""),
    apiToken: localStorage.getItem("gc_api_token") || null,
  };
}

async function requestJson(path, options = {}) {
  const backend = window.GC?.API_BASE ? { apiBase: window.GC.API_BASE, apiToken: window.GC.API_TOKEN } : await detectBackend();
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (backend.apiToken) headers.set("Authorization", `Bearer ${backend.apiToken}`);
  const res = await fetch(`${backend.apiBase}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      message = body.message || message;
    } catch (_) {}
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function requestStatus(path, options = {}) {
  await requestJson(path, options);
  return true;
}

async function loadGraphchanState() {
  const { apiBase, apiToken } = await detectBackend();
  const headers = apiToken ? { Authorization: `Bearer ${apiToken}` } : {};

  async function get(path, fallback) {
    try {
      const res = await fetch(`${apiBase}${path}`, { headers });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (err) {
      if (fallback !== undefined) return fallback;
      throw err;
    }
  }

  const [health, selfPeer, peers, subscribedTopics, summaries, conversations, unread] = await Promise.all([
    get("/health", null),
    get("/peers/self", null),
    get("/peers", []),
    get("/topics", []),
    get("/threads?limit=100", []),
    get("/dms/conversations", []),
    get("/dms/unread/count", { count: 0 }),
  ]);

  const selfId = selfPeer?.id || health?.identity?.gpg_fingerprint || null;
  const allPeers = [selfPeer, ...peers].filter(Boolean);
  const peerBy = {};
  allPeers.forEach((peer) => {
    peerBy[peer.id] = normalizePeer(peer, selfId);
  });

  const detailPairs = await Promise.all(
    summaries.map(async (summary) => {
      try {
        return [summary.id, await get(`/threads/${encodeURIComponent(summary.id)}`, null)];
      } catch (_) {
        return [summary.id, null];
      }
    })
  );

  const threadById = {};
  const cards = [];
  const topicSet = new Set(subscribedTopics || []);
  let fileCount = 0;

  for (const summary of summaries) {
    const details = detailPairs.find(([id]) => id === summary.id)?.[1];
    const normalized = details ? normalizeThreadDetails(details, selfId) : normalizeThreadDetails({ thread: summary, posts: [], peers: [] }, selfId);
    threadById[normalized.id] = normalized;
    cards.push(normalizeThreadCard(details, summary, selfId));
    normalized.topics.forEach((topic) => topicSet.add(topic));
    normalized.posts.forEach((post) => ensurePeer(peerBy, post.author, selfId));
    (details?.peers || []).forEach((peer) => {
      peerBy[peer.id] = normalizePeer(peer, selfId);
    });
    fileCount += normalized.files;
  }

  const dms = await Promise.all(
    conversations.map(async (conv) => {
      const messages = await get(`/dms/${encodeURIComponent(conv.peer_id)}/messages?limit=100`, []);
      ensurePeer(peerBy, conv.peer_id, selfId);
      return {
        peer: conv.peer_id,
        last: conv.last_message_preview || "",
        at: timeAgo(conv.last_message_at),
        unread: conv.unread_count || 0,
        messages: messages.map((message) => ({
          id: message.id,
          from: message.from_peer_id,
          to: message.to_peer_id,
          body: message.body,
          at: timeAgo(message.created_at),
          raw: message,
        })),
        raw: conv,
      };
    })
  );

  const topics = Array.from(topicSet)
    .sort((a, b) => a.localeCompare(b))
    .map((id) => ({
      id,
      name: id,
      peers: 0,
      unread: 0,
      subscribed: subscribedTopics.includes(id),
      trend: "+0",
    }));

  const peerList = Object.values(peerBy);
  const state = {
    PEERS: peerList,
    peerBy,
    TOPICS: topics,
    THREADS: cards,
    THREAD_BY_ID: threadById,
    DMS: dms,
    NETWORK_STATS: {
      peers_connected: peerList.filter((p) => p.online && p.role !== "self").length,
      peers_known: Math.max(0, peerList.length - 1),
      relays: health?.network?.addresses?.filter((a) => a.startsWith("http")).length || 0,
      topics_subscribed: subscribedTopics.length,
      threads_mine: cards.filter((t) => t.op === selfId).length,
      threads_cached: cards.length,
      messages_unread: unread?.count || 0,
      blobs_bytes: 0,
      uptime: health ? "live" : "offline",
    },
    UNREAD_THREADS: new Set(),
    UNREAD_POSTS: {},
    SELF_ID: selfId,
    HEALTH: health,
    API_BASE: apiBase,
    API_TOKEN: apiToken,
    LOAD_ERROR: null,
    TOTAL_FILES: fileCount,
  };

  window.GC = state;
  return state;
}

async function uploadPostFiles(postId, files) {
  for (const file of files || []) {
    const data = new FormData();
    data.append("file", file.raw || file);
    await requestJson(`/posts/${encodeURIComponent(postId)}/files`, {
      method: "POST",
      body: data,
    });
  }
}

const GCAPI = {
  load: loadGraphchanState,
  async createThread({ title, body, topics, files }) {
    const data = new FormData();
    data.append(
      "json",
      new Blob([JSON.stringify({ title, body, topics, visibility: "social" })], { type: "application/json" })
    );
    for (const file of files || []) data.append("file", file.raw || file);
    return requestJson("/threads", { method: "POST", body: data });
  },
  async createPost(threadId, { body, parentPostIds = [], files = [] }) {
    const response = await requestJson(`/threads/${encodeURIComponent(threadId)}/posts`, {
      method: "POST",
      body: JSON.stringify({ thread_id: threadId, body, parent_post_ids: parentPostIds }),
    });
    const post = response?.post || response;
    if (post?.id) await uploadPostFiles(post.id, files);
    return post;
  },
  downloadThread(threadId) {
    return requestJson(`/threads/${encodeURIComponent(threadId)}/download`, { method: "POST" });
  },
  addPeer(friendcode) {
    return requestJson("/peers", { method: "POST", body: JSON.stringify({ friendcode }) });
  },
  subscribeTopic(topicId) {
    return requestStatus("/topics", { method: "POST", body: JSON.stringify({ topic_id: topicId }) });
  },
  unsubscribeTopic(topicId) {
    return requestStatus(`/topics/${encodeURIComponent(topicId)}`, { method: "DELETE" });
  },
  sendDm(toPeerId, body) {
    return requestJson("/dms/send", { method: "POST", body: JSON.stringify({ to_peer_id: toPeerId, body }) });
  },
  markConversationRead(peerId) {
    return requestJson(`/dms/${encodeURIComponent(peerId)}/read`, { method: "POST" });
  },
  blockPeer(peerId) {
    return requestStatus(`/blocking/peers/${encodeURIComponent(peerId)}`, { method: "POST" });
  },
  updateProfile(profile) {
    return requestStatus("/identity/profile", { method: "POST", body: JSON.stringify(profile) });
  },
};

Object.assign(window, { EMPTY_GC, GCAPI, loadGraphchanState });
