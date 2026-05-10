/* Three aesthetic directions — all dark-default w/ light inversions */

const THEMES = {
  terminal: {
    label: "phosphor",
    desc: "Amber/green monochrome terminal. BBS / old-internet energy.",
    font: { body:"var(--mono)", head:"var(--mono)" },
    dark: {
      bg:"#0a0b06", panel:"#0f110a", panel2:"#141710", line:"#2a2e1e",
      ink:"#c6e35a", "ink-dim":"#7a8a3a", "ink-faint":"#4a5624",
      accent:"#7cff5a", "accent-ink":"#061507",
      danger:"#ff8c42", warn:"#ffd05a", ok:"#7cff5a",
      radius:"2px",
    },
    light: {
      bg:"#f5efd8", panel:"#ede5c2", panel2:"#e5dcb0", line:"#b8a878",
      ink:"#3d2f0a", "ink-dim":"#6a5a2a", "ink-faint":"#8a7a4a",
      accent:"#b04a00", "accent-ink":"#fff9e6",
      danger:"#a02020", warn:"#8a6a00", ok:"#2a6a20",
      radius:"2px",
    },
  },
  cyber: {
    label: "net.ops",
    desc: "Dense operations console. Neon on carbon. Information-first.",
    font: { body:"var(--sans)", head:"var(--mono)" },
    dark: {
      bg:"#07090e", panel:"#0c1018", panel2:"#121824", line:"#1e2838",
      ink:"#e0eaff", "ink-dim":"#7c8aa8", "ink-faint":"#4a5670",
      accent:"#5ab8ff", "accent-ink":"#001a2e",
      danger:"#ff5a7a", warn:"#ffd05a", ok:"#5affa3",
      radius:"4px",
    },
    light: {
      bg:"#f4f6fa", panel:"#ffffff", panel2:"#eef1f6", line:"#d4dae4",
      ink:"#0e1624", "ink-dim":"#58647a", "ink-faint":"#8a94a8",
      accent:"#0066cc", "accent-ink":"#ffffff",
      danger:"#c02050", warn:"#a0700a", ok:"#1a7a4a",
      radius:"4px",
    },
  },
  brutal: {
    label: "broadsheet",
    desc: "Newspaper-imageboard hybrid. Strong type, cream, rules everywhere.",
    font: { body:"var(--sans)", head:"var(--serif)" },
    dark: {
      bg:"#14110b", panel:"#1b1810", panel2:"#221e14", line:"#3a3220",
      ink:"#f0e6cf", "ink-dim":"#a69a7a", "ink-faint":"#6a604a",
      accent:"#ff9a3c", "accent-ink":"#1a1008",
      danger:"#ff5a5a", warn:"#ffc84a", ok:"#8ac84a",
      radius:"0px",
    },
    light: {
      bg:"#f4ecd6", panel:"#faf4e2", panel2:"#ede3c4", line:"#1a1408",
      ink:"#1a1408", "ink-dim":"#4a3e22", "ink-faint":"#7a6a3e",
      accent:"#8b2a00", "accent-ink":"#faf4e2",
      danger:"#8b0a20", warn:"#7a5a00", ok:"#2a5a10",
      radius:"0px",
    },
  },
};

const ACCENTS = {
  terminal: { lime:"#7cff5a", amber:"#ffb000", cyan:"#5affd0", rose:"#ff5a7a", violet:"#b58cff" },
  cyber:    { cyan:"#5ab8ff", violet:"#a07cff", rose:"#ff5a7a", lime:"#5affa3", amber:"#ffd05a" },
  brutal:   { rust:"#ff9a3c", ink:"#1a1408", red:"#c02020", green:"#2a5a10", blue:"#1a3a8a" },
};

function applyTheme(themeKey, mode, accentHex, density) {
  const t = THEMES[themeKey];
  const pal = t[mode];
  const r = document.documentElement;
  Object.entries(pal).forEach(([k,v])=>{
    if (k === "radius") r.style.setProperty("--radius", v);
    else r.style.setProperty("--"+k, v);
  });
  if (accentHex) {
    r.style.setProperty("--accent", accentHex);
    // compute readable ink on accent
    const hex = accentHex.replace("#",""); const rr=parseInt(hex.slice(0,2),16), gg=parseInt(hex.slice(2,4),16), bb=parseInt(hex.slice(4,6),16);
    const lum = (0.299*rr+0.587*gg+0.114*bb)/255;
    r.style.setProperty("--accent-ink", lum>0.55 ? "#0a0a0a" : "#fafafa");
  }
  r.style.setProperty("--font-body", t.font.body);
  r.style.setProperty("--font-head", t.font.head);
  const d = density === "compact" ? 0.82 : density === "spacious" ? 1.18 : 1;
  r.style.setProperty("--density", d);
  document.body.style.fontFamily = t.font.body;
  document.body.dataset.theme = themeKey;
  document.body.dataset.mode = mode;
}

Object.assign(window, { THEMES, ACCENTS, applyTheme });
