"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ImageUp,
  LoaderCircle,
  Lock,
  Shirt,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const GENERIC = new Set([
  "fashion", "infographic", "poster", "breakdown", "design", "create", "creating",
  "style", "styles", "about", "prompt", "transform", "image", "img", "ootd", "look",
  "photo", "photography", "to", "the", "and", "of", "for", "in", "a", "an",
]);

const SPECIAL_ALIASES = {
  F001: ["ametora japanese ivy"],
  F002: ["amekaji japanese american casual", "amekaji"],
  F016: ["punk lolita"],
  F037: ["ivy league"],
  F048: ["80s aerobics fitness", "80s aerobics"],
  F057: ["hipster"],
  F063: ["fashioncore 2000s", "metalcore 2000s"],
  F078: ["parisian left bank"],
  F079: ["parisian chic"],
  F081: ["bcbg"],
  F094: ["classic jumpstyle"],
  F098: ["newgen jumpstyle revival", "newgen jumpstyle"],
  F099: ["douyin glam"],
  F100: ["new chinese", "xin zhongshi"],
  F103: ["zhonghua lolita"],
  F104: ["jk uniform"],
  F105: ["yabi"],
  F106: ["feizhuliu"],
  F107: ["shamate"],
  F109: ["shanghai retro"],
  F123: ["jejemon"],
  F126: ["siam indie", "dek naew"],
  F127: ["ah beng ah lian", "singapore loud street"],
  F128: ["mat rempit"],
  F129: ["malaysian skinhead"],
  F130: ["tre trau"],
  F131: ["kmeng steav"],
  F133: ["indonesian pop rock"],
  F134: ["indonesian emo distro kid"],
  F135: ["indonesian distro streetwear"],
  F136: ["indonesian 2000s indie new wave"],
  F137: ["indonesian garage retro band"],
  F138: ["indonesian scooterist"],
  F139: ["contemporary batik outerwear"],
  F140: ["contemporary batik tailoring"],
  F141: ["modern javanese beskap fusion"],
  F142: ["modern kebaya fusion"],
  F143: ["contemporary sarong"],
  F144: ["indonesian modest streetwear"],
  F145: ["clean girl minimal"],
  F146: ["coquette"],
  F147: ["balletcore"],
  F148: ["dark academia"],
  F149: ["light academia"],
  F150: ["cottagecore"],
  F151: ["techwear"],
  F152: ["cyber y2k rave"],
};

function normalize(value = "") {
  return String(value)
    .replace(/\.[^.]+$/, "")
    .replace(/_20\d{10,}$/i, "")
    .replace(/\s*\(\d+\)$/i, "")
    .replace(/…/g, " ")
    .replace(/&/g, " and ")
    .replace(/[–—]/g, "-")
    .toLowerCase();
}

function tokens(value = "") {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((token) => !GENERIC.has(token) && !/^20\d{2}$/.test(token));
}

function scoreTokens(fileTokens, styleTokens) {
  if (!fileTokens.length || !styleTokens.length) return 0;
  const f = new Set(fileTokens);
  const s = new Set(styleTokens);
  const shared = [...f].filter((token) => s.has(token)).length;
  if (!shared) return 0;
  const coverageStyle = shared / s.size;
  const coverageFile = shared / f.size;
  return coverageStyle * 0.62 + coverageFile * 0.38;
}

function styleScore(fileName, row) {
  const fileTokens = tokens(fileName);
  const candidates = [row.title, ...(SPECIAL_ALIASES[row.source_style_id] || [])];
  return Math.max(...candidates.map((candidate) => scoreTokens(fileTokens, tokens(candidate))), 0);
}

function bestStyleForFile(fileName, rows) {
  const ranked = rows
    .map((row) => ({ row, score: styleScore(fileName, row) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const second = ranked[1];
  if (!best || best.score < 0.54) return null;
  if (second && best.score < 0.72 && best.score - second.score < 0.09) return null;
  return best.row.source_style_id;
}

async function convertToWebP(file) {
  const image = document.createElement("img");
  const objectUrl = URL.createObjectURL(file);
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = objectUrl;
  });

  const maxSide = 1800;
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * ratio);
  canvas.height = Math.round(image.naturalHeight * ratio);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(objectUrl);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
  if (!blob) throw new Error("WebP conversion failed");
  return blob;
}

