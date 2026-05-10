/* Main app + sidebar + tweaks panel */

const { useState: US, useEffect: UE, useRef: UR } = React;

const DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "cyber",
  "mode": "dark",
  "accent": "#5ab8ff",
  "density": "comfy",
  "nodeStyle": "card"
}/*EDITMODE-END*/;

function Sidebar({ page, setPage, openThread, topicFilter, setTopicFilter, subscribed, toggleSub }) {
  const nav = [
    { id:"catalog", label:"catalog", icon:"home" },
    { id:"dms", label:"messages", icon:"dm", badge:3 },
    { id:"friends", label:"friends", icon:"friend" },
    { id:"topics", label:"topics", icon:"topic" },
    { id:"settings", label:"settings", icon:"settings" },
  ];
  return (
    <div style={{width:240,flexShrink:0,background:"var(--panel)",borderRight:"1px solid var(--line)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"16px 18px",borderBottom:"1px solid var(--line)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:26,height:26,position:"relative",flexShrink:0}}>
            <svg viewBox="0 0 26 26" width="26" height="26">
              <circle cx="13" cy="13" r="11" fill="none" stroke="var(--accent)" strokeWidth="1.5"/>
              <circle cx="13" cy="3" r="2" fill="var(--accent)"/>
              <circle cx="22" cy="17" r="2" fill="var(--accent)"/>
              <circle cx="5" cy="18" r="2" fill="var(--accent)"/>
              <circle cx="13" cy="13" r="2.5" fill="var(--accent)"/>
              <path d="M13 3L13 13L22 17M13 13L5 18" stroke="var(--accent)" strokeOpacity=".5" strokeWidth="1" fill="none"/>
            </svg>
          </div>
          <div>
            <div style={{fontFamily:"var(--font-head)",fontSize:16,fontWeight:700,letterSpacing:-0.3}}>graphchan</div>
            <div className="mono" style={{fontSize:9,color:"var(--ink-faint)",letterSpacing:.8}}>p2p · DAG · wild west</div>
          </div>
        </div>
      </div>

      <div style={{padding:"10px 8px",display:"flex",flexDirection:"column",gap:1}}>
        {nav.map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:"var(--radius)",
            background: page===n.id?"color-mix(in oklab, var(--accent) 18%, transparent)":"transparent",
            color: page===n.id?"var(--accent)":"var(--ink-dim)",
            textAlign:"left",fontSize:13,fontWeight:page===n.id?600:400,position:"relative"}}>
            <Icon name={n.icon} size={15}/>
            <span style={{flex:1}}>{n.label}</span>
            {n.badge && <span style={{fontFamily:"var(--mono)",fontSize:9,background:"var(--accent)",color:"var(--accent-ink)",padding:"0 5px",borderRadius:"var(--radius)",fontWeight:700}}>{n.badge}</span>}
          </button>
        ))}
      </div>

      <div style={{padding:"8px 16px 4px",fontFamily:"var(--mono)",fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"var(--ink-faint)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span>topics</span>
        <button onClick={()=>setPage("topics")} title="browse / subscribe" style={{color:"var(--ink-faint)",fontSize:14,lineHeight:1,padding:"0 4px"}}>+</button>
      </div>
      <div style={{padding:"0 8px 8px",display:"flex",flexDirection:"column",gap:1,overflow:"auto",flex:1,minHeight:0}}>
        <button onClick={()=>{ setTopicFilter(null); setPage("catalog"); }}
          style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px",borderRadius:"var(--radius)",textAlign:"left",fontSize:12,fontFamily:"var(--mono)",
            background: page==="catalog" && !topicFilter ? "color-mix(in oklab, var(--accent) 18%, transparent)" : "transparent",
            color: page==="catalog" && !topicFilter ? "var(--accent)" : "var(--ink-dim)"}}>
          <span style={{color:"var(--ink-faint)"}}>★</span>
          <span style={{flex:1}}>all threads</span>
        </button>
        {GC.TOPICS.filter(t=>subscribed.has(t.id)).map(t=>{
          const active = page==="catalog" && topicFilter===t.id;
          return (
            <button key={t.id} onClick={()=>{ setTopicFilter(t.id); setPage("catalog"); }}
              style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px",borderRadius:"var(--radius)",textAlign:"left",fontSize:12,fontFamily:"var(--mono)",
                background: active ? "color-mix(in oklab, var(--accent) 18%, transparent)" : "transparent",
                color: active ? "var(--accent)" : "var(--ink-dim)",
                fontWeight: active ? 600 : 400}}>
              <span style={{color: active ? "var(--accent)" : "var(--ink-faint)"}}>#</span>
              <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</span>
              {t.unread>0 && <span style={{fontSize:9,color:"var(--accent)"}}>{t.unread}</span>}
            </button>
          );
        })}
      </div>

      <div style={{padding:"10px 16px",borderTop:"1px solid var(--line)",display:"flex",flexDirection:"column",gap:4}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <PeerGlyph peer={GC.peerBy.p_anon01} size={22}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:GC.peerBy.p_anon01.color}}>anon <span style={{color:"var(--ink-faint)",fontWeight:400,fontFamily:"var(--mono)",fontSize:10}}>(you)</span></div>
            <div className="mono" style={{fontSize:9,color:"var(--ink-faint)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>A7666CDA079E647F…</div>
          </div>
        </div>
        <div className="mono" style={{fontSize:9,color:"var(--ink-faint)",display:"flex",justifyContent:"space-between"}}>
          <span>⏺ {GC.NETWORK_STATS.peers_connected}/{GC.NETWORK_STATS.peers_known} peers</span>
          <span style={{color:"var(--ok)"}}>● mesh OK</span>
        </div>
      </div>
    </div>
  );
}

