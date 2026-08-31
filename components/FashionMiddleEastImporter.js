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

const STYLES = [
  { id: "F153", title: "Amazigh Contemporary", slug: "amazigh-contemporary", aliases: ["amazighcontemporary"] },
  { id: "F154", title: "Beirut Glam Rock Chic", slug: "beirut-glam-rock-chic", aliases: ["beirutglamrockchic"] },
  { id: "F155", title: "Desert Luxury Resort Chic", slug: "desert-luxury-resort-chic", aliases: ["desertluxuryresortchic", "desertluxuryresort"] },
  { id: "F156", title: "Egyptian Pop Glam", slug: "egyptian-pop-glam", aliases: ["egyptianpopglam"] },
  { id: "F157", title: "Egyptian Urban Modest", slug: "egyptian-urban-modest", aliases: ["egyptianurbanmodest"] },
  { id: "F158", title: "Emirati Modern Abaya", slug: "emirati-modern-abaya", aliases: ["emiratimodernabaya"] },
  { id: "F159", title: "Gulf Contemporary", slug: "gulf-contemporary", aliases: ["gulfcontemporary"] },
  { id: "F160", title: "Gulf Refined Modest Luxury", slug: "gulf-refined-modest-luxury", aliases: ["gulfrefinedmodestluxury"] },
  { id: "F161", title: "Jordanian Heritage Fashion", slug: "jordanian-heritage-fashion", aliases: ["jordanianheritagefashion"] },
  { id: "F162", title: "Khaleeji Glam Evening", slug: "khaleeji-glam-evening", aliases: ["khaleejiglamevening"] },
  { id: "F163", title: "Kuwaiti Fashion Forward", slug: "kuwaiti-fashion-forward", aliases: ["kuwaitifashionforward", "kuwaitifashionfoward"] },
  { id: "F164", title: "Levantine Urban Chic", slug: "levantine-urban-chic", aliases: ["levantineurbanchic"] },
  { id: "F165", title: "Modern Thobe", slug: "modern-thobe", aliases: ["modernthobe"] },
  { id: "F166", title: "Moroccan Kaftan", slug: "moroccan-kaftan", aliases: ["moroccankaftan"] },
  { id: "F167", title: "Moroccan Street Heritage", slug: "moroccan-street-heritage", aliases: ["moroccanstreetheritage"] },
  { id: "F168", title: "Palestinian Tatreez Contemporary", slug: "palestinian-tatreez-contemporary", aliases: ["palestiniantatreezcontemporary", "palestiniatatreezcontemp", "palestiniatatreez"] },
  { id: "F169", title: "Persian Contemporary", slug: "persian-contemporary", aliases: ["persiancontemporary"] },
  { id: "F170", title: "Persian Heritage Fusion", slug: "persian-heritage-fusion", aliases: ["persianheritagefusion", "persianheritage"] },
  { id: "F171", title: "Saudi Contemporary Modest", slug: "saudi-contemporary-modest", aliases: ["saudicontemporarymodest"] },
  { id: "F172", title: "Saudi Streetwear Fusion", slug: "saudi-streetwear-fusion", aliases: ["saudistreetwearfusion"] },
];

const normalize = (value = "") => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");

function styleForFile(name = "") {
  const normalized = normalize(name.replace(/\.[^.]+$/, ""));
  return STYLES.find((style) => style.aliases.some((alias) => normalized.includes(alias))) || null;
}

function kindForFile(name = "", forcedKind = null) {
  if (forcedKind) return forcedKind;
  const normalized = normalize(name);
  if (normalized.includes("ootd")) return "ootd";
  if (normalized.includes("info")) return "info";
  return null;
}

async function convertToWebP(file) {
  const image = document.createElement("img");
  const objectUrl = URL.createObjectURL(file);
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = objectUrl;
  });

  const maxSide = 1600;
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * ratio);
  canvas.height = Math.round(image.naturalHeight * ratio);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(objectUrl);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob) throw new Error("WebP conversion failed");
  return blob;
}