export default function FashionOOTDImporter() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [styles, setStyles] = useState([]);
  const [files, setFiles] = useState([]);
  const [manualMap, setManualMap] = useState({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("fashion_prompts")
      .select("id,source_style_id,title,slug,image_img2img_url")
      .eq("status", "published")
      .order("source_style_id", { ascending: true })
      .then(({ data }) => setStyles(data || []));
  }, [session]);

  const mapped = useMemo(() => files.map((file) => {
    const automatic = bestStyleForFile(file.name, styles);
    const selected = manualMap[file.name] === undefined ? automatic : manualMap[file.name] || null;
    return { file, styleId: selected, automatic };
  }), [files, styles, manualMap]);

  const duplicateIds = useMemo(() => {
    const counts = new Map();
    mapped.filter((item) => item.styleId).forEach((item) => counts.set(item.styleId, (counts.get(item.styleId) || 0) + 1));
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id));
  }, [mapped]);

  const matchedCount = mapped.filter((item) => item.styleId).length;
  const existingCount = styles.filter((row) => row.image_img2img_url).length;

  const login = async (event) => {
    event.preventDefault();
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setAuthError(error.message);
  };

  const runImport = async () => {
    if (!session || !mapped.length || running) return;
    setRunning(true);
    setProgress(0);
    setResults([]);
    const nextResults = [];
    const seenThisRun = new Set();

    for (let index = 0; index < mapped.length; index += 1) {
      const { file, styleId } = mapped[index];
      if (!styleId) {
        nextResults.push({ file: file.name, ok: false, skipped: true, message: "Tidak dikenali — dilewati" });
        setResults([...nextResults]);
        setProgress(index + 1);
        continue;
      }
      if (duplicateIds.has(styleId) && seenThisRun.has(styleId)) {
        nextResults.push({ file: file.name, ok: false, skipped: true, message: `Duplikat ${styleId} — dilewati` });
        setResults([...nextResults]);
        setProgress(index + 1);
        continue;
      }
      seenThisRun.add(styleId);

      try {
        const row = styles.find((item) => item.source_style_id === styleId);
        if (!row) throw new Error(`Style ${styleId} tidak ditemukan`);
        const webp = await convertToWebP(file);
        const path = `fashion/ootd/batch-1/${styleId.toLowerCase()}-${row.slug}.webp`;
        const { error: uploadError } = await supabase.storage
          .from("prompt-images")
          .upload(path, webp, { contentType: "image/webp", upsert: true });
        if (uploadError) throw uploadError;

        const publicUrl = supabase.storage.from("prompt-images").getPublicUrl(path).data.publicUrl;
        const { error: updateError } = await supabase
          .from("fashion_prompts")
          .update({ image_img2img_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", row.id);
        if (updateError) throw updateError;

        nextResults.push({ file: file.name, ok: true, message: `${styleId} · ${row.title}` });
      } catch (error) {
        nextResults.push({ file: file.name, ok: false, message: error?.message || "Upload gagal" });
      }
      setResults([...nextResults]);
      setProgress(index + 1);
    }

    const { data } = await supabase
      .from("fashion_prompts")
      .select("id,source_style_id,title,slug,image_img2img_url")
      .eq("status", "published")
      .order("source_style_id", { ascending: true });
    setStyles(data || []);
    setRunning(false);
  };

  if (!session) {
    return (
      <main className="ootd-shell">
        <section className="login-card">
          <Link href="/fashion" className="back"><ArrowLeft size={15} /> Fashion Prompt</Link>
          <Lock size={28} />
          <h1>Fashion OOTD Import</h1>
          <p>Login admin PromptVault untuk mengunggah pasangan OOTD ke field <b>image_img2img_url</b>.</p>
          <form onSubmit={login}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
            {authError && <small className="bad">{authError}</small>}
            <button type="submit"><Lock size={14} /> Sign in</button>
          </form>
        </section>
        <Styles />
      </main>
    );
  }

  return (
    <main className="ootd-shell">
      <section className="panel">
        <header>
          <div>
            <Link href="/fashion" className="back"><ArrowLeft size={15} /> Fashion Prompt</Link>
            <span className="kicker"><Shirt size={13} /> Batch 1 · OOTD</span>
            <h1>Fashion OOTD Import</h1>
            <p>Upload gambar fashion look/OOTD. Importer mencocokkan filename dengan F001–F152, mengubahnya ke WebP, menyimpan ke <b>fashion/ootd/batch-1</b>, lalu mengisi <b>image_img2img_url</b>. File yang tidak dikenali akan dilewati.</p>
          </div>
          <ImageUp size={30} />
        </header>

        <div className="status-row">
          <span><b>{styles.length}</b><small>styles</small></span>
          <span><b>{existingCount}</b><small>OOTD uploaded</small></span>
          <span><b>{Math.max(0, styles.length - existingCount)}</b><small>still missing</small></span>
        </div>

        <label className="drop">
          <UploadCloud size={30} />
          <strong>{files.length ? `${files.length} file dipilih` : "Pilih seluruh gambar OOTD"}</strong>
          <span>JPEG, PNG, WebP · multi-select · boleh upload ZIP pertama dan tambahan secara terpisah</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => {
            setFiles([...e.target.files]);
            setManualMap({});
            setResults([]);
            setProgress(0);
          }} />
        </label>

        {!!files.length && <div className="summary">
          <span><b>{files.length}</b> selected</span>
          <span><b>{matchedCount}</b> matched</span>
          <span><b>{files.length - matchedCount}</b> unmatched</span>
          <span><b>{duplicateIds.size}</b> duplicate style IDs</span>
        </div>}

        {!!files.length && <div className="map-list">
          {mapped.map(({ file, styleId }) => (
            <div key={file.name} className={styleId ? (duplicateIds.has(styleId) ? "warn" : "ok") : "no"}>
              <select value={styleId || ""} onChange={(e) => setManualMap((prev) => ({ ...prev, [file.name]: e.target.value }))}>
                <option value="">Skip / unmatched</option>
                {styles.map((row) => <option key={row.id} value={row.source_style_id}>{row.source_style_id} · {row.title}</option>)}
              </select>
              <span title={file.name}>{file.name}</span>
            </div>
          ))}
        </div>}

        <div className="actions">
          <button disabled={!matchedCount || running} onClick={runImport}>
            {running ? <><LoaderCircle className="spin" size={16} /> Uploading {progress}/{files.length}</> : <><UploadCloud size={16} /> Upload matched OOTD</>}
          </button>
          {!!files.length && <button className="ghost" disabled={running} onClick={() => { setFiles([]); setManualMap({}); setResults([]); setProgress(0); }}>Clear</button>}
        </div>

        {running && <div className="progress"><i style={{ width: `${files.length ? (progress / files.length) * 100 : 0}%` }} /></div>}

        {!!results.length && <section className="results">
          <header><b>Import result</b><span>{results.filter((r) => r.ok).length} success · {results.filter((r) => !r.ok && !r.skipped).length} failed · {results.filter((r) => r.skipped).length} skipped</span></header>
          {results.map((result, index) => <div key={`${result.file}-${index}`}>
            {result.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            <span>{result.message}<small>{result.file}</small></span>
          </div>)}
        </section>}
      </section>
      <Styles />
    </main>
  );
}

function Styles() {
  return <style>{`
    .ootd-shell{min-height:100vh;background:#08070d;color:#f5f0ff;font-family:Inter,system-ui,sans-serif;padding:38px 18px 70px;--lav:#b8a1ff;--panel:#100d17;--line:rgba(216,202,255,.15);--muted:#9d92aa}.ootd-shell *{box-sizing:border-box}.ootd-shell a{color:inherit;text-decoration:none}.panel,.login-card{width:min(1100px,100%);margin:auto;background:radial-gradient(circle at 92% 0,rgba(184,161,255,.12),transparent 36%),var(--panel);border:1px solid var(--line);border-radius:26px;padding:26px}.login-card{width:min(460px,100%);margin-top:8vh}.back{display:inline-flex;gap:6px;align-items:center;color:var(--muted);font-size:11px;font-weight:800;margin-bottom:22px}.login-card h1,.panel h1{letter-spacing:-.04em;margin:9px 0}.login-card p,.panel p{color:var(--muted);font-size:12px;line-height:1.6}.login-card form{display:grid;gap:9px;margin-top:18px}.login-card input{height:43px;border:1px solid var(--line);border-radius:11px;padding:0 12px;background:#09070d;color:#fff}.ootd-shell button{height:42px;border:0;border-radius:11px;background:var(--lav);color:#130f1c;font-weight:900;font-size:11px;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer}.panel>header{display:flex;justify-content:space-between;gap:20px}.kicker{display:inline-flex;gap:6px;align-items:center;text-transform:uppercase;letter-spacing:.13em;color:var(--lav);font-size:9px;font-weight:900}.panel h1{font-size:38px}.status-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0 11px}.status-row span{padding:12px;border:1px solid var(--line);border-radius:14px;background:#09070d}.status-row b{font-size:22px;color:#d8caff}.status-row small{display:block;color:#71677d;font-size:8px;text-transform:uppercase;letter-spacing:.1em;margin-top:2px}.drop{min-height:160px;border:1px dashed rgba(216,202,255,.3);border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;color:#8f83a0;cursor:pointer;background:rgba(184,161,255,.03)}.drop strong{color:#ddd4e8}.drop span{font-size:10px}.drop input{display:none}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.summary span{padding:10px;border:1px solid var(--line);border-radius:11px;background:#09070d;font-size:9px;color:#8f83a0}.summary b{color:#d8caff;font-size:16px}.map-list{margin-top:10px;max-height:360px;overflow:auto;border:1px solid var(--line);border-radius:14px;background:#09070d;padding:6px}.map-list>div{display:grid;grid-template-columns:minmax(260px,40%) minmax(0,1fr);gap:8px;padding:6px;border-bottom:1px solid rgba(255,255,255,.035);font-size:9px}.map-list select{height:32px;background:#120e19;color:#ddd4e8;border:1px solid var(--line);border-radius:8px;padding:0 7px;font-size:9px}.map-list span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-self:center;color:#81778b}.map-list .ok select{border-color:rgba(90,220,150,.25)}.map-list .warn select{border-color:rgba(255,200,80,.45)}.map-list .no select{border-color:rgba(255,100,120,.35)}.actions{display:flex;gap:8px;margin-top:12px}.actions button:first-child{min-width:230px}.actions button:disabled{opacity:.35}.actions .ghost{background:#17121f;color:#a99eb5;border:1px solid var(--line)}.progress{height:5px;background:#17121f;border-radius:99px;overflow:hidden;margin-top:9px}.progress i{display:block;height:100%;background:linear-gradient(90deg,#7e64cf,#d8caff)}.results{margin-top:14px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#09070d}.results header{display:flex;justify-content:space-between;padding:11px 12px;border-bottom:1px solid var(--line);font-size:10px}.results>div{display:flex;gap:8px;padding:8px 11px;border-bottom:1px solid rgba(255,255,255,.035);font-size:10px}.results>div span{display:flex;flex-direction:column}.results small{font-size:8px;color:#71677d}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.bad{color:#ff9cae}@media(max-width:700px){.panel{padding:18px}.panel h1{font-size:28px}.status-row{grid-template-columns:1fr}.summary{grid-template-columns:1fr 1fr}.map-list>div{grid-template-columns:1fr}.actions{flex-direction:column}.actions button{width:100%}}
  `}</style>;
}