function NetRail() {
  const s = GC.NETWORK_STATS;
  const gb = (s.blobs_bytes/1e9).toFixed(2);
  return (
    <div style={{width:260,flexShrink:0,background:"var(--panel)",borderLeft:"1px solid var(--line)",overflow:"auto",padding:16}}>
      <div className="mono" style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"var(--ink-faint)",marginBottom:10}}>◉ network</div>

      {/* Live peer "constellation" */}
      <div style={{position:"relative",height:160,background:"var(--panel2)",border:"1px solid var(--line)",borderRadius:"var(--radius)",marginBottom:12,overflow:"hidden"}}>
        <svg viewBox="0 0 260 160" width="100%" height="100%">
          <defs>
            <radialGradient id="core"><stop offset="0" stopColor="var(--accent)"/><stop offset="1" stopColor="var(--accent)" stopOpacity="0"/></radialGradient>
          </defs>
          <circle cx="130" cy="80" r="40" fill="url(#core)" opacity="0.3"/>
          <circle cx="130" cy="80" r="4" fill="var(--accent)"/>
          <text x="130" y="98" fill="var(--ink-faint)" fontFamily="var(--mono)" fontSize="9" textAnchor="middle">you</text>
          {GC.PEERS.filter(p=>p.role!=="self" && p.online).map((p,i,arr)=>{
            const theta = (i/arr.length)*Math.PI*2 - Math.PI/2;
            const r = 58 + (i%2)*8;
            const x = 130 + Math.cos(theta)*r;
            const y = 80 + Math.sin(theta)*r;
            return (
              <g key={p.id}>
                <line x1="130" y1="80" x2={x} y2={y} stroke={p.color} strokeOpacity=".25"/>
                <circle cx={x} cy={y} r="3" fill={p.color}/>
                <circle cx={x} cy={y} r="6" fill={p.color} opacity="0.2">
                  <animate attributeName="r" values="3;9;3" dur={(2+i*0.3)+"s"} repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.4;0;0.4" dur={(2+i*0.3)+"s"} repeatCount="indefinite"/>
                </circle>
              </g>
            );
          })}
        </svg>
        <div style={{position:"absolute",top:6,left:8,fontFamily:"var(--mono)",fontSize:9,color:"var(--ink-faint)",letterSpacing:.6}}>MESH · {s.peers_connected} LIVE</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
        {[
          ["peers", `${s.peers_connected}/${s.peers_known}`, "connected/known"],
          ["relays", s.relays, "iroh hints"],
          ["topics", s.topics_subscribed, "DHT subs"],
          ["uptime", s.uptime, "session"],
          ["threads", s.threads_cached, "cached"],
          ["blobs", gb+" GB", "on disk"],
        ].map(([k,v,h])=>(
          <div key={k} style={{padding:"8px 10px",background:"var(--panel2)",border:"1px solid var(--line)",borderRadius:"var(--radius)"}}>
            <div className="mono" style={{fontSize:9,textTransform:"uppercase",color:"var(--ink-faint)",letterSpacing:.6}}>{k}</div>
            <div className="mono" style={{fontSize:14,fontWeight:600,color:"var(--ink)",marginTop:2}}>{v}</div>
            <div className="mono" style={{fontSize:9,color:"var(--ink-faint)"}}>{h}</div>
          </div>
        ))}
      </div>

      <div className="mono" style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"var(--ink-faint)",marginBottom:6}}>recent gossip</div>
      <div style={{display:"flex",flexDirection:"column",gap:3,fontFamily:"var(--mono)",fontSize:10}}>
        {[
          ["↓", "ThreadAnnouncement", "th_rust", "lain"],
          ["↑", "PostUpdate", "th_claude#p14", "you"],
          ["↓", "FileAvailable", "cat.jpg · 2.4MB", "tomoko"],
          ["↑", "ProfileUpdate", "avatar:v3", "you"],
          ["↓", "ThreadAnnouncement", "th_x_meta", "ghost"],
          ["≈", "neighbor up", "topic:claude", "+moloch"],
          ["↓", "DirectMessage", "24b nonce", "nhi"],
        ].map((row,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"14px 92px 1fr",gap:6,padding:"3px 6px",color:"var(--ink-dim)"}}>
            <span style={{color: row[0]==="↓"?"var(--accent)":row[0]==="↑"?"var(--warn)":"var(--ok)"}}>{row[0]}</span>
            <span style={{color:"var(--ink)"}}>{row[1]}</span>
            <span style={{color:"var(--ink-faint)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row[2]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TweaksPanel({ tweaks, setTweaks, onClose }) {
  const t = tweaks;
  const set = (k,v)=> setTweaks({...t, [k]:v});
  return (
    <div style={{position:"fixed",bottom:16,right:16,width:300,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",boxShadow:"0 12px 40px rgba(0,0,0,.5)",zIndex:9999,overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:"1px solid var(--line)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--panel2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,fontFamily:"var(--mono)",fontSize:11,textTransform:"uppercase",letterSpacing:1}}>
          <Icon name="tweak" size={13}/> Tweaks
        </div>
        <button onClick={onClose} style={{color:"var(--ink-faint)"}}><Icon name="x" size={14}/></button>
      </div>
      <div style={{padding:14,display:"flex",flexDirection:"column",gap:14}}>
        <Field label="aesthetic">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
            {Object.entries(THEMES).map(([k,v])=>(
              <button key={k} onClick={()=>{ set("theme",k); set("accent", Object.values(ACCENTS[k])[0]); }}
                style={{padding:"8px 4px",fontFamily:"var(--mono)",fontSize:10,textTransform:"uppercase",letterSpacing:.5,
                  background: t.theme===k?"var(--accent)":"var(--panel2)", color: t.theme===k?"var(--accent-ink)":"var(--ink-dim)",
                  border:"1px solid var(--line)",borderRadius:"var(--radius)"}}>{v.label}</button>
            ))}
          </div>
          <div style={{fontSize:10,color:"var(--ink-faint)",marginTop:4,fontStyle:"italic"}}>{THEMES[t.theme].desc}</div>
        </Field>

        <Field label="mode">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
            {["dark","light"].map(m=>(
              <button key={m} onClick={()=>set("mode",m)} style={{padding:"6px",fontFamily:"var(--mono)",fontSize:10,textTransform:"uppercase",
                background: t.mode===m?"var(--accent)":"var(--panel2)", color: t.mode===m?"var(--accent-ink)":"var(--ink-dim)",
                border:"1px solid var(--line)",borderRadius:"var(--radius)"}}>{m}</button>
            ))}
          </div>
        </Field>

        <Field label="accent">
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {Object.entries(ACCENTS[t.theme]).map(([name,hex])=>(
              <button key={hex} onClick={()=>set("accent",hex)} title={name}
                style={{width:26,height:26,borderRadius:"var(--radius)",background:hex,border: t.accent===hex?"2px solid var(--ink)":"1px solid var(--line)",cursor:"pointer"}}/>
            ))}
          </div>
        </Field>

        <Field label="node style">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
            {["card","chip","dot"].map(m=>(
              <button key={m} onClick={()=>set("nodeStyle",m)} style={{padding:"6px",fontFamily:"var(--mono)",fontSize:10,textTransform:"uppercase",
                background: t.nodeStyle===m?"var(--accent)":"var(--panel2)", color: t.nodeStyle===m?"var(--accent-ink)":"var(--ink-dim)",
                border:"1px solid var(--line)",borderRadius:"var(--radius)"}}>{m}</button>
            ))}
          </div>
        </Field>

        <Field label="density">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
            {["compact","comfy","spacious"].map(m=>(
              <button key={m} onClick={()=>set("density",m)} style={{padding:"6px 4px",fontFamily:"var(--mono)",fontSize:10,textTransform:"uppercase",
                background: t.density===m?"var(--accent)":"var(--panel2)", color: t.density===m?"var(--accent-ink)":"var(--ink-dim)",
                border:"1px solid var(--line)",borderRadius:"var(--radius)"}}>{m.slice(0,6)}</button>
            ))}
          </div>
        </Field>

        <div className="mono" style={{fontSize:9,color:"var(--ink-faint)",textAlign:"center",borderTop:"1px solid var(--line)",paddingTop:10,letterSpacing:.5}}>
          ※ your node, your rules
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }){
  return (
    <div>
      <div className="mono" style={{fontSize:10,textTransform:"uppercase",letterSpacing:.8,color:"var(--ink-faint)",marginBottom:5}}>{label}</div>
      {children}
    </div>
  );
}

function App() {
  const stored = JSON.parse(localStorage.getItem("gc_tweaks") || "null");
  const [tweaks, setTweaks] = US(stored || DEFAULTS);
  // Don't persist "thread" — it requires a threadId we don't store. Reset to catalog on reload.
  const storedPage = localStorage.getItem("gc_page");
  const [page, setPage] = US(storedPage && storedPage !== "thread" ? storedPage : "catalog");
  const [threadId, setThreadId] = US(null);
  const [tweaksOpen, setTweaksOpen] = US(false);
  const [topicFilter, setTopicFilter] = US(null);
  const [subscribed, setSubscribed] = US(()=> new Set(GC.TOPICS.filter(t=>t.subscribed).map(t=>t.id)));
  const toggleSub = (id) => setSubscribed(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  UE(()=>{
    applyTheme(tweaks.theme, tweaks.mode, tweaks.accent, tweaks.density);
    localStorage.setItem("gc_tweaks", JSON.stringify(tweaks));
  }, [tweaks]);

  UE(()=>{ if (page !== "thread") localStorage.setItem("gc_page", page); },[page]);

  // Tweaks host protocol
  UE(()=>{
    const onMsg = (e)=>{
      if (e.data?.type === "__activate_edit_mode") setTweaksOpen(true);
      if (e.data?.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({type:"__edit_mode_available"}, "*");
    return ()=>window.removeEventListener("message", onMsg);
  },[]);

  const openThread = (id)=>{ setThreadId(id); setPage("thread"); };

  let content;
  if (page==="catalog") content = <Catalog onOpen={openThread} topicFilter={topicFilter} setTopicFilter={setTopicFilter}/>;
  else if (page==="thread") content = <ThreadView threadId={threadId} onBack={()=>setPage("catalog")} nodeStyle={tweaks.nodeStyle} density={tweaks.density}/>;
  else if (page==="dms") content = <DMs/>;
  else if (page==="friends") content = <Friends/>;
  else if (page==="topics") content = <Topics subscribed={subscribed} toggleSub={toggleSub} onOpenTopic={(id)=>{ setTopicFilter(id); setPage("catalog"); }}/>;
  else if (page==="settings") content = <Settings/>;

  return (
    <div data-screen-label="Graphchan Client" style={{display:"flex",height:"100vh",width:"100vw",overflow:"hidden",background:"var(--bg)",color:"var(--ink)",fontFamily:"var(--font-body)"}}>
      <Sidebar page={page==="thread"?"catalog":page} setPage={setPage} openThread={openThread} topicFilter={topicFilter} setTopicFilter={setTopicFilter} subscribed={subscribed} toggleSub={toggleSub}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,minHeight:0}}>{content}</div>
      {(page==="catalog"||page==="thread") && <NetRail/>}
      {!tweaksOpen && (
        <button onClick={()=>setTweaksOpen(true)} title="tweaks"
          style={{position:"fixed",bottom:16,right:16,width:40,height:40,borderRadius:"var(--radius)",background:"var(--panel)",border:"1px solid var(--line)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 14px rgba(0,0,0,.4)",zIndex:9998}}>
          <Icon name="tweak" size={18}/>
        </button>
      )}
      {tweaksOpen && <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} onClose={()=>setTweaksOpen(false)}/>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