export default function FashionMiddleEastImporter() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [infoFiles, setInfoFiles] = useState([]);
  const [ootdFiles, setOotdFiles] = useState([]);
  const [rows, setRows] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  const refreshRows = async () => {
    const { data, error } = await supabase
      .from("fashion_prompts")
      .select("id,source_style_id,title,slug,image_infographic_url,image_img2img_url,status")
      .eq("batch", "middle-east-1")
      .order("source_style_id", { ascending: true });
    if (!error) setRows(data || []);
  };

  useEffect(() => {
    if (session) refreshRows();
  }, [session]);

  const infoMapped = useMemo(
    () => infoFiles.map((file) => ({ file, style: styleForFile(file.name), kind: kindForFile(file.name, "info") })),
    [infoFiles]
  );
  const ootdMapped = useMemo(
    () => ootdFiles.map((file) => ({ file, style: styleForFile(file.name), kind: kindForFile(file.name, "ootd") })),
    [ootdFiles]
  );
  const allMapped = [...infoMapped, ...ootdMapped];
  const matchedCount = allMapped.filter((item) => item.style && item.kind).length;

  const login = async (event) => {
    event.preventDefault();
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setAuthError(error.message);
  };

  const runImport = async () => {
    if (!session || !matchedCount || running) return;
    setRunning(true);
    setProgress(0);
    setResults([]);
    const out = [];

    for (let index = 0; index < allMapped.length; index += 1) {
      const { file, style, kind } = allMapped[index];
      if (!style || !kind) {
        out.push({ ok: false, file: file.name, message: "Filename tidak dikenali" });
        setResults([...out]);
        setProgress(index + 1);
        continue;
      }

      try {
        const { data: row, error: rowError } = await supabase
          .from("fashion_prompts")
          .select("id,source_style_id,title,slug,image_infographic_url,image_img2img_url,status")
          .eq("source_style_id", style.id)
          .single();
        if (rowError || !row) throw rowError || new Error(`Style ${style.id} belum ada di database`);

        const webp = await convertToWebP(file);
        const folder = kind === "info" ? "fashion/middle-east/info" : "fashion/ootd/middle-east";
        const path = `${folder}/${style.id.toLowerCase()}-${row.slug}.webp`;
        const { error: uploadError } = await supabase.storage
          .from("prompt-images")
          .upload(path, webp, { contentType: "image/webp", upsert: true });
        if (uploadError) throw uploadError;

        const publicUrl = supabase.storage.from("prompt-images").getPublicUrl(path).data.publicUrl;
        const otherUrl = kind === "info" ? row.image_img2img_url : row.image_infographic_url;
        const payload = {
          updated_at: new Date().toISOString(),
          status: otherUrl ? "published" : "draft",
          ...(kind === "info" ? { image_infographic_url: publicUrl } : { image_img2img_url: publicUrl }),
        };

        const { error: updateError } = await supabase
          .from("fashion_prompts")
          .update(payload)
          .eq("id", row.id);
        if (updateError) throw updateError;

        out.push({ ok: true, file: file.name, message: `${style.id} · ${kind.toUpperCase()} · ${row.title}` });
      } catch (error) {
        out.push({ ok: false, file: file.name, message: error?.message || "Import gagal" });
      }

      setResults([...out]);
      setProgress(index + 1);
    }

    await refreshRows();
    setRunning(false);
  };

  if (!session) {
    return (
      <main className="mei-shell">
        <section className="mei-login">
          <Link href="/fashion" className="mei-back"><ArrowLeft size={15} /> Fashion Prompt</Link>
          <Lock size={28} />
          <h1>Middle East Fashion Import</h1>
          <p>Login admin PromptVault untuk mengunggah pasangan INFO + OOTD F153–F172.</p>
          <form onSubmit={login}>
            <input type="email" placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {authError && <small className="bad">{authError}</small>}
            <button type="submit"><Lock size={14} /> Sign in</button>
          </form>
        </section>
        <Styles />
      </main>
    );
  }

  const success = results.filter((item) => item.ok).length;
  const failed = results.filter((item) => !item.ok).length;
  const completedRows = rows.filter((row) => row.image_infographic_url && row.image_img2img_url).length;

  return (
    <main className="mei-shell">
      <section className="mei-panel">
        <div className="mei-head">
          <div>
            <Link href="/fashion" className="mei-back"><ArrowLeft size={15} /> Fashion Prompt</Link>
            <span><Shirt size={13} /> Middle East · F153–F172</span>
            <h1>INFO + OOTD Upload</h1>
            <p>Extract ZIP Middle East. Pilih 20 file INFO di kotak pertama dan 20 file OOTD di kotak kedua. Filename akan dipetakan otomatis ke style yang benar, dikonversi ke WebP, lalu ditautkan ke Supabase. Style baru otomatis published setelah kedua gambar tersedia.</p>
          </div>
          <ImageUp size={31} />
        </div>

        <div className="mei-drops">
          <label className="mei-drop">
            <UploadCloud size={28} />
            <strong>{infoFiles.length ? `${infoFiles.length} INFO dipilih` : "Pilih 20 INFO images"}</strong>
            <small>File yang namanya *_Info.jpeg</small>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { setInfoFiles([...e.target.files]); setResults([]); setProgress(0); }} />
          </label>
          <label className="mei-drop">
            <UploadCloud size={28} />
            <strong>{ootdFiles.length ? `${ootdFiles.length} OOTD dipilih` : "Pilih 20 OOTD images"}</strong>
            <small>File yang namanya *_OOTD.jpeg</small>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { setOotdFiles([...e.target.files]); setResults([]); setProgress(0); }} />
          </label>
        </div>

        <div className="mei-stats">
          <b>{rows.length}<small>styles ready</small></b>
          <b>{completedRows}<small>complete pairs</small></b>
          <b>{allMapped.length}<small>selected</small></b>
          <b>{matchedCount}<small>matched</small></b>
        </div>

        <div className="mei-slots">
          {STYLES.map((style) => {
            const row = rows.find((item) => item.source_style_id === style.id);
            const infoSelected = infoMapped.some((item) => item.style?.id === style.id);
            const ootdSelected = ootdMapped.some((item) => item.style?.id === style.id);
            const infoReady = Boolean(row?.image_infographic_url);
            const ootdReady = Boolean(row?.image_img2img_url);
            return (
              <div key={style.id} className="mei-slot">
                <b>{style.id}</b>
                <span>{style.title}</span>
                <i className={infoReady ? "ready" : infoSelected ? "selected" : "missing"}>INFO {infoReady ? "✓" : infoSelected ? "•" : "—"}</i>
                <i className={ootdReady ? "ready" : ootdSelected ? "selected" : "missing"}>OOTD {ootdReady ? "✓" : ootdSelected ? "•" : "—"}</i>
              </div>
            );
          })}
        </div>

        {!!allMapped.length && (
          <div className="mei-map">
            {allMapped.map(({ file, style, kind }) => (
              <div key={`${kind}-${file.name}`} className={style ? "ok" : "no"}>
                <b>{style?.id || "?"}</b>
                <em>{kind?.toUpperCase() || "?"}</em>
                <span>{file.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mei-actions">
          <button disabled={!matchedCount || running} onClick={runImport}>
            {running ? <><LoaderCircle className="spin" size={15} /> {progress}/{allMapped.length}</> : <><UploadCloud size={15} /> Upload matched INFO + OOTD</>}
          </button>
          <button className="ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>

        {running && <div className="mei-progress"><i style={{ width: `${allMapped.length ? (progress / allMapped.length) * 100 : 0}%` }} /></div>}

        {!!results.length && (
          <div className="mei-results">
            <header><b>{success} uploaded</b><span>{failed} failed / skipped</span></header>
            {results.map((item, index) => (
              <div key={`${item.file}-${index}`} className={item.ok ? "ok" : "no"}>
                {item.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                <span><b>{item.message}</b><small>{item.file}</small></span>
              </div>
            ))}
          </div>
        )}
      </section>
      <Styles />
    </main>
  );
}

function Styles() {
  return <style>{`
.mei-shell{min-height:100vh;background:#08070d;color:#f4effc;font-family:Inter,system-ui,sans-serif;padding:40px 18px 70px;display:grid;place-items:start center;--lav:#b8a1ff;--orange:#ff9138;--line:rgba(216,202,255,.15);--panel:#100d17;--muted:#9d92aa}.mei-shell *{box-sizing:border-box}.mei-shell a{color:inherit;text-decoration:none}.mei-panel,.mei-login{width:min(1080px,100%);background:radial-gradient(circle at 90% 0,rgba(184,161,255,.12),transparent 35%),var(--panel);border:1px solid var(--line);border-radius:26px;padding:26px}.mei-login{width:min(460px,100%);margin-top:8vh}.mei-back{display:inline-flex;gap:6px;align-items:center;color:var(--muted);font-size:11px;font-weight:800;margin-bottom:22px}.mei-login h1,.mei-head h1{letter-spacing:-.04em}.mei-login p,.mei-head p{color:var(--muted);font-size:12px;line-height:1.6}.mei-login form{display:grid;gap:9px;margin-top:18px}.mei-login input{height:43px;border:1px solid var(--line);border-radius:11px;padding:0 12px;background:#09070d;color:#fff}.mei-shell button{height:42px;border:0;border-radius:11px;background:var(--lav);color:#130f1c;font-weight:900;font-size:11px;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer}.mei-head{display:flex;justify-content:space-between;gap:20px}.mei-head>div>span{display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:.13em;color:var(--lav);font-size:9px;font-weight:900}.mei-head h1{font-size:36px;margin:8px 0}.mei-drops{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px}.mei-drop{min-height:150px;border:1px dashed rgba(216,202,255,.3);border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;color:#8f83a0;cursor:pointer;background:rgba(184,161,255,.03)}.mei-drop strong{color:#ddd4e8}.mei-drop input{display:none}.mei-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:11px}.mei-stats>b{padding:11px;border:1px solid var(--line);border-radius:12px;background:#09070d;color:#d8caff;font-size:18px}.mei-stats small{display:block;color:#71677d;font-size:8px;text-transform:uppercase;letter-spacing:.1em}.mei-slots{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:12px}.mei-slot{display:grid;grid-template-columns:48px minmax(0,1fr) 76px 76px;align-items:center;gap:8px;padding:9px 10px;border:1px solid rgba(255,255,255,.055);border-radius:11px;background:#09070d}.mei-slot>b{color:#d8caff;font-size:10px}.mei-slot>span{font-size:10px;color:#b9afc5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mei-slot i{font-style:normal;font-size:8px;font-weight:900;text-align:center;padding:5px 6px;border-radius:999px}.mei-slot i.ready{background:rgba(96,211,145,.12);color:#8dd8af}.mei-slot i.selected{background:rgba(255,145,56,.12);color:#ffb47d}.mei-slot i.missing{background:rgba(255,255,255,.04);color:#6f6678}.mei-map{margin-top:11px;max-height:260px;overflow:auto;background:#09070d;border:1px solid var(--line);border-radius:14px;padding:6px;display:grid;grid-template-columns:1fr 1fr}.mei-map>div{display:grid;grid-template-columns:42px 46px minmax(0,1fr);gap:7px;padding:7px;border-bottom:1px solid rgba(255,255,255,.035);font-size:9px}.mei-map b,.mei-results .ok{color:#8dd8af}.mei-map .no b,.mei-results .no{color:#ff9cae}.mei-map em{font-style:normal;color:#ffb47d;font-weight:800}.mei-map span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#7d7288}.mei-actions{display:flex;gap:8px;margin-top:13px}.mei-actions button:first-child{min-width:250px}.mei-actions button:disabled{opacity:.35}.mei-actions .ghost{background:#17121f;color:#a99eb5;border:1px solid var(--line)}.mei-progress{height:4px;border-radius:999px;background:#09070d;margin-top:10px;overflow:hidden}.mei-progress i{display:block;height:100%;background:linear-gradient(90deg,var(--lav),var(--orange))}.mei-results{margin-top:14px;border:1px solid var(--line);border-radius:14px;overflow:hidden}.mei-results header{display:flex;justify-content:space-between;padding:10px 12px;background:#09070d;font-size:10px}.mei-results>div{display:flex;gap:8px;padding:8px 11px;border-top:1px solid rgba(255,255,255,.035)}.mei-results>div>span{display:grid;gap:2px}.mei-results small{color:#71677d}.bad{color:#ff9cae}.spin{animation:mei-spin 1s linear infinite}@keyframes mei-spin{to{transform:rotate(360deg)}}@media(max-width:760px){.mei-drops,.mei-stats,.mei-slots,.mei-map{grid-template-columns:1fr}.mei-slot{grid-template-columns:42px minmax(0,1fr) 68px 68px}.mei-head h1{font-size:28px}.mei-panel{padding:18px}.mei-actions{flex-direction:column}.mei-actions button:first-child{min-width:0;width:100%}}
`}</style>;
}
