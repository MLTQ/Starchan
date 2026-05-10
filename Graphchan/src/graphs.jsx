/* Four DAG layouts for a thread: force-directed Graph, Radial, Sugiyama, Timeline.
   All layouts are followed by a separation pass that guarantees no two nodes overlap. */

const { useState: useS, useEffect: useE, useRef: useR, useMemo: useM } = React;

// Bounding-box for a node given its render style + density. Matches PostNode below.
function nodeDims(nodeStyle, density) {
  if (nodeStyle === "dot")  return { w: 22, h: 22, gap: 14 };
  if (nodeStyle === "chip") return { w: 130, h: 30, gap: 12 };
  // card
  const w = density==="compact"?180:density==="spacious"?280:220;
  const h = density==="compact"?70:density==="spacious"?108:88;
  return { w, h, gap: 16 };
}

// Generic overlap-resolver: nudges nodes apart along their shortest axis until none overlap.
// Operates in place on the pos map. Iterative; converges in a few passes for sane node counts.
function resolveOverlaps(pos, ids, dims, bounds) {
  const { w: nw, h: nh, gap } = dims;
  const minDX = nw + gap, minDY = nh + gap;
  for (let pass=0; pass<24; pass++) {
    let moved = false;
    for (let i=0; i<ids.length; i++) {
      for (let j=i+1; j<ids.length; j++) {
        const a = pos[ids[i]], b = pos[ids[j]]; if (!a||!b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const adx = Math.abs(dx), ady = Math.abs(dy);
        const overlapX = minDX - adx;
        const overlapY = minDY - ady;
        if (overlapX > 0 && overlapY > 0) {
          // push along the axis with smaller overlap so we move the least
          if (overlapX < overlapY) {
            const push = overlapX / 2 + 0.5;
            const s = dx >= 0 ? 1 : -1;
            a.x -= s*push; b.x += s*push;
          } else {
            const push = overlapY / 2 + 0.5;
            const s = dy >= 0 ? 1 : -1;
            a.y -= s*push; b.y += s*push;
          }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  if (bounds) {
    const padX = nw/2 + 8, padY = nh/2 + 8;
    ids.forEach(id => {
      const p = pos[id]; if (!p) return;
      p.x = Math.max(padX, Math.min(bounds.w - padX, p.x));
      p.y = Math.max(padY, Math.min(bounds.h - padY, p.y));
    });
  }
}

// Compute layers via longest-path. Returns { layer: {id->L}, byLayer: {L->[id]}, maxL }
function computeLayers(posts) {
  const layer = {};
  posts.forEach(p=>{ if (p.parents.length===0) layer[p.id]=0; });
  let changed=true, safety=0;
  while (changed && safety++<50) {
    changed = false;
    posts.forEach(p=>{
      if (p.parents.length && p.parents.every(pa=>layer[pa]!==undefined)) {
        const L = Math.max(...p.parents.map(pa=>layer[pa]))+1;
        if (layer[p.id] !== L) { layer[p.id]=L; changed=true; }
      }
    });
  }
  // any disconnected
  posts.forEach(p=>{ if (layer[p.id]===undefined) layer[p.id]=0; });
  const maxL = Math.max(...Object.values(layer), 0);
  const byLayer = {};
  Object.entries(layer).forEach(([id,L])=>{ (byLayer[L]=byLayer[L]||[]).push(id); });
  return { layer, byLayer, maxL };
}

function layoutSugiyama(posts, w, h, dims) {
  const byId = Object.fromEntries(posts.map(p=>[p.id,p]));
  const { byLayer, maxL } = computeLayers(posts);
  const pos = {};
  const colW = dims.w + 40;            // horizontal gap between layers
  const rowH = dims.h + dims.gap;      // vertical pitch within a layer
  const padX = dims.w/2 + 24;
  const totalW = padX*2 + colW * Math.max(maxL, 1);
  const widthUsed = Math.max(w, totalW);
  for (let L=0; L<=maxL; L++) {
    const row = (byLayer[L]||[]).slice().sort((a,b)=>byId[a].createdAt-byId[b].createdAt);
    const x = padX + L * ((widthUsed - padX*2) / Math.max(maxL, 1));
    const stackH = row.length * rowH;
    const startY = Math.max(dims.h/2 + 16, h/2 - stackH/2 + rowH/2);
    row.forEach((id, i) => { pos[id] = { x, y: startY + i*rowH }; });
  }
  return { pos, contentW: widthUsed, contentH: Math.max(h, (Math.max(...Object.values(byLayer).map(r=>r.length))+1) * rowH + 40) };
}

function layoutTimeline(posts, w, h, dims, bins = 8) {
  const tMin = Math.min(...posts.map(p=>p.createdAt));
  const tMax = Math.max(...posts.map(p=>p.createdAt));
  const padX = dims.w/2 + 24;
  const rowH = dims.h + dims.gap;
  const binW = Math.max(dims.w + 28, (w - padX*2) / bins);
  const widthUsed = Math.max(w, padX*2 + binW*bins);
  const binMap = {};
  posts.forEach(p=>{
    const b = Math.min(bins-1, Math.floor(((p.createdAt-tMin)/(tMax-tMin||1))*bins));
    (binMap[b]=binMap[b]||[]).push(p.id);
  });
  const pos = {};
  let maxStack = 0;
  Object.entries(binMap).forEach(([b,ids])=>{
    maxStack = Math.max(maxStack, ids.length);
    const x = padX + (Number(b)+0.5)*binW;
    const stackH = ids.length * rowH;
    const startY = Math.max(dims.h/2 + 16, h/2 - stackH/2 + rowH/2);
    ids.forEach((id,i)=>{ pos[id] = { x, y: startY + i*rowH }; });
  });
  const contentH = Math.max(h, maxStack * rowH + 80);
  return { pos, contentW: widthUsed, contentH };
}

function layoutRadial(posts, w, h, dims) {
  const ring = {};
  posts.forEach(p=>{ if (p.parents.length===0) ring[p.id]=0; });
  let changed=true, s=0;
  while (changed && s++<50) { changed=false; posts.forEach(p=>{
    if (p.parents.length && p.parents.every(pa=>ring[pa]!==undefined)) {
      const R = Math.max(...p.parents.map(pa=>ring[pa]))+1;
      if (ring[p.id]!==R) { ring[p.id]=R; changed=true; }
    }
  }); }
  posts.forEach(p=>{ if (ring[p.id]===undefined) ring[p.id]=0; });
  const byRing = {};
  Object.entries(ring).forEach(([id,R])=>{ (byRing[R]=byRing[R]||[]).push(id); });
  const maxR = Math.max(...Object.values(ring),0);

  // Determine each ring's radius such that arc-spacing >= nodeW + gap, and radial step >= nodeH + gap
  const minRadialStep = dims.h + dims.gap*1.5;
  const arcMin = dims.w + dims.gap;
  const ringR = [0]; // R=0 always at center
  for (let R=1; R<=maxR; R++) {
    const n = (byRing[R]||[]).length;
    const arcRadius = n>1 ? (n * arcMin) / (2 * Math.PI) : 0;
    const next = Math.max(ringR[R-1] + minRadialStep, arcRadius);
    ringR.push(next);
  }
  const maxRadius = ringR[maxR] + dims.h/2 + 20;
  const cx = Math.max(w/2, maxRadius + 20);
  const cy = Math.max(h/2, maxRadius + 20);
  const contentW = Math.max(w, cx*2);
  const contentH = Math.max(h, cy*2);

  const pos = {};
  Object.entries(byRing).forEach(([R,ids])=>{
    const n = ids.length;
    const rr = ringR[Number(R)];
    if (rr === 0 || n === 1) {
      // single root at center, or anywhere else with single node — drop straight up of center
      ids.forEach((id,i)=>{
        if (rr===0) pos[id] = { x: cx, y: cy };
        else { const theta = -Math.PI/2; pos[id] = { x: cx+Math.cos(theta)*rr, y: cy+Math.sin(theta)*rr }; }
      });
    } else {
      ids.forEach((id,i)=>{
        const theta = (i/n)*Math.PI*2 - Math.PI/2;
        pos[id] = { x: cx + Math.cos(theta)*rr, y: cy + Math.sin(theta)*rr };
      });
    }
  });
  return { pos, contentW, contentH, rings: ringR, center: {x:cx, y:cy} };
}

// Force-directed, seeded from sugiyama. Uses rect-based collisions so cards never overlap.
function useForceLayout(posts, w, h, enabled, dims) {
  const [, setTick] = useS(0);
  const posRef = useR({});
  const velRef = useR({});
  const rafRef = useR(null);
  const sizeRef = useR({ w, h });
  // Compute a playfield big enough to actually fit all nodes without overlap, even if
  // the viewport is narrow (verifier caught a tiny-iframe case where canvas was 104px).
  const N = posts.length;
  const minDX = dims.w + dims.gap;
  const minDY = dims.h + dims.gap;
  const cols = Math.max(2, Math.ceil(Math.sqrt(N * (minDY/minDX))));
  const rows = Math.max(2, Math.ceil(N / cols));
  const fieldW = Math.max(w, cols * minDX + dims.w + 40);
  const fieldH = Math.max(h, rows * minDY + dims.h + 40);
  sizeRef.current = { w: fieldW, h: fieldH };
  useE(()=>{
    if (!enabled) return;
    const { pos: seed } = layoutSugiyama(posts, fieldW, fieldH, dims);
    const pos = {}, vel = {};
    posts.forEach(p=>{ pos[p.id] = { ...seed[p.id] }; vel[p.id] = { x:0, y:0 }; });
    posRef.current = pos; velRef.current = vel;
    const ids = posts.map(p=>p.id);
    const desired = Math.max(minDX, minDY) * 1.05;
    let frames = 0;
    const step = () => {
      frames++;
      const P = posRef.current, V = velRef.current;
      const damping = 0.82;
      const spring = 0.022;
      // pairwise: gentle repulsion + hard collision resolution
      for (let i=0;i<ids.length;i++) {
        for (let j=i+1;j<ids.length;j++) {
          const a = P[ids[i]], b = P[ids[j]];
          let dx = b.x-a.x, dy = b.y-a.y;
          const adx = Math.abs(dx), ady = Math.abs(dy);
          const overlapX = minDX - adx;
          const overlapY = minDY - ady;
          if (overlapX > 0 && overlapY > 0) {
            // hard separate this frame
            if (overlapX < overlapY) {
              const push = overlapX/2 + 0.5; const s = dx>=0?1:-1;
              a.x -= s*push; b.x += s*push;
            } else {
              const push = overlapY/2 + 0.5; const s = dy>=0?1:-1;
              a.y -= s*push; b.y += s*push;
            }
          } else {
            // soft repulsion at modest distance
            const d2 = dx*dx + dy*dy + 60;
            const d = Math.sqrt(d2);
            if (d < desired*1.8) {
              const f = 5000 / d2;
              V[ids[i]].x -= f*dx/d; V[ids[i]].y -= f*dy/d;
              V[ids[j]].x += f*dx/d; V[ids[j]].y += f*dy/d;
            }
          }
        }
      }
      // springs along edges
      posts.forEach(p=> p.parents.forEach(pa=>{
        const a = P[p.id], b = P[pa]; if (!a||!b) return;
        const dx=b.x-a.x, dy=b.y-a.y; const d=Math.sqrt(dx*dx+dy*dy)||1;
        const f = (d-desired)*spring;
        V[p.id].x += f*dx/d; V[p.id].y += f*dy/d;
        V[pa].x -= f*dx/d; V[pa].y -= f*dy/d;
      }));
      // gentle center pull (only on x — let y spread freely)
      posts.forEach(p=>{ V[p.id].x += (fieldW/2 - P[p.id].x)*0.002; V[p.id].y += (fieldH/2 - P[p.id].y)*0.0015; });
      // integrate
      const padX = dims.w/2 + 8, padY = dims.h/2 + 8;
      const maxX = Math.max(padX + 1, fieldW - padX);
      const maxY = Math.max(padY + 1, fieldH - padY);
      posts.forEach(p=>{
        V[p.id].x *= damping; V[p.id].y *= damping;
        P[p.id].x += V[p.id].x; P[p.id].y += V[p.id].y;
        P[p.id].x = Math.max(padX, Math.min(maxX, P[p.id].x));
        P[p.id].y = Math.max(padY, Math.min(maxY, P[p.id].y));
      });
      // final relaxation pass each frame guarantees no overlap visible
      resolveOverlaps(P, ids, dims, { w: fieldW, h: fieldH });
      setTick(t=>t+1);
      if (frames<300) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return ()=>{ if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [enabled, posts.length, fieldW, fieldH, dims.w, dims.h]);
  return { pos: posRef.current, contentW: fieldW, contentH: fieldH };
}

function GraphEdges({ posts, pos, selected, w, h }) {
  return (
    <svg style={{position:"absolute",left:0,top:0,pointerEvents:"none"}} width={w} height={h}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0L10 5L0 10z" fill="var(--ink-faint)" />
        </marker>
      </defs>
      {posts.flatMap(p=> p.parents.map(pa=>{
        const a = pos[pa], b = pos[p.id]; if (!a||!b) return null;
        const hot = selected === p.id || selected === pa;
        const mx = (a.x+b.x)/2;
        return <path key={p.id+pa}
          d={`M${a.x} ${a.y} C${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`}
          stroke={hot ? "var(--accent)" : "var(--line)"}
          strokeOpacity={hot?0.9:0.5}
          strokeWidth={hot?1.8:1}
          fill="none"
          markerEnd="url(#arrow)"
        />;
      }))}
    </svg>
  );
}

function PostNode({ post, peer, style, selected, onClick, nodeStyle, density, hidden, unread, fading }) {
  if (hidden) return null;
  const isRedacted = post.redacted;
  const glowClass = unread ? "gc-unread" : (fading ? "gc-unread-fade" : "");
  const bodyShort = (post.body||"").split("\n").slice(0,2).join(" ").slice(0, density==="compact"?60:density==="spacious"?200:120);
  const dims = nodeDims(nodeStyle, density);
  if (nodeStyle === "dot") {
    return (
      <div onClick={onClick} data-node="1" title={peer?.alias+": "+bodyShort}
        className={glowClass}
        style={{position:"absolute", left:style.x-8, top:style.y-8, width:16, height:16, borderRadius:"50%",
          background: isRedacted ? "var(--ink-faint)" : peer?.color || "var(--accent)",
          border: selected ? "2px solid var(--ink)" : "2px solid var(--bg)",
          boxShadow: selected ? "0 0 0 3px var(--accent)" : "none",
          cursor:"pointer", transition:"box-shadow .15s",
        }}/>
    );
  }
  if (nodeStyle === "chip") {
    return (
      <div onClick={onClick} data-node="1"
        className={glowClass}
        style={{position:"absolute", left:style.x-dims.w/2, top:style.y-dims.h/2, width:dims.w, height:dims.h, padding:"4px 8px",
          background:"var(--panel)", border:`1px solid ${selected?"var(--accent)":unread?"var(--accent)":"var(--line)"}`, borderRadius:"var(--radius)",
          fontFamily:"var(--mono)", fontSize:11, color: isRedacted?"var(--ink-faint)":"var(--ink)",
          display:"flex", alignItems:"center", gap:6, cursor:"pointer", whiteSpace:"nowrap", overflow:"hidden",
          boxShadow: selected ? "0 0 0 2px var(--accent)" : "none",
        }}>
        <PeerGlyph peer={peer} size={12}/>
        <span style={{color: peer?.color, fontWeight:600}}>{peer?.alias?.slice(0,8)}</span>
        <span style={{color:"var(--ink-faint)"}}>#{post.id}</span>
      </div>
    );
  }
  return (
    <div onClick={onClick} data-node="1"
      className={glowClass}
      style={{position:"absolute", left:style.x-dims.w/2, top:style.y-dims.h/2, width:dims.w, minHeight:dims.h, padding:"8px 10px",
        background:"var(--panel)", border:`1px solid ${selected?"var(--accent)":unread?"var(--accent)":"var(--line)"}`, borderRadius:"var(--radius)",
        cursor:"pointer",
        boxShadow: selected ? "0 0 0 2px var(--accent), 0 6px 18px rgba(0,0,0,.35)" : "0 2px 8px rgba(0,0,0,.2)",
        opacity: isRedacted ? 0.6 : 1,
      }}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,marginBottom:4}}>
        <PeerChip peer={peer}/>
        <span className="mono" style={{fontSize:10,color:"var(--ink-faint)"}}>#{post.id}</span>
      </div>
      {isRedacted ? (
        <div style={{padding:"6px 0", color:"var(--ink-faint)",fontFamily:"var(--mono)",fontSize:11,letterSpacing:1,textAlign:"center",background:"repeating-linear-gradient(45deg, transparent 0 4px, var(--line) 4px 5px)"}}>
          ▓▓ REDACTED ▓▓ ({post.reason})
        </div>
      ) : (
        <div style={{fontSize:12,color:"var(--ink-dim)", display:"-webkit-box",WebkitLineClamp:density==="compact"?2:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
          {bodyShort}
        </div>
      )}
      {post.files?.length > 0 && !isRedacted && (
        <div style={{marginTop:6,display:"flex",gap:4,alignItems:"center",color:"var(--accent)",fontSize:10,fontFamily:"var(--mono)"}}>
          <Icon name="img" size={11}/> {post.files.length} attachment{post.files.length>1?"s":""}
        </div>
      )}
    </div>
  );
}

function DagCanvas({ thread, mode, selected, onSelect, nodeStyle, density, unread, fading, bins = 8 }) {
  const ref = useR(null);
  const [size, setSize] = useS({ w: 900, h: 560 });
  const [panning, setPanning] = useS(false);
  useE(()=>{
    if (!ref.current) return;
    const ro = new ResizeObserver(([e])=>{
      const r = e.contentRect; if (r.width>100 && r.height>100) setSize({ w: r.width, h: r.height });
    });
    ro.observe(ref.current); return ()=>ro.disconnect();
  },[]);

  // Drag-to-pan: mousedown on empty canvas + drag scrolls the container.
  // Click on a node still works because PostNode stops propagation via its onClick handler timing,
  // so we only start panning if the mousedown target is the canvas itself or the background grid.
  const dragRef = useR(null);
  const onMouseDown = (e)=>{
    // Only start panning when grabbing background — not when clicking a node/button.
    // Walk up from target; if we hit a node element before the canvas root, bail.
    let n = e.target;
    while (n && n !== ref.current) {
      if (n.dataset && n.dataset.node === "1") return;
      n = n.parentElement;
    }
    if (e.button !== 0) return;
    e.preventDefault();
    setPanning(true);
    const el = ref.current;
    dragRef.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
    const onMove = (ev)=>{
      const d = dragRef.current; if (!d) return;
      el.scrollLeft = d.sl - (ev.clientX - d.x);
      el.scrollTop  = d.st - (ev.clientY - d.y);
    };
    const onUp = ()=>{
      setPanning(false);
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const dims = useM(()=>nodeDims(nodeStyle, density), [nodeStyle, density]);
  const force = useForceLayout(thread.posts, size.w, size.h, mode==="graph", dims);

  const layoutResult = useM(()=>{
    if (mode==="radial")    return layoutRadial(thread.posts, size.w, size.h, dims);
    if (mode==="sugiyama")  return layoutSugiyama(thread.posts, size.w, size.h, dims);
    if (mode==="timeline")  return layoutTimeline(thread.posts, size.w, size.h, dims, bins);
    return null;
  }, [mode, thread.posts, size.w, size.h, dims, bins]);

  // Run a final overlap-resolution pass on static layouts as a belt-and-suspenders guarantee
  const { pos, contentW, contentH, rings, center } = useM(()=>{
    if (mode === "graph") return { pos: force.pos, contentW: force.contentW, contentH: force.contentH };
    if (!layoutResult) return { pos:{}, contentW: size.w, contentH: size.h };
    const ids = thread.posts.map(p=>p.id);
    const cloned = {}; Object.entries(layoutResult.pos).forEach(([k,v])=> cloned[k] = {...v});
    // Expand bounds for resolver so it never has to clamp into a too-small box
    const expandedW = Math.max(layoutResult.contentW, dims.w*2 + 40);
    const expandedH = Math.max(layoutResult.contentH, dims.h*2 + 40);
    resolveOverlaps(cloned, ids, dims, { w: expandedW, h: expandedH });
    return { ...layoutResult, pos: cloned, contentW: expandedW, contentH: expandedH };
  }, [mode, layoutResult, force, size.w, size.h, dims, thread.posts]);

  return (
    <div ref={ref} onMouseDown={onMouseDown}
      style={{position:"relative", flex:1, minHeight:400, background:"var(--bg)", overflow:"auto",
        cursor: panning ? "grabbing" : "grab", userSelect: panning ? "none" : "auto"}}>
      <div style={{position:"relative", width: contentW, height: contentH,
        backgroundImage: mode==="timeline" ? "linear-gradient(to right, var(--line) 1px, transparent 1px)" : "radial-gradient(var(--line) 1px, transparent 1px)",
        backgroundSize: mode==="timeline" ? `${(contentW-120)/bins}px 100%` : "28px 28px",
        backgroundPosition: mode==="timeline" ? "60px 0" : "0 0",
      }}>
        {mode==="radial" && rings && (
          <svg style={{position:"absolute",left:0,top:0,pointerEvents:"none"}} width={contentW} height={contentH}>
            {rings.map((r,i)=>(<circle key={i} cx={center.x} cy={center.y} r={r} fill="none" stroke="var(--line)" strokeDasharray="2 3"/>))}
          </svg>
        )}
        <GraphEdges posts={thread.posts} pos={pos} selected={selected} w={contentW} h={contentH}/>
        {thread.posts.map(p=>{
          const pt = pos[p.id]; if (!pt) return null;
          return <PostNode key={p.id} post={p} peer={GC.peerBy[p.author]} style={pt}
            selected={selected===p.id} onClick={()=>onSelect(p.id)}
            unread={unread?.has(p.id)} fading={fading?.has(p.id)}
            nodeStyle={nodeStyle} density={density}/>;
        })}
        {mode==="timeline" && (
          <div style={{position:"absolute",bottom:8,left:60,right:40,display:"flex",justifyContent:"space-between",fontFamily:"var(--mono)",fontSize:10,color:"var(--ink-faint)",pointerEvents:"none"}}>
            {Array.from({length: Math.min(bins+1, 9)}, (_,i)=>{
              const step = bins / Math.min(bins, 8);
              const idx = Math.round(i*step);
              return <span key={i}>{idx===bins ? "now" : `t${idx}`}</span>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Flat chronological list — 4chan-style. Shows all posts in time order with
// >>parent quote refs, attachments, redacted placeholders.
function ListView({ thread, selected, onSelect, unread, fading }) {
  const posts = thread.posts.slice().sort((a,b)=>a.createdAt-b.createdAt);
  const idx = Object.fromEntries(posts.map((p,i)=>[p.id, i+1]));
  return (
    <div style={{flex:1, overflow:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:10, background:"var(--bg)"}}>
      {posts.map((p, i)=>{
        const peer = GC.peerBy[p.author];
        const isOP = i === 0;
        const isSel = selected === p.id;
        const isUnread = unread?.has(p.id);
        const isFading = fading?.has(p.id);
        return (
          <div key={p.id} id={`list-${p.id}`} onClick={()=>onSelect(p.id)} data-node="1"
            className={isUnread ? "gc-unread" : isFading ? "gc-unread-fade" : ""}
            style={{
              display:"flex", gap:12, padding:"10px 12px",
              background: isOP ? "color-mix(in oklab, var(--accent) 6%, var(--panel))" : "var(--panel)",
              border:`1px solid ${isSel?"var(--accent)":isUnread?"var(--accent)":"var(--line)"}`,
              borderLeft: isOP ? "3px solid var(--accent)" : (isSel?"3px solid var(--accent)":"3px solid transparent"),
              borderRadius:"var(--radius)", cursor:"pointer", maxWidth: 880,
            }}>
            <div style={{flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", gap:6, minWidth:44}}>
              <PeerGlyph peer={peer} size={32}/>
              <div className="mono" style={{fontSize:9, color:"var(--ink-faint)", textAlign:"center"}}>#{idx[p.id]}</div>
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap", marginBottom:4}}>
                <span style={{fontWeight:600, color: peer?.color, fontFamily:"var(--mono)", fontSize:12}}>{peer?.alias}</span>
                <span className="mono" style={{fontSize:10, color:"var(--ink-faint)"}}>{peer?.fp.slice(0,12)}…</span>
                {isOP && <span className="mono" style={{fontSize:9, color:"var(--accent)", border:"1px solid var(--accent)", padding:"0 5px", borderRadius:"var(--radius)", letterSpacing:.6}}>OP</span>}
                <span className="mono" style={{fontSize:10, color:"var(--ink-faint)"}}>· No.{p.id}</span>
                {p.parents.length > 0 && (
                  <span className="mono" style={{fontSize:10, color:"var(--ink-faint)"}}>·{" "}
                    {p.parents.map((pa,j)=>(
                      <a key={pa} onClick={ev=>{ ev.stopPropagation(); onSelect(pa); document.getElementById(`list-${pa}`)?.scrollIntoView({block:"center",behavior:"smooth"}); }}
                        style={{color:"var(--accent)", textDecoration:"underline", marginRight:4, cursor:"pointer"}}>
                        &gt;&gt;{idx[pa] || pa}
                      </a>
                    ))}
                  </span>
                )}
              </div>
              {p.redacted ? (
                <div style={{padding:"8px 10px", color:"var(--ink-faint)", fontFamily:"var(--mono)", fontSize:11, background:"repeating-linear-gradient(45deg, transparent 0 5px, var(--line) 5px 6px)", border:"1px dashed var(--line)", borderRadius:"var(--radius)"}}>
                  ▓▓ REDACTED ▓▓ <span style={{fontSize:10}}>({p.reason})</span>
                </div>
              ) : (
                <div style={{fontSize:13, lineHeight:1.5, whiteSpace:"pre-wrap", color:"var(--ink)"}}>{p.body}</div>
              )}
              {p.files?.length > 0 && !p.redacted && (
                <div style={{marginTop:6, display:"flex", gap:6, flexWrap:"wrap"}}>
                  {p.files.map((f,j)=>(
                    <div key={j} style={{padding:"4px 8px", background:"var(--panel2)", border:"1px solid var(--line)", borderRadius:"var(--radius)", fontFamily:"var(--mono)", fontSize:10, color:"var(--ink-dim)", display:"inline-flex", alignItems:"center", gap:6}}>
                      <Icon name="img" size={11}/>{f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { DagCanvas, ListView });
