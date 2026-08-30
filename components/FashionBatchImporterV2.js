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

const FILE_MAP = [
  ["Ametora_Japanese_Ivy", "F001"],
  ["Create_fashion_infographic_poster", "F002"],
  ["Urahara_streetwear", "F003"],
  ["Harajuku_Decora", "F004"],
  ["Pink_Decora", "F005"],
  ["Creating_Kuro_Dark_Decora", "F006"],
  ["Fairy_Kei", "F007"],
  ["Pop_Kei", "F008"],
  ["Mori_Kei", "F009"],
  ["Dolly_Kei", "F010"],
  ["Cult_Party_Kei", "F011"],
  ["Otome_Kei", "F012"],
  ["Sweet_Lolita", "F013"],
  ["Gothic_Lolita", "F014"],
  ["Classic_Lolita", "F015"],
  ["Transform_infographic_to_fashion", "F016"],
  ["Ouji_Kodona", "F017"],
  ["Visual_Kei", "F018"],
  ["Nagoya_Kei", "F019"],
  ["Oshare_Kei", "F020"],
  ["Angura_Kei", "F021"],
  ["Kogal", "F022"],
  ["Create_Ganguro", "F023"],
  ["Manba_Yamanba", "F024"],
  ["Hime_Gyaru", "F025"],
  ["Himekaji", "F026"],
  ["Agejo_Gyaru", "F027"],
  ["Onee_Gyaru", "F028"],
  ["Rokku_Gyaru", "F029"],
  ["Tsuyome_Gyaru", "F030"],
  ["Gyaruo", "F031"],
  ["Yankii", "F032"],
  ["Bosozoku", "F033"],
  ["Creating_Japanese_avant-garde", "F034"],
  ["Japanese_minimal_utility", "F035"],
  ["Create_Showa_Retro", "F036"],
  ["Create_Ivy_League", "F037"],
  ["Create_classic_preppy", "F038"],
  ["Old_Money_East_Coast", "F039"],
  ["Create_Americana_workwear", "F040"],
  ["Western_cowboy", "F041"],
  ["Rockabilly_Greaser", "F042"],
  ["Biker_fashion", "F043"],
  ["Creating_60s_hippie", "F044"],
  ["Create_70s_boho", "F045"],
  ["Creating_70s_disco_glam", "F046"],
  ["Creating_80s_power_dressing", "F047"],
  ["Create_80s_aerobics", "F048"],

  ["Golden_Age_Hip_Hop", "F049"],
  ["Create_90s_hip-hop", "F050"],
  ["90s_grunge", "F051"],
  ["90s_minimalism", "F052"],
  ["90s_Skater", "F053"],
  ["Y2K_Pop_Glam", "F054"],
  ["McBling", "F055"],
  ["Indie_Sleaze", "F056"],
  ["Hipster", "F057"],
  ["Normcore", "F058"],
  ["Athleisure", "F059"],
  ["Gorpcore", "F060"],
  ["Classic_Emo_2000s", "F061"],
  ["Scene_kid", "F062"],
  ["Fashioncore_2000s", "F063"],
  ["Pop-punk_2000s", "F064"],
  ["Mall_Goth", "F065"],
  ["Teddy_Boy", "F066"],
  ["Mod_fashion", "F067"],
  ["Peacock_Revolution", "F068"],
  ["British_punk", "F069"],
  ["New_Romantic", "F070"],
  ["British_Goth", "F071"],
  ["Football_casual", "F072"],
  ["Acid_House", "F073"],
  ["UK_Garage", "F074"],
  ["Britpop", "F075"],
  ["British_heritage_countryside", "F076"],
  ["London_indie_rock", "F077"],
  ["Parisian_Left_Bank", "F078"],
  ["Parisian_chic", "F079"],
  ["French_New_Wave", "F080"],
  ["BCBG", "F081"],
  ["French_Riviera", "F082"],
  ["Paris_rock_chic", "F083"],
  ["Sprezzatura", "F084"],
  ["Milanese_Sciura", "F085"],
  ["Italian_Riviera", "F086"],
  ["Paninaro", "F087"],
  ["Italian_80s_Power_Glam", "F088"],
  ["Stockholm_minimalism", "F089"],
  ["Copenhagen_Playful_Scandi", "F090"],
  ["Functional_Scandi", "F091"],
  ["New_Nordic_Eclectic", "F092"],
  ["Tecktonik_electro_dance", "F093"],
  ["Classic_Jumpstyle", "F094"],
  ["Melbourne_Shuffle_Raver", "F095"],
  ["Gabber_hardcore_rave", "F096"],
];

