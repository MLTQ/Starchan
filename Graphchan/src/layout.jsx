/* App shell: left rail (nav + friends/topics), main stage, right rail (identity + net) */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

function Icon({ name, size=14 }) {
  const paths = {
    graph: <><circle cx="6" cy="6" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="14" cy="18" r="2"/><path d="M8 6l8 2M9 7l4 10M17 9l-3 8"/></>,
    radial: <><circle cx="12" cy="12" r="2"/><circle cx="12" cy="4" r="1.5"/><circle cx="20" cy="12" r="1.5"/><circle cx="12" cy="20" r="1.5"/><circle cx="4" cy="12" r="1.5"/><path d="M12 6v4M14 12h4M12 14v4M6 12h4" strokeDasharray="1 2"/></>,
    tree: <><rect x="9" y="3" width="6" height="4" rx="1"/><rect x="3" y="14" width="6" height="4" rx="1"/><rect x="15" y="14" width="6" height="4" rx="1"/><path d="M12 7v4M12 11h-6v3M12 11h6v3"/></>,
    time: <><path d="M3 18h18M5 18v-4M9 18v-8M13 18v-6M17 18v-10"/></>,
    list: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    dm: <><path d="M4 6h16v10H9l-4 4v-4H4z"/></>,
    friend: <><circle cx="12" cy="8" r="3"/><path d="M5 20c1-4 5-6 7-6s6 2 7 6"/></>,
    topic: <><path d="M4 9h16M4 15h16M10 4L7 20M17 4l-3 16"/></>,
    home: <><path d="M4 11l8-6 8 6v9h-6v-6h-4v6H4z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    lock: <><rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V7a4 4 0 018 0v4"/></>,
    globe: <><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/></>,
    dot: <circle cx="12" cy="12" r="4"/>,
    pin: <><path d="M10 3h4l-1 5 3 3v3h-4v6l-1 1-1-1v-6H6v-3l3-3z"/></>,
    dl: <><path d="M12 4v12M6 12l6 6 6-6M4 20h16"/></>,
    up: <><path d="M12 20V8M6 14l6-6 6 6M4 4h16"/></>,
    img: <><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 15l5-4 4 3 3-2 6 5"/><circle cx="8" cy="9" r="1.5"/></>,
    tweak: <><circle cx="8" cy="7" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="17" r="2"/><path d="M3 7h3M10 7h11M3 12h3M10 12h4M18 12h3M3 17h3M10 17h11"/></>,
    x: <><path d="M6 6l12 12M18 6L6 18"/></>,
    search: <><circle cx="11" cy="11" r="6"/><path d="M16 16l5 5"/></>,
    block: <><circle cx="12" cy="12" r="8"/><path d="M6 6l12 12"/></>,
    sparkle: <><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
      {paths[name] || paths.dot}
    </svg>
  );
}

function PeerGlyph({ peer, size=18 }) {
  if (!peer) return null;
  // Deterministic 2x2 "identicon" based on fingerprint
  const fp = (peer.fp || peer.id).replace(/[^0-9a-f]/gi,"").padEnd(8,"0");
  const bits = [];
  for (let i=0; i<4; i++) bits.push(parseInt(fp[i],16) > 7);
  const fg = peer.color || "var(--accent)";
  const s = size;
  return (
    <div style={{
      width:s, height:s, display:"grid", gridTemplateColumns:"1fr 1fr", gridTemplateRows:"1fr 1fr",
      background:"var(--panel2)", border:"1px solid var(--line)", borderRadius:"calc(var(--radius) - 2px)",
      overflow:"hidden", flexShrink:0,
    }}>
      {bits.map((b,i)=>(<div key={i} style={{background: b ? fg : "transparent"}} />))}
    </div>
  );
}

function PeerChip({ peer, showFp=false }) {
  if (!peer) return <span className="mono" style={{color:"var(--ink-faint)"}}>unknown</span>;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:6,fontFamily:"var(--mono)",fontSize:12}}>
      <PeerGlyph peer={peer} size={14} />
      <span style={{color: peer.color || "var(--accent)", fontWeight:600}}>{peer.alias}</span>
      {showFp && <span style={{color:"var(--ink-faint)"}}>·{peer.fp.slice(0,8)}</span>}
      {peer.online && <span title="online" style={{width:5,height:5,borderRadius:"50%",background:"var(--ok)"}}/>}
    </span>
  );
}

function SyncBadge({ status }) {
  const map = {
    downloaded: { label:"local", color:"var(--ok)", bg:"color-mix(in oklab, var(--ok) 14%, transparent)" },
    announced: { label:"announced", color:"var(--warn)", bg:"color-mix(in oklab, var(--warn) 14%, transparent)" },
    syncing: { label:"syncing…", color:"var(--accent)", bg:"color-mix(in oklab, var(--accent) 18%, transparent)" },
    redacted: { label:"redacted", color:"var(--danger)", bg:"color-mix(in oklab, var(--danger) 14%, transparent)" },
  };
  const s = map[status] || map.downloaded;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,fontFamily:"var(--mono)",fontSize:10,textTransform:"uppercase",letterSpacing:.6,color:s.color,background:s.bg,padding:"2px 6px",border:"1px solid "+s.color, borderRadius:"var(--radius)"}}>
      <span style={{width:5,height:5,borderRadius:"50%",background:s.color,display:"inline-block"}}/>
      {s.label}
    </span>
  );
}

// Miniature DAG drawn as SVG — used in catalog thumbs + peer cards
function MiniDag({ posts, w=120, h=60, stroke="currentColor" }) {
  const byId = Object.fromEntries(posts.map(p=>[p.id,p]));
  // BFS layer assignment from roots
  const layer = {};
  const q = [];
  posts.forEach(p=>{ if (p.parents.length===0) { layer[p.id]=0; q.push(p.id); } });
  while (q.length) {
    const id = q.shift();
    posts.filter(c=>c.parents.includes(id)).forEach(c=>{
      const L = Math.max(...c.parents.map(p=>layer[p]??0))+1;
      if (layer[c.id] === undefined || layer[c.id] < L) { layer[c.id]=L; q.push(c.id); }
    });
  }
  const maxL = Math.max(...Object.values(layer), 0);
  const byLayer = {};
  Object.entries(layer).forEach(([id,L])=>{ (byLayer[L]=byLayer[L]||[]).push(id); });
  const pos = {};
  for (let L=0; L<=maxL; L++) {
    const row = byLayer[L]||[];
    row.forEach((id,i)=>{ pos[id] = { x: 8 + L*((w-16)/Math.max(maxL,1)), y: 8 + (i+0.5)*((h-16)/row.length) }; });
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:"block"}}>
      {posts.flatMap(p=> p.parents.map(pa=>{
        const a = pos[pa], b = pos[p.id]; if (!a||!b) return null;
        const mx = (a.x+b.x)/2;
        return <path key={p.id+pa} d={`M${a.x} ${a.y} C${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`} stroke={stroke} strokeOpacity=".4" fill="none" strokeWidth="1"/>;
      }))}
      {posts.map(p=>{
        const pt = pos[p.id]; if (!pt) return null;
        const peer = GC.peerBy[p.author];
        return <circle key={p.id} cx={pt.x} cy={pt.y} r={p.redacted?1.5:2.5} fill={p.redacted?"var(--ink-faint)":(peer?.color||stroke)} />;
      })}
    </svg>
  );
}

Object.assign(window, { Icon, PeerGlyph, PeerChip, SyncBadge, MiniDag });
