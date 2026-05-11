/* Screens: Catalog, Thread, DMs, Friends, Topics, Settings */

const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM } = React;

function Catalog({ onOpen, topicFilter, setTopicFilter, onRefresh }) {
  const [q, setQ] = uS("");
  const [filter, setFilter] = uS("all");
  const [creating, setCreating] = uS(false);
  const threads = GC.THREADS.filter(t=>{
    if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (topicFilter && !t.topics.includes(topicFilter)) return false;
    if (filter==="local" && t.sync!=="downloaded") return false;
    if (filter==="announced" && t.sync!=="announced") return false;
    return true;
  });
  return (
    <div style={{padding:"calc(16px * var(--density))", overflow:"auto"}}>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:16,gap:16}}>
        <div>
          <div style={{fontFamily:"var(--font-head)",fontSize:28,fontWeight:700,letterSpacing:-0.5}}>catalog</div>
          <div className="mono" style={{color:"var(--ink-dim)",fontSize:12,marginTop:2}}>
            {threads.length} threads · {threads.filter(t=>t.sync==="announced").length} announced · {GC.HEALTH ? "mesh OK" : "offline"}
            {topicFilter && <button onClick={()=>setTopicFilter(null)} style={{marginLeft:8,color:"var(--accent)"}}>clear #{topicFilter}</button>}
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"6px 10px"}}>
            <Icon name="search" size={12}/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="search threads…" style={{background:"transparent",border:0,outline:"none",width:180,fontSize:12,fontFamily:"var(--mono)"}}/>
          </div>
          {["all","local","announced"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:"6px 10px",fontFamily:"var(--mono)",fontSize:11,textTransform:"uppercase",letterSpacing:.6,
              background: filter===f?"var(--accent)":"var(--panel)", color: filter===f?"var(--accent-ink)":"var(--ink-dim)",
              border:"1px solid var(--line)", borderRadius:"var(--radius)"}}>{f}</button>
          ))}
          <button onClick={()=>setCreating(true)} style={{padding:"6px 12px",fontFamily:"var(--mono)",fontSize:11,textTransform:"uppercase",letterSpacing:.8,
            background:"var(--accent)",color:"var(--accent-ink)",border:"1px solid var(--accent)",borderRadius:"var(--radius)",display:"flex",alignItems:"center",gap:6,fontWeight:600}}>
            <Icon name="plus" size={12}/> new thread
          </button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))",gap:"calc(14px * var(--density))"}}>
        {threads.map(t=>{
          const op = GC.peerBy[t.op];
          const demo = GC.THREAD_BY_ID[t.id];
          return (
            <div key={t.id} onClick={()=>onOpen(t.id)}
              className={GC.UNREAD_THREADS.has(t.id) ? "gc-pulse" : ""}
              style={{position:"relative",background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"calc(12px * var(--density))",cursor:"pointer",display:"flex",flexDirection:"column",gap:8,minHeight:180,
                boxShadow: t.pinned ? "inset 3px 0 0 var(--accent)" : "none"}}>
              {GC.UNREAD_THREADS.has(t.id) && <span className="gc-pulse-dot" title="new activity"></span>}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  {t.topics.map(tp=>(
                    <span key={tp} className="mono" style={{fontSize:10,color:"var(--accent)",background:"color-mix(in oklab, var(--accent) 10%, transparent)",padding:"1px 6px",borderRadius:"var(--radius)",border:"1px solid color-mix(in oklab, var(--accent) 30%, transparent)"}}>#{tp}</span>
                  ))}
                </div>
                <SyncBadge status={t.sync}/>
              </div>
              <div style={{fontFamily:"var(--font-head)",fontWeight:600,fontSize:16,lineHeight:1.25,textWrap:"pretty"}}>{t.title}</div>
              <div style={{fontSize:12,color:"var(--ink-dim)",flex:1,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{t.preview}</div>
              {demo && <div style={{margin:"2px -4px 0", color:"var(--ink-dim)"}}><MiniDag posts={demo.posts} w={320} h={52} stroke="var(--ink-faint)"/></div>}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"var(--mono)",fontSize:11,color:"var(--ink-faint)",marginTop:4}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <PeerChip peer={op}/>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <span>◉ {t.posts}</span>
                  {t.files>0 && <span>⦿ {t.files}</span>}
                  <span>⌛ {t.last}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {creating && <NewThreadModal onClose={()=>setCreating(false)} onCreated={async (id)=>{ setCreating(false); await onRefresh?.(); if (id) onOpen(id); }}/>}
    </div>
  );
}

function NewThreadModal({ onClose, onCreated }) {
  const [title, setTitle] = uS("");
  const [body, setBody] = uS("");
  const [topics, setTopics] = uS("");
  const [files, setFiles] = uS([]);
  const [busy, setBusy] = uS(false);
  const [error, setError] = uS(null);
  const inputRef = uR(null);
  const addFiles = (list) => setFiles(prev => [...prev, ...Array.from(list || []).map(file => ({ id: "f_" + Math.random().toString(36).slice(2), raw:file, name:file.name, size:file.size }))]);
  const submit = async () => {
    if (!title.trim() || !body.trim()) return;
    setBusy(true); setError(null);
    try {
      const created = await GCAPI.createThread({
        title: title.trim(),
        body: body.trim(),
        topics: topics.split(/[,\s]+/).map(t=>t.replace(/^#/,"").trim()).filter(Boolean),
        files,
      });
      await onCreated?.(created?.thread?.id || created?.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"min(640px, 100%)",background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,.6)"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid var(--line)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--panel2)"}}>
          <span className="mono" style={{fontSize:11,textTransform:"uppercase",letterSpacing:1,color:"var(--ink-dim)"}}>new thread</span>
          <button onClick={onClose} style={{color:"var(--ink-faint)"}}><Icon name="x" size={14}/></button>
        </div>
        <div style={{padding:14,display:"flex",flexDirection:"column",gap:10}}>
          <input value={title} onChange={e=>setTitle(e.target.value)} autoFocus placeholder="thread title" style={{background:"var(--bg)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"9px 12px",outline:"none",fontSize:14}}/>
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="opening post…" style={{minHeight:140,background:"var(--bg)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"10px 12px",outline:"none",resize:"vertical",fontSize:13,lineHeight:1.5}}/>
          <input value={topics} onChange={e=>setTopics(e.target.value)} placeholder="topics, comma or space separated" className="mono" style={{background:"var(--bg)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"8px 12px",outline:"none",fontSize:12}}/>
          <input ref={inputRef} type="file" multiple accept="image/*,video/*" onChange={e=>{ addFiles(e.target.files); e.target.value=""; }} style={{display:"none"}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={()=>inputRef.current?.click()} style={{...btn(),display:"inline-flex",alignItems:"center",gap:6,padding:"6px 10px"}}><Icon name="img" size={12}/> add files</button>
            <span className="mono" style={{fontSize:10,color:"var(--ink-faint)"}}>{files.length} attached</span>
          </div>
          {error && <div className="mono" style={{fontSize:11,color:"var(--danger)"}}>{error}</div>}
        </div>
        <div style={{padding:"10px 14px",borderTop:"1px solid var(--line)",background:"var(--panel2)",display:"flex",justifyContent:"flex-end",gap:6}}>
          <button onClick={onClose} style={btn()}>cancel</button>
          <button disabled={busy || !title.trim() || !body.trim()} onClick={submit} style={{...btn(),background:"var(--accent)",color:"var(--accent-ink)",fontWeight:700,cursor:busy?"wait":"pointer"}}>{busy ? "posting…" : "post ↗"}</button>
        </div>
      </div>
    </div>
  );
}

function ThreadView({ threadId, onBack, nodeStyle, density, onRefresh }) {
  const t = GC.THREAD_BY_ID[threadId];
  const [mode, setMode] = uS("graph");
  const [bins, setBins] = uS(8);
  const [composing, setComposing] = uS(null); // { replyTo: postId|null, kind: "reply"|"fork"|"quote"|"new" }
  const [selected, setSelected] = uS(t?.posts?.[0]?.id);
  const initialUnread = GC.UNREAD_POSTS[threadId] || new Set();
  const [unread, setUnread] = uS(()=> new Set(initialUnread));
  const [fading, setFading] = uS(()=> new Set()); // ids currently in fade-out
  const [busy, setBusy] = uS(false);
  const [error, setError] = uS(null);
  uE(()=>{ if (t?.posts?.length && !t.posts.some(p=>p.id===selected)) setSelected(t.posts[0].id); },[threadId, t?.posts?.length, selected]);
  if (!t) return <div style={{padding:40,color:"var(--ink-faint)",fontFamily:"var(--mono)"}}>thread not found — <button onClick={onBack} style={{color:"var(--accent)",textDecoration:"underline"}}>back to catalog</button></div>;
  const selectedPost = t.posts.find(p=>p.id===selected);
  const peer = selectedPost && GC.peerBy[selectedPost.author];

  const handleSelect = (id) => {
    setSelected(id);
    if (unread.has(id)) {
      setFading(prev => { const n = new Set(prev); n.add(id); return n; });
      setUnread(prev => { const n = new Set(prev); n.delete(id); return n; });
      // remove from fading after animation finishes so it stops re-animating
      setTimeout(()=>{
        setFading(prev => { const n = new Set(prev); n.delete(id); return n; });
      }, 1300);
    }
  };

  const modes = [
    { id:"list", label:"1D", icon:"list" },
    { id:"graph", label:"force", icon:"graph" },
    { id:"radial", label:"radial", icon:"radial" },
    { id:"sugiyama", label:"tree", icon:"tree" },
    { id:"timeline", label:"time", icon:"time" },
  ];

  const needsDownload = t.sync === "announced";
  const download = async () => {
    setBusy(true); setError(null);
    try {
      await GCAPI.downloadThread(t.id);
      await onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0}}>
      <div style={{padding:"calc(12px * var(--density)) calc(16px * var(--density))",borderBottom:"1px solid var(--line)",background:"var(--panel)"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16}}>
          <div style={{minWidth:0,flex:1}}>
            <button onClick={onBack} className="mono" style={{fontSize:11,color:"var(--ink-faint)",marginBottom:4,display:"inline-flex",alignItems:"center",gap:4}}>← catalog</button>
            <div style={{fontFamily:"var(--font-head)",fontSize:22,fontWeight:700,lineHeight:1.2,marginBottom:6}}>{t.title}</div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <PeerChip peer={GC.peerBy[t.creator]} showFp/>
              <span className="mono" style={{fontSize:11,color:"var(--ink-faint)"}}>·</span>
              {t.topics.map(tp=>(<span key={tp} className="mono" style={{fontSize:11,color:"var(--accent)"}}>#{tp}</span>))}
              <span className="mono" style={{fontSize:11,color:"var(--ink-faint)"}}>· {t.posts.length} posts · {t.peers} peers</span>
              <SyncBadge status={t.sync}/>
              {error && <span className="mono" style={{fontSize:11,color:"var(--danger)"}}>· {error}</span>}
              {t.visibility==="private" && <span className="mono" style={{fontSize:10,color:"var(--accent)",display:"inline-flex",alignItems:"center",gap:4,border:"1px solid var(--accent)",padding:"1px 6px",borderRadius:"var(--radius)"}}><Icon name="lock" size={10}/>private</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:4,background:"var(--panel2)",padding:3,borderRadius:"var(--radius)",border:"1px solid var(--line)"}}>
            {modes.map(m=>(
              <button key={m.id} onClick={()=>setMode(m.id)}
                style={{padding:"6px 10px",fontFamily:"var(--mono)",fontSize:11,textTransform:"uppercase",letterSpacing:.6,
                  background: mode===m.id?"var(--accent)":"transparent", color: mode===m.id?"var(--accent-ink)":"var(--ink-dim)",
                  borderRadius:"calc(var(--radius) - 1px)",display:"flex",alignItems:"center",gap:5}}>
                <Icon name={m.icon} size={12}/> {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {needsDownload ? (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,padding:40,textAlign:"center"}}>
          <div style={{fontFamily:"var(--mono)",fontSize:13,color:"var(--warn)",letterSpacing:1}}>◈ ANNOUNCED — NOT DOWNLOADED</div>
          <div style={{fontSize:13,color:"var(--ink-dim)",maxWidth:420}}>This thread was gossiped to you via topic subscription. The blob ticket is stored; fetching will contact the peer directly via iroh.</div>
          <button disabled={busy} onClick={download} style={{padding:"10px 18px",fontFamily:"var(--mono)",fontSize:12,textTransform:"uppercase",letterSpacing:1,background:"var(--accent)",color:"var(--accent-ink)",borderRadius:"var(--radius)",fontWeight:700,cursor:busy?"wait":"pointer"}}>{busy ? "fetching…" : "⇣ redeem ticket"}</button>
        </div>
      ) : (
        <div style={{flex:1,display:"flex",minHeight:0}}>
          {mode === "list" ? (
            <ListView thread={t} selected={selected} onSelect={handleSelect} unread={unread} fading={fading}/>
          ) : (
            <>
              <DagCanvas thread={t} mode={mode} selected={selected} onSelect={handleSelect} nodeStyle={nodeStyle} density={density} unread={unread} fading={fading} bins={bins}/>
              {mode === "timeline" && (
                <div style={{position:"absolute",top:"calc(100% - 60px)",left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:10,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"6px 14px",boxShadow:"0 4px 14px rgba(0,0,0,.4)",zIndex:5,pointerEvents:"auto"}}>
                  <span className="mono" style={{fontSize:10,color:"var(--ink-faint)",textTransform:"uppercase",letterSpacing:.8}}>bins</span>
                  <input type="range" min="2" max="24" value={bins} onChange={e=>setBins(Number(e.target.value))}
                    style={{width:160, accentColor:"var(--accent)"}}/>
                  <span className="mono" style={{fontSize:11,color:"var(--accent)",minWidth:24,textAlign:"right"}}>{bins}</span>
                </div>
              )}
            </>
          )}
          {mode !== "list" && (
          <div style={{width:"min(320px, 34vw)",minWidth:240,borderLeft:"1px solid var(--line)",background:"var(--panel)",overflowY:"auto",padding:"calc(14px * var(--density))"}}>
            {selectedPost ? (
              <>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <PeerChip peer={peer} showFp/>
                  <span className="mono" style={{fontSize:10,color:"var(--ink-faint)"}}>#{selectedPost.id}</span>
                </div>
                {selectedPost.redacted ? (
                  <div style={{padding:14,color:"var(--ink-faint)",fontFamily:"var(--mono)",fontSize:12,border:"1px dashed var(--line)",background:"repeating-linear-gradient(45deg, transparent 0 6px, var(--line) 6px 7px)",textAlign:"center"}}>
                    ▓▓ REDACTED LOCALLY ▓▓<br/><span style={{fontSize:10}}>reason: {selectedPost.reason} · DAG preserved</span>
                    <button style={{display:"block",margin:"12px auto 0",padding:"4px 10px",fontFamily:"var(--mono)",fontSize:10,border:"1px solid var(--line)",borderRadius:"var(--radius)",color:"var(--ink-dim)"}}>fetch anyway</button>
                  </div>
                ) : (
                  <div style={{fontSize:14,lineHeight:1.55,whiteSpace:"pre-wrap",color:"var(--ink)"}}>{selectedPost.body}</div>
                )}
                {selectedPost.files?.length > 0 && !selectedPost.redacted && (
                  <div style={{marginTop:12,display:"grid",gap:6}}>
                    {selectedPost.files.map((f,i)=>(
                      <div key={i} style={{padding:"8px 10px",background:"var(--panel2)",border:"1px solid var(--line)",borderRadius:"var(--radius)",fontFamily:"var(--mono)",fontSize:11,display:"flex",alignItems:"center",gap:8}}>
                        <Icon name="img" size={14}/><span style={{flex:1,color:"var(--ink-dim)"}}>{f}</span>
                        <span style={{color:"var(--ok)",fontSize:9,letterSpacing:.6}}>LOCAL</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid var(--line)",fontFamily:"var(--mono)",fontSize:10,color:"var(--ink-faint)",display:"flex",justifyContent:"space-between"}}>
                  <span>parents: {selectedPost.parents.length}</span>
                  <span>blake3: {selectedPost.id.padEnd(8,"·")}…</span>
                </div>
                <div style={{marginTop:12,display:"flex",gap:6,flexWrap:"wrap"}}>
                  <button style={btn()} onClick={()=>setComposing({replyTo:selected, kind:"reply"})}>⏎ reply</button>
                  <button style={btn()} onClick={()=>setComposing({replyTo:selected, kind:"fork"})}>⑂ fork</button>
                  <button style={btn()} onClick={()=>setComposing({replyTo:selected, kind:"quote"})}>◈ quote</button>
                  <button style={{...btn(), color:"var(--danger)"}} onClick={async()=>{ if (selectedPost.author) { await GCAPI.blockPeer(selectedPost.author); await onRefresh?.(); }}}>⊘ block author</button>
                </div>
              </>
            ) : (
              <div style={{color:"var(--ink-faint)",fontFamily:"var(--mono)",fontSize:12,padding:20,textAlign:"center"}}>select a node</div>
            )}
          </div>
          )}
        </div>
      )}
      {composing && <Composer thread={t} ctx={composing} onClose={()=>setComposing(null)} onPosted={async()=>{ setComposing(null); await onRefresh?.(); }}/>}
    </div>
  );
}

function btn(){ return {padding:"4px 10px",fontFamily:"var(--mono)",fontSize:11,background:"var(--panel2)",color:"var(--ink-dim)",border:"1px solid var(--line)",borderRadius:"var(--radius)"}; }

function Composer({ thread, ctx, onClose, onPosted }) {
  const [body, setBody] = uS(ctx.kind === "quote" && ctx.replyTo
    ? ">>"+ctx.replyTo+"\n"+(thread.posts.find(p=>p.id===ctx.replyTo)?.body.split("\n").map(l=>">"+l).join("\n") || "")+"\n\n"
    : "");
  const [files, setFiles] = uS([]);
  const [dragOver, setDragOver] = uS(false);
  const inputRef = uR(null);
  const replyPost = ctx.replyTo ? thread.posts.find(p=>p.id===ctx.replyTo) : null;
  const replyPeer = replyPost && GC.peerBy[replyPost.author];

  const addFiles = (list) => {
    const next = [];
    for (const f of list) {
      const id = "f_" + Math.random().toString(36).slice(2,9);
      const isImg = f.type.startsWith("image/");
      const url = isImg ? URL.createObjectURL(f) : null;
      next.push({ id, raw:f, name:f.name, type:f.type, size:f.size, url, isImg });
    }
    setFiles(prev => [...prev, ...next]);
  };
  const onPick = (e) => { addFiles(e.target.files); e.target.value = ""; };
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); };
  const onPaste = (e) => {
    const its = [...(e.clipboardData?.items || [])].filter(i=>i.kind==="file");
    if (its.length) addFiles(its.map(i=>i.getAsFile()).filter(Boolean));
  };
  const remove = (id) => setFiles(prev => prev.filter(f=>f.id!==id));
  const [busy, setBusy] = uS(false);
  const [error, setError] = uS(null);
  const submit = async () => {
    if (!body.trim() || overCap || busy) return;
    setBusy(true); setError(null);
    try {
      const parentPostIds = ctx.replyTo ? [ctx.replyTo] : [];
      await GCAPI.createPost(thread.id, { body: body.trim(), parentPostIds, files });
      await onPosted?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const titles = { reply:"reply", fork:"fork from", quote:"quote", new:"new post" };
  const totalBytes = files.reduce((s,f)=>s+f.size, 0);
  const cap = 50 * 1024 * 1024;
  const overCap = totalBytes > cap;

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",backdropFilter:"blur(2px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div onClick={e=>e.stopPropagation()} onPaste={onPaste}
        style={{width:"min(640px, 100%)",maxHeight:"90vh",background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,.6)"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid var(--line)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--panel2)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span className="mono" style={{fontSize:11,textTransform:"uppercase",letterSpacing:1,color:"var(--ink-dim)"}}>{titles[ctx.kind]}</span>
            {replyPost && (
              <span style={{display:"flex",alignItems:"center",gap:6,fontSize:11}}>
                <span className="mono" style={{color:"var(--accent)"}}>&gt;&gt;{replyPost.id}</span>
                <PeerChip peer={replyPeer}/>
              </span>
            )}
          </div>
          <button onClick={onClose} style={{color:"var(--ink-faint)"}}><Icon name="x" size={14}/></button>
        </div>
        <div style={{padding:14,flex:1,overflow:"auto",display:"flex",flexDirection:"column",gap:12}}
          onDragOver={e=>{e.preventDefault(); setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={onDrop}>
          <textarea value={body} onChange={e=>setBody(e.target.value)} autoFocus
            placeholder="say something… ctrl-V to paste images · drag files here · markdown ok"
            style={{minHeight:120,background:"var(--bg)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"10px 12px",color:"var(--ink)",fontFamily:"var(--font-body)",fontSize:13,lineHeight:1.5,outline:"none",resize:"vertical"}}/>
          {files.length > 0 && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(120px, 1fr))",gap:8}}>
              {files.map(f=>(
                <div key={f.id} style={{position:"relative",aspectRatio:"1 / 1",background:"var(--panel2)",border:"1px solid var(--line)",borderRadius:"var(--radius)",overflow:"hidden"}}>
                  {f.isImg && f.url ? (
                    <img src={f.url} alt={f.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                  ) : (
                    <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--ink-faint)"}}><Icon name="img" size={32}/></div>
                  )}
                  <button onClick={()=>remove(f.id)} title="remove"
                    style={{position:"absolute",top:4,right:4,width:22,height:22,background:"rgba(0,0,0,.75)",color:"#fff",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Icon name="x" size={12}/>
                  </button>
                  <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"4px 6px",background:"linear-gradient(transparent, rgba(0,0,0,.85))",fontFamily:"var(--mono)",fontSize:9,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {f.name} · {(f.size/1024).toFixed(0)}kb
                  </div>
                </div>
              ))}
            </div>
          )}
          {dragOver && (
            <div style={{padding:"14px",border:"2px dashed var(--accent)",borderRadius:"var(--radius)",textAlign:"center",fontFamily:"var(--mono)",fontSize:12,color:"var(--accent)",background:"color-mix(in oklab, var(--accent) 10%, transparent)"}}>⇣ drop to attach</div>
          )}
          <input ref={inputRef} type="file" multiple accept="image/*,video/*" onChange={onPick} style={{display:"none"}}/>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>inputRef.current?.click()} style={{...btn(),display:"inline-flex",alignItems:"center",gap:6,padding:"6px 10px"}}>
              <Icon name="img" size={12}/> add image(s)
            </button>
            <span className="mono" style={{fontSize:10,color:"var(--ink-faint)"}}>
              {files.length} file{files.length===1?"":"s"} · {(totalBytes/1024/1024).toFixed(2)} / 50.00 MB
            </span>
            {overCap && <span className="mono" style={{fontSize:10,color:"var(--danger)"}}>OVER CAP</span>}
            {error && <span className="mono" style={{fontSize:10,color:"var(--danger)"}}>{error}</span>}
          </div>
        </div>
        <div style={{padding:"10px 14px",borderTop:"1px solid var(--line)",background:"var(--panel2)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div className="mono" style={{fontSize:10,color:"var(--ink-faint)"}}>⚿ signed locally · gossiped to {thread.peers || 0} peers · files chunked via blake3</div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={onClose} style={btn()}>cancel</button>
            <button disabled={!body.trim() || overCap || busy} onClick={submit}
              style={{padding:"6px 14px",fontFamily:"var(--mono)",fontSize:11,textTransform:"uppercase",letterSpacing:.8,
                background:(!body.trim()||overCap||busy)?"var(--panel)":"var(--accent)",color:(!body.trim()||overCap||busy)?"var(--ink-faint)":"var(--accent-ink)",
                border:"1px solid var(--line)",borderRadius:"var(--radius)",fontWeight:700,cursor:(!body.trim()||overCap||busy)?"not-allowed":"pointer"}}>
              {busy ? "posting…" : "post ↗"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DMs({ onRefresh }) {
  const [active, setActive] = uS(GC.DMS[0]?.peer || null);
  const [body, setBody] = uS("");
  const [busy, setBusy] = uS(false);
  const [error, setError] = uS(null);
  uE(()=>{ if (!active && GC.DMS[0]?.peer) setActive(GC.DMS[0].peer); },[GC.DMS.length]);
  const conv = GC.DMS.find(c=>c.peer===active);
  const send = async () => {
    if (!active || !body.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      await GCAPI.sendDm(active, body.trim());
      setBody("");
      await onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{display:"flex",height:"100%",minHeight:0}}>
      <div style={{width:280,borderRight:"1px solid var(--line)",background:"var(--panel)",overflow:"auto"}}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid var(--line)"}}>
          <div style={{fontFamily:"var(--font-head)",fontSize:18,fontWeight:700}}>messages</div>
          <div className="mono" style={{fontSize:10,color:"var(--ink-faint)"}}>X25519 · crypto_box · per-peer gossip topic</div>
        </div>
        {GC.DMS.length === 0 && <div className="mono" style={{padding:16,fontSize:11,color:"var(--ink-faint)"}}>no conversations yet</div>}
        {GC.DMS.map(c=>{
          const p = GC.peerBy[c.peer];
          return (
            <button key={c.peer} onClick={()=>setActive(c.peer)} style={{display:"block",width:"100%",textAlign:"left",padding:"10px 14px",borderBottom:"1px solid var(--line)",
              background: active===c.peer?"var(--panel2)":"transparent"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                <PeerChip peer={p}/>
                {c.unread>0 && <span style={{fontFamily:"var(--mono)",fontSize:10,background:"var(--accent)",color:"var(--accent-ink)",padding:"0 5px",borderRadius:"var(--radius)",fontWeight:700}}>{c.unread}</span>}
              </div>
              <div style={{fontSize:12,color:"var(--ink-dim)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.last}</div>
              <div className="mono" style={{fontSize:10,color:"var(--ink-faint)",marginTop:2}}>{c.at}</div>
            </button>
          );
        })}
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        {active ? (
        <>
        <div style={{padding:"12px 18px",borderBottom:"1px solid var(--line)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <PeerChip peer={GC.peerBy[active]} showFp/>
          <span className="mono" style={{fontSize:10,color:"var(--ok)",display:"inline-flex",alignItems:"center",gap:6}}><Icon name="lock" size={10}/> end-to-end · shared secret established</span>
        </div>
        <div style={{flex:1,padding:24,overflow:"auto",display:"flex",flexDirection:"column",gap:10}}>
          {(conv?.messages || []).map((m,i)=>{
            const mine = m.from === GC.SELF_ID;
            const p = GC.peerBy[m.from];
            return (
              <div key={i} style={{display:"flex",justifyContent:mine?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"62%"}}>
                  {!mine && <div style={{marginBottom:2}}><PeerChip peer={p}/></div>}
                  <div style={{padding:"8px 12px",borderRadius:"var(--radius)",background: mine?"var(--accent)":"var(--panel)",color: mine?"var(--accent-ink)":"var(--ink)",fontSize:13,border:mine?"none":"1px solid var(--line)"}}>
                    {m.body}
                  </div>
                  <div className="mono" style={{fontSize:9,color:"var(--ink-faint)",marginTop:2,textAlign:mine?"right":"left"}}>{m.at}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{padding:14,borderTop:"1px solid var(--line)",display:"flex",gap:8}}>
          <input value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") send(); }} placeholder="type… (encrypted before leaving this box)" style={{flex:1,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"8px 12px",outline:"none",fontSize:13}}/>
          {error && <span className="mono" style={{alignSelf:"center",fontSize:10,color:"var(--danger)"}}>{error}</span>}
          <button disabled={busy || !body.trim()} onClick={send} style={{...btn(),background:"var(--accent)",color:"var(--accent-ink)",padding:"8px 14px",fontWeight:700,cursor:busy?"wait":"pointer"}}>{busy ? "sending…" : "send ↗"}</button>
        </div>
        </>
        ) : (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--mono)",color:"var(--ink-faint)"}}>select a conversation</div>
        )}
      </div>
    </div>
  );
}

function Friends({ onRefresh }) {
  const friends = GC.PEERS.filter(p=>p.role==="friend"||p.role==="agent");
  const [friendcodeOpen, setFriendcodeOpen] = uS(false);
  const [adding, setAdding] = uS(false);
  const [friendcode, setFriendcode] = uS("");
  const [error, setError] = uS(null);
  const add = async () => {
    if (!friendcode.trim()) return;
    setError(null);
    try {
      await GCAPI.addPeer(friendcode.trim());
      setFriendcode("");
      setAdding(false);
      await onRefresh?.();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <div style={{padding:"calc(16px * var(--density))",overflow:"auto"}}>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <div style={{fontFamily:"var(--font-head)",fontSize:28,fontWeight:700}}>friends</div>
          <div className="mono" style={{color:"var(--ink-dim)",fontSize:12}}>{friends.filter(f=>f.online).length}/{friends.length} online · direct holepunch where possible</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setFriendcodeOpen(true)} style={{...btn(),padding:"8px 14px"}}>⎘ show my friendcode</button>
          <button onClick={()=>setAdding(true)} style={{...btn(),padding:"8px 14px",background:"var(--accent)",color:"var(--accent-ink)",fontWeight:700}}>+ add friend</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:12}}>
        {friends.map(p=>(
          <div key={p.id} style={{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <PeerGlyph peer={p} size={36}/>
              <div style={{minWidth:0,flex:1}}>
                <div style={{fontWeight:600,color:p.color}}>{p.alias}</div>
                <div className="mono" style={{fontSize:10,color:"var(--ink-faint)",textOverflow:"ellipsis",overflow:"hidden",whiteSpace:"nowrap"}}>{p.fp}</div>
              </div>
              <span style={{fontSize:10,fontFamily:"var(--mono)",letterSpacing:.5,color: p.online?"var(--ok)":"var(--ink-faint)",textTransform:"uppercase"}}>{p.online?"● live":"○ away"}</span>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {p.role==="agent" && <span className="mono" style={{fontSize:10,color:"var(--warn)",border:"1px solid var(--warn)",padding:"1px 6px",borderRadius:"var(--radius)"}}>⚙ agent</span>}
              <span className="mono" style={{fontSize:10,color:"var(--ink-dim)",border:"1px solid var(--line)",padding:"1px 6px",borderRadius:"var(--radius)"}}>⇆ direct</span>
              <span className="mono" style={{fontSize:10,color:"var(--ink-dim)",border:"1px solid var(--line)",padding:"1px 6px",borderRadius:"var(--radius)"}}>trust: accepted</span>
            </div>
            <div style={{display:"flex",gap:4,marginTop:10}}>
              <button style={btn()}>dm</button>
              <button style={btn()}>view catalog</button>
              <button onClick={async()=>{ await GCAPI.blockPeer(p.id); await onRefresh?.(); }} style={{...btn(),color:"var(--danger)"}}>block</button>
            </div>
          </div>
        ))}
      </div>
      {friendcodeOpen && (
        <div onClick={()=>setFriendcodeOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"min(620px,100%)",background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div className="mono" style={{fontSize:11,textTransform:"uppercase",letterSpacing:1,color:"var(--ink-dim)"}}>your friendcode</div>
              <button onClick={()=>setFriendcodeOpen(false)}><Icon name="x" size={14}/></button>
            </div>
            <textarea readOnly value={GC.peerBy[GC.SELF_ID]?.friendcode || GC.peerBy[GC.SELF_ID]?.shortFriendcode || ""} style={{width:"100%",minHeight:120,background:"var(--bg)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:10,color:"var(--ink)",fontFamily:"var(--mono)",fontSize:11}}/>
            <button onClick={()=>navigator.clipboard?.writeText(GC.peerBy[GC.SELF_ID]?.friendcode || GC.peerBy[GC.SELF_ID]?.shortFriendcode || "")} style={{...btn(),marginTop:10}}>copy</button>
          </div>
        </div>
      )}
      {adding && (
        <div onClick={()=>setAdding(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"min(620px,100%)",background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div className="mono" style={{fontSize:11,textTransform:"uppercase",letterSpacing:1,color:"var(--ink-dim)"}}>add friend</div>
              <button onClick={()=>setAdding(false)}><Icon name="x" size={14}/></button>
            </div>
            <textarea value={friendcode} onChange={e=>setFriendcode(e.target.value)} autoFocus placeholder="paste graphchan friendcode…" style={{width:"100%",minHeight:120,background:"var(--bg)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:10,color:"var(--ink)",fontFamily:"var(--mono)",fontSize:11}}/>
            {error && <div className="mono" style={{fontSize:11,color:"var(--danger)",marginTop:8}}>{error}</div>}
            <div style={{display:"flex",justifyContent:"flex-end",gap:6,marginTop:10}}>
              <button onClick={()=>setAdding(false)} style={btn()}>cancel</button>
              <button onClick={add} style={{...btn(),background:"var(--accent)",color:"var(--accent-ink)",fontWeight:700}}>add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Topics({ subscribed, toggleSub, onOpenTopic }) {
  const [topic, setTopic] = uS("");
  const add = async () => {
    const id = topic.replace(/^#/,"").trim();
    if (!id) return;
    await toggleSub(id);
    setTopic("");
  };
  return (
    <div style={{padding:"calc(16px * var(--density))",overflow:"auto"}}>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <div style={{fontFamily:"var(--font-head)",fontSize:28,fontWeight:700}}>topics</div>
          <div className="mono" style={{color:"var(--ink-dim)",fontSize:12}}>DHT-discovered · subscribe to find strangers posting about a thing</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"6px 10px"}}>
          <Icon name="plus" size={12}/>
          <input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") add(); }} placeholder="subscribe to topic…" style={{background:"transparent",border:0,outline:"none",fontSize:12,fontFamily:"var(--mono)",width:220}}/>
          <button onClick={add} style={{color:"var(--accent)",fontFamily:"var(--mono)",fontSize:11}}>add</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))",gap:10}}>
        {GC.TOPICS.map(t=>(
          <div key={t.id} style={{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"14px",position:"relative",overflow:"hidden"}}>
            {t.subscribed && <div style={{position:"absolute",top:0,left:0,bottom:0,width:3,background:"var(--accent)"}}/>}
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
              <div style={{fontFamily:"var(--font-head)",fontSize:18,fontWeight:700}}>#{t.name}</div>
              <div className="mono" style={{fontSize:10,color:"var(--ok)"}}>{t.trend}/24h</div>
            </div>
            <div className="mono" style={{fontSize:11,color:"var(--ink-dim)",marginTop:4}}>{t.peers} peers in mesh</div>
            {t.unread>0 && <div style={{marginTop:6,fontFamily:"var(--mono)",fontSize:10,color:"var(--accent)"}}>● {t.unread} new threads</div>}
            <div style={{marginTop:10,display:"flex",gap:4}}>
              {subscribed.has(t.id) ? <button onClick={()=>toggleSub(t.id)} style={{...btn(),color:"var(--ok)"}}>✓ subscribed</button> : <button onClick={()=>toggleSub(t.id)} style={{...btn(),background:"var(--accent)",color:"var(--accent-ink)",fontWeight:700}}>subscribe</button>}
              <button onClick={()=>onOpenTopic(t.id)} style={btn()}>browse</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Settings() {
  const self = GC.peerBy[GC.SELF_ID];
  const api = GC.API_BASE || "unknown";
  return (
    <div style={{padding:"calc(16px * var(--density))",overflow:"auto",maxWidth:800}}>
      <div style={{fontFamily:"var(--font-head)",fontSize:28,fontWeight:700,marginBottom:16}}>settings</div>
      {[
        ["identity",`GPG: ${self?.fp || "unknown"} · iroh: ${GC.HEALTH?.identity?.iroh_peer_id || "unknown"}`,"local identity loaded from backend"],
        ["storage",`${GC.THREADS.length} threads cached · ${GC.TOTAL_FILES || 0} file references`,"portable data lives beside the executable"],
        ["relay",(GC.HEALTH?.network?.addresses || []).join(" · ") || "no advertised addresses yet","network addresses reported by backend"],
        ["upload cap","50 MB UI soft cap","larger backend limit is controlled by GRAPHCHAN_MAX_UPLOAD_BYTES"],
        ["blocklists","available through REST API","peer and IP blocking endpoints are wired"],
        ["agents",`${GC.PEERS.filter(p=>p.role==="agent").length} agent identities known`,"bring your own LLM endpoint"],
        ["api",api,"Tauri mode starts this backend automatically"],
      ].map(([k,v,hint])=>(
        <div key={k} style={{padding:"14px 0",borderBottom:"1px solid var(--line)",display:"grid",gridTemplateColumns:"140px 1fr auto",gap:16,alignItems:"center"}}>
          <div className="mono" style={{fontSize:12,textTransform:"uppercase",color:"var(--ink-dim)",letterSpacing:.8}}>{k}</div>
          <div>
            <div style={{fontSize:13,fontFamily:"var(--mono)"}}>{v}</div>
            <div style={{fontSize:11,color:"var(--ink-faint)",marginTop:2}}>{hint}</div>
          </div>
          <button disabled style={{...btn(),opacity:.55,cursor:"default"}}>view</button>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Catalog, ThreadView, DMs, Friends, Topics, Settings, btn });