const styleIdForFile = (name = "") => FILE_MAP.find(([prefix]) => name.startsWith(prefix))?.[1] || null;
const numericStyleId = (styleId = "") => Number(String(styleId).replace(/\D/g, "")) || 0;
const batchFolderForStyle = (styleId) => numericStyleId(styleId) <= 48 ? "batch-1a" : "batch-1b";

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

export default function FashionBatchImporterV2() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [files, setFiles] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  const mapped = useMemo(
    () => files.map((file) => ({ file, styleId: styleIdForFile(file.name) })),
    [files]
  );

  const matchedCount = mapped.filter((item) => item.styleId).length;
  const duplicateIds = useMemo(() => {
    const seen = new Set();
    const duplicates = new Set();
    mapped.filter((item) => item.styleId).forEach((item) => {
      if (seen.has(item.styleId)) duplicates.add(item.styleId);
      seen.add(item.styleId);
    });
    return duplicates;
  }, [mapped]);

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

    for (let index = 0; index < mapped.length; index += 1) {
      const { file, styleId } = mapped[index];

      if (!styleId) {
        nextResults.push({ file: file.name, ok: false, message: "Filename tidak dikenali" });
        setResults([...nextResults]);
        setProgress(index + 1);
        continue;
      }

      if (duplicateIds.has(styleId)) {
        const prior = mapped.slice(0, index).some((entry) => entry.styleId === styleId);
        if (prior) {
          nextResults.push({ file: file.name, ok: false, message: `Duplikat ${styleId}, dilewati` });
          setResults([...nextResults]);
          setProgress(index + 1);
          continue;
        }
      }

      try {
        const { data: row, error: rowError } = await supabase
          .from("fashion_prompts")
          .select("id, source_style_id, slug, title, batch")
          .eq("source_style_id", styleId)
          .single();

        if (rowError || !row) throw rowError || new Error(`Style ${styleId} tidak ada di database`);

        const webp = await convertToWebP(file);
        const folder = batchFolderForStyle(styleId);
        const path = `fashion/${folder}/${styleId.toLowerCase()}-${row.slug}.webp`;

        const { error: uploadError } = await supabase.storage
          .from("prompt-images")
          .upload(path, webp, { contentType: "image/webp", upsert: true });
        if (uploadError) throw uploadError;

        const publicUrl = supabase.storage.from("prompt-images").getPublicUrl(path).data.publicUrl;
        const { error: updateError } = await supabase
          .from("fashion_prompts")
          .update({ image_infographic_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", row.id);
        if (updateError) throw updateError;

        nextResults.push({ file: file.name, ok: true, message: `${styleId} · ${row.title}` });
      } catch (error) {
        nextResults.push({ file: file.name, ok: false, message: error?.message || "Import gagal" });
      }

      setResults([...nextResults]);
      setProgress(index + 1);
    }

    setRunning(false);
  };

  if (!session) {
    return (
      <main className="fashion-import-shell">
        <div className="fashion-login-card">
          <Link href="/fashion" className="fashion-import-back"><ArrowLeft size={15} /> Fashion Prompt</Link>
          <span className="fashion-lock"><Lock size={20} /></span>
          <h1>Fashion Batch Import</h1>
          <p>Masuk dengan akun admin PromptVault. Importer memakai izin admin yang sama dan tidak membuka upload publik.</p>
          <form onSubmit={login}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
            {authError && <div className="fashion-import-error">{authError}</div>}
            <button type="submit"><Lock size={14} /> Sign in</button>
          </form>
        </div>
        <ImporterStyles />
      </main>
    );
  }

  const successCount = results.filter((item) => item.ok).length;
  const failCount = results.filter((item) => !item.ok).length;

  return (
    <main className="fashion-import-shell">
      <section className="fashion-import-panel">
        <div className="fashion-import-head">
          <div>
            <Link href="/fashion" className="fashion-import-back"><ArrowLeft size={15} /> Fashion Prompt</Link>
            <span className="fashion-import-kicker"><Shirt size={13} /> Admin utility</span>
            <h1>Fashion Infographic Import</h1>
            <p>Importer sekarang mengenali Batch 1A dan Batch 1B, F001–F096. Untuk lanjutan ini extract ZIP lalu pilih seluruh 48 JPEG dari Golden Age Hip-Hop sampai Gabber / Hardcore Rave. File akan dikonversi ke WebP, masuk Supabase Storage, lalu otomatis ditautkan ke style yang benar.</p>
          </div>
          <span className="fashion-import-icon"><ImageUp size={27} /></span>
        </div>

        <label className="fashion-file-drop">
          <UploadCloud size={30} />
          <strong>{files.length ? `${files.length} file dipilih` : "Pilih semua gambar Batch 1A / 1B"}</strong>
          <span>JPEG, PNG, atau WebP · multi-select · F001–F096</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => {
              setFiles([...e.target.files]);
              setResults([]);
              setProgress(0);
            }}
          />
        </label>

        {!!files.length && (
          <div className="fashion-import-summary">
            <span><b>{files.length}</b> selected</span>
            <span><b>{matchedCount}</b> matched</span>
            <span><b>{files.length - matchedCount}</b> unmatched</span>
            <span><b>{duplicateIds.size}</b> duplicate IDs</span>
          </div>
        )}

        {!!files.length && (
          <div className="fashion-map-preview">
            {mapped.map(({ file, styleId }) => (
              <div key={file.name} className={styleId ? "ok" : "bad"}>
                <span>{styleId || "?"}</span>
                <small>{file.name}</small>
              </div>
            ))}
          </div>
        )}

        <div className="fashion-import-runbar">
          <button disabled={!files.length || running || !matchedCount} onClick={runImport}>
            {running
              ? <><LoaderCircle className="spin" size={16} /> Importing {progress}/{files.length}</>
              : <><UploadCloud size={16} /> Import matched images</>}
          </button>
          <button className="logout" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>

        {running && (
          <div className="fashion-progress">
            <i style={{ width: `${files.length ? (progress / files.length) * 100 : 0}%` }} />
          </div>
        )}

        {!!results.length && (
          <section className="fashion-results">
            <header><strong>{successCount} uploaded</strong><span>{failCount} failed / skipped</span></header>
            {results.map((item, index) => (
              <div key={`${item.file}-${index}`} className={item.ok ? "result-ok" : "result-bad"}>
                {item.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                <span><b>{item.message}</b><small>{item.file}</small></span>
              </div>
            ))}
          </section>
        )}
      </section>
      <ImporterStyles />
    </main>
  );
}

function ImporterStyles() {
  return <style>{`
    .fashion-import-shell{min-height:100vh;background:#08070d;color:#f3effa;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:grid;place-items:start center;padding:42px 18px 70px;--lav:#b8a1ff;--lav2:#d8caff;--panel:#100d17;--line:rgba(216,202,255,.15);--muted:#a49ab5}.fashion-import-shell *{box-sizing:border-box}.fashion-import-shell a{text-decoration:none;color:inherit}.fashion-import-shell button,.fashion-import-shell input{font:inherit}
    .fashion-import-panel,.fashion-login-card{width:min(1020px,100%);border:1px solid var(--line);background:radial-gradient(circle at 90% 0,rgba(184,161,255,.13),transparent 32%),var(--panel);border-radius:28px;padding:28px;box-shadow:0 28px 100px rgba(0,0,0,.3)}.fashion-login-card{width:min(480px,100%);margin-top:9vh}.fashion-import-back{display:inline-flex;align-items:center;gap:7px;color:var(--muted);font-size:11px;font-weight:800;margin-bottom:28px}.fashion-import-back:hover{color:var(--lav2)}.fashion-lock,.fashion-import-icon{width:48px;height:48px;border-radius:16px;background:linear-gradient(145deg,var(--lav2),#7558c9);display:grid;place-items:center;color:#120d1d}.fashion-login-card h1,.fashion-import-head h1{letter-spacing:-.045em;margin:13px 0 8px}.fashion-login-card h1{font-size:31px}.fashion-login-card p,.fashion-import-head p{color:var(--muted);font-size:12px;line-height:1.65}.fashion-login-card form{display:grid;gap:9px;margin-top:20px}.fashion-login-card input{height:44px;border:1px solid var(--line);background:#0a0810;color:#fff;border-radius:12px;padding:0 13px;outline:0}.fashion-login-card input:focus{border-color:rgba(184,161,255,.5)}.fashion-login-card button,.fashion-import-runbar button{height:42px;border:0;border-radius:12px;background:var(--lav);color:#120d1c;font-weight:900;font-size:11px;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer}.fashion-import-error{color:#ff9cae;font-size:10px;padding:8px;background:rgba(255,100,130,.06);border:1px solid rgba(255,100,130,.14);border-radius:10px}
    .fashion-import-head{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}.fashion-import-kicker{display:flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:.12em;font-size:9px;color:var(--lav)}.fashion-import-head h1{font-size:38px}.fashion-import-head p{max-width:720px;margin-bottom:0}.fashion-file-drop{margin-top:22px;min-height:175px;border:1px dashed rgba(216,202,255,.28);background:rgba(184,161,255,.035);border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;color:#8f83a0;cursor:pointer;text-align:center;padding:22px}.fashion-file-drop:hover{border-color:rgba(216,202,255,.55);background:rgba(184,161,255,.06)}.fashion-file-drop strong{color:#d9d0e5;font-size:13px}.fashion-file-drop span{font-size:9px;text-transform:uppercase;letter-spacing:.09em}.fashion-file-drop input{display:none}.fashion-import-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}.fashion-import-summary span{border:1px solid var(--line);background:#0b0910;border-radius:13px;padding:11px;color:#756b82;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.fashion-import-summary b{display:block;color:var(--lav2);font-size:18px;letter-spacing:-.03em;margin-bottom:2px}.fashion-map-preview{margin-top:12px;display:grid;grid-template-columns:1fr 1fr;max-height:280px;overflow:auto;border:1px solid var(--line);border-radius:15px;background:#09070d;padding:6px}.fashion-map-preview>div{display:grid;grid-template-columns:45px minmax(0,1fr);gap:7px;padding:7px;border-bottom:1px solid rgba(255,255,255,.035);min-width:0}.fashion-map-preview>div span{font-size:9px;font-weight:900;color:#8dd8af}.fashion-map-preview>div.bad span{color:#ff9cae}.fashion-map-preview small{font-size:9px;color:#796f85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fashion-import-runbar{display:flex;gap:9px;margin-top:14px}.fashion-import-runbar button:first-child{min-width:220px}.fashion-import-runbar button:disabled{opacity:.35;cursor:not-allowed}.fashion-import-runbar .logout{background:#17121f;color:#9e93aa;border:1px solid var(--line)}.fashion-progress{height:5px;background:#130f1b;border-radius:999px;overflow:hidden;margin-top:10px}.fashion-progress i{display:block;height:100%;background:linear-gradient(90deg,#8c6fe0,#d8caff);transition:.2s width}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.fashion-results{margin-top:16px;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#09070d}.fashion-results header{display:flex;justify-content:space-between;padding:12px 13px;border-bottom:1px solid var(--line);font-size:10px}.fashion-results header strong{color:#8dd8af}.fashion-results header span{color:#ff9cae}.fashion-results>div{display:flex;align-items:flex-start;gap:8px;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.035);font-size:10px}.fashion-results>div:last-child{border-bottom:0}.fashion-results .result-ok{color:#8dd8af}.fashion-results .result-bad{color:#ff9cae}.fashion-results>div span{display:flex;flex-direction:column;gap:2px}.fashion-results>div b{color:#c9becf;font-weight:700}.fashion-results>div small{color:#6e647a;font-size:8px}
    @media(max-width:680px){.fashion-import-panel{padding:20px}.fashion-import-head h1{font-size:29px}.fashion-import-icon{display:none}.fashion-import-summary{grid-template-columns:1fr 1fr}.fashion-map-preview{grid-template-columns:1fr}.fashion-import-runbar{flex-direction:column}.fashion-import-runbar button{width:100%}}
  `}</style>;
}
