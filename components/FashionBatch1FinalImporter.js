"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ImageUp, LoaderCircle, Lock, UploadCloud, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

const FILE_MAP = [
  ["Hardstyle_rave_streetwear", "F097"],
  ["Fashion_infographic_style_breakd", "F098"],
  ["Fashion_infographic_about_Douyin", "F099"],
  ["New_Chinese_fashion_infographic", "F100"],
  ["Guochao_streetwear", "F101"],
  ["Modern_Hanfu_fusion", "F102"],
  ["Use_the_uploaded_image_as", "F103"],
  ["JK_uniform", "F104"],
  ["Yabi_subculture", "F105"],
  ["Feizhuliu_fashion", "F106"],
  ["Shamate_fashion", "F107"],
  ["Chinese_Cyber_Y2K", "F108"],
  ["Shanghai_Retro", "F109"],
  ["Creating_Chinese_minimal_heritag", "F110"],
  ["Acubi_fashion", "F111"],
  ["Seoul_Minimal_Streetwear", "F112"],
  ["Streetcore_Seoul", "F113"],
  ["Korean_Y2K", "F114"],
  ["Korean_soft_casual", "F115"],
  ["Korean_Preppy", "F116"],
  ["Seoul_genderless_oversize", "F117"],
  ["Creating_K_Athleisure", "F118"],
  ["K-Pop_stage_glam", "F119"],
  ["Korean_Gothic_Street", "F120"],
  ["Bebot_Y2K_Pinay_Glam", "F121"],
  ["Kikay_Pop_Girly", "F122"],
  ["Jejemon_street", "F123"],
  ["Skoy_Girl", "F124"],
  ["Wan_Boy", "F125"],
  ["Siam_Indie", "F126"],
  ["Singapore_fashion_style", "F127"],
  ["Mat_Rempit", "F128"],
  ["Malaysian_skinhead", "F129"],
  ["Creating_fashion_infographic_poster", "F130"],
  ["Kmeng_Steav", "F131"],
  ["Burmese_punk", "F132"],
  ["Indonesian_pop-rock", "F133"],
  ["Indonesian_Emo_Distro_Kid", "F134"],
  ["Indonesian_distro_streetwear", "F135"],
  ["Fashion_infographic_creation_prompt", "F136"],
  ["Indonesian_garage_retro_band", "F137"],
  ["Indonesian_scooterist", "F138"],
  ["Contemporary_batik_outerwear", "F139"],
  ["Contemporary_batik_tailoring", "F140"],
  ["Modern_Javanese_Beskap_Fusion", "F141"],
  ["Modern_Kebaya_Fusion", "F142"],
  ["Contemporary_sarong", "F143"],
  ["Indonesian_modest_streetwear", "F144"],
  ["Clean_Girl_Minimal", "F145"],
  ["Coquette_fashion", "F146"],
  ["Balletcore_fashion", "F147"],
  ["Dark_Academia", "F148"],
  ["Light_Academia", "F149"],
  ["Cottagecore_fashion", "F150"],
  ["Techwear_fashion", "F151"],
  ["Cyber_Y2K_rave", "F152"],
];

const styleIdForFile = (name = "") => FILE_MAP.find(([prefix]) => name.startsWith(prefix))?.[1] || null;

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

export default function FashionBatch1FinalImporter() {
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

  const mapped = useMemo(() => files.map((file) => ({ file, styleId: styleIdForFile(file.name) })), [files]);
  const matchedCount = mapped.filter((x) => x.styleId).length;

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

    for (let index = 0; index < mapped.length; index += 1) {
      const { file, styleId } = mapped[index];
      if (!styleId) {
        out.push({ ok: false, file: file.name, message: "Filename tidak dikenali" });
        setResults([...out]);
        setProgress(index + 1);
        continue;
      }

      try {
        const { data: row, error: rowError } = await supabase
          .from("fashion_prompts")
          .select("id, source_style_id, slug, title")
          .eq("source_style_id", styleId)
          .single();
        if (rowError || !row) throw rowError || new Error(`Style ${styleId} belum ada di database`);

        const webp = await convertToWebP(file);
        const path = `fashion/batch-1c/${styleId.toLowerCase()}-${row.slug}.webp`;
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

        out.push({ ok: true, file: file.name, message: `${styleId} · ${row.title}` });
      } catch (error) {
        out.push({ ok: false, file: file.name, message: error?.message || "Import gagal" });
      }
      setResults([...out]);
      setProgress(index + 1);
    }
    setRunning(false);
  };

  if (!session) {
    return (
      <main className="b1f-shell"><section className="b1f-login">
        <Link href="/fashion" className="b1f-back"><ArrowLeft size={15}/> Fashion Prompt</Link>
        <Lock size={28}/><h1>Batch 1 Final Import</h1>
        <p>Login admin PromptVault untuk mengunggah 56 infographic F097–F152.</p>
        <form onSubmit={login}>
          <input type="email" placeholder="Admin email" value={email} onChange={(e)=>setEmail(e.target.value)} required/>
          <input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required/>
          {authError && <small className="bad">{authError}</small>}
          <button type="submit"><Lock size={14}/> Sign in</button>
        </form>
      </section><Styles/></main>
    );
  }

  const success = results.filter((x)=>x.ok).length;
  const failed = results.filter((x)=>!x.ok).length;

  return (
    <main className="b1f-shell"><section className="b1f-panel">
      <div className="b1f-head">
        <div><Link href="/fashion" className="b1f-back"><ArrowLeft size={15}/> Fashion Prompt</Link>
        <span>Batch 1 · final section</span><h1>F097–F152 Infographic Import</h1>
        <p>Extract ZIP yang baru, lalu pilih semua 56 JPEG sekaligus. Importer sudah memetakan termasuk empat filename generik: Newgen Jumpstyle, Zhonghua Lolita, Tre Trau, dan Indonesian Indie New-Wave.</p></div>
        <ImageUp size={30}/>
      </div>

      <label className="b1f-drop"><UploadCloud size={30}/><strong>{files.length ? `${files.length} file dipilih` : "Pilih semua 56 gambar"}</strong><small>JPEG / PNG / WebP · multi-select</small>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e)=>{setFiles([...e.target.files]);setResults([]);setProgress(0)}}/>
      </label>

      {!!files.length && <div className="b1f-stats"><b>{files.length}<small>selected</small></b><b>{matchedCount}<small>matched</small></b><b>{files.length-matchedCount}<small>unmatched</small></b><b>{success}<small>uploaded</small></b></div>}

      {!!files.length && <div className="b1f-map">{mapped.map(({file,styleId})=><div key={file.name} className={styleId?"ok":"no"}><b>{styleId||"?"}</b><span>{file.name}</span></div>)}</div>}

      <div className="b1f-actions"><button disabled={!matchedCount||running} onClick={runImport}>{running?<><LoaderCircle className="spin" size={15}/> {progress}/{files.length}</>:<><UploadCloud size={15}/> Import matched images</>}</button><button className="ghost" onClick={()=>supabase.auth.signOut()}>Sign out</button></div>
      {running && <div className="b1f-progress"><i style={{width:`${files.length?(progress/files.length)*100:0}%`}}/></div>}

      {!!results.length && <div className="b1f-results"><header><b>{success} uploaded</b><span>{failed} failed / skipped</span></header>{results.map((x,i)=><div key={i} className={x.ok?"ok":"no"}>{x.ok?<CheckCircle2 size={14}/>:<XCircle size={14}/>}<span><b>{x.message}</b><small>{x.file}</small></span></div>)}</div>}
    </section><Styles/></main>
  );
}

function Styles(){return <style>{`
.b1f-shell{min-height:100vh;background:#08070d;color:#f4effc;font-family:Inter,system-ui,sans-serif;padding:40px 18px 70px;display:grid;place-items:start center;--lav:#b8a1ff;--line:rgba(216,202,255,.15);--panel:#100d17;--muted:#9d92aa}.b1f-shell *{box-sizing:border-box}.b1f-shell a{color:inherit;text-decoration:none}.b1f-panel,.b1f-login{width:min(1040px,100%);background:radial-gradient(circle at 90% 0,rgba(184,161,255,.12),transparent 35%),var(--panel);border:1px solid var(--line);border-radius:26px;padding:26px}.b1f-login{width:min(460px,100%);margin-top:8vh}.b1f-back{display:inline-flex;gap:6px;align-items:center;color:var(--muted);font-size:11px;font-weight:800;margin-bottom:24px}.b1f-login h1,.b1f-head h1{letter-spacing:-.04em}.b1f-login p,.b1f-head p{color:var(--muted);font-size:12px;line-height:1.6}.b1f-login form{display:grid;gap:9px;margin-top:18px}.b1f-login input{height:43px;border:1px solid var(--line);border-radius:11px;padding:0 12px;background:#09070d;color:#fff}.b1f-shell button{height:42px;border:0;border-radius:11px;background:var(--lav);color:#130f1c;font-weight:900;font-size:11px;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer}.b1f-head{display:flex;justify-content:space-between;gap:20px}.b1f-head>div>span{text-transform:uppercase;letter-spacing:.13em;color:var(--lav);font-size:9px;font-weight:900}.b1f-head h1{font-size:36px;margin:8px 0}.b1f-drop{margin-top:20px;min-height:165px;border:1px dashed rgba(216,202,255,.3);border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;color:#8f83a0;cursor:pointer;background:rgba(184,161,255,.03)}.b1f-drop strong{color:#ddd4e8}.b1f-drop input{display:none}.b1f-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:11px}.b1f-stats>b{padding:11px;border:1px solid var(--line);border-radius:12px;background:#09070d;color:#d8caff;font-size:18px}.b1f-stats small{display:block;color:#71677d;font-size:8px;text-transform:uppercase;letter-spacing:.1em}.b1f-map{margin-top:11px;max-height:280px;overflow:auto;background:#09070d;border:1px solid var(--line);border-radius:14px;padding:6px;display:grid;grid-template-columns:1fr 1fr}.b1f-map>div{display:grid;grid-template-columns:45px minmax(0,1fr);gap:7px;padding:7px;border-bottom:1px solid rgba(255,255,255,.035);font-size:9px}.b1f-map b,.b1f-results .ok{color:#8dd8af}.b1f-map .no b,.b1f-results .no{color:#ff9cae}.b1f-map span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#7d7288}.b1f-actions{display:flex;gap:8px;margin-top:13px}.b1f-actions button:first-child{min-width:220px}.b1f-actions button:disabled{opacity:.35}.b1f-actions .ghost{background:#17121f;color:#a99eb5;border:1px solid var(--line)}.b1f-progress{height:5px;background:#17121f;border-radius:99px;overflow:hidden;margin-top:9px}.b1f-progress i{display:block;height:100%;background:linear-gradient(90deg,#7e64cf,#d8caff)}.b1f-results{margin-top:14px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#09070d}.b1f-results header{display:flex;justify-content:space-between;padding:11px 12px;border-bottom:1px solid var(--line);font-size:10px}.b1f-results>div{display:flex;gap:8px;padding:8px 11px;border-bottom:1px solid rgba(255,255,255,.035)}.b1f-results>div span{display:flex;flex-direction:column;font-size:10px}.b1f-results small{font-size:8px;color:#71677d}.bad{color:#ff9cae}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:700px){.b1f-panel{padding:19px}.b1f-head h1{font-size:28px}.b1f-head>svg{display:none}.b1f-stats{grid-template-columns:1fr 1fr}.b1f-map{grid-template-columns:1fr}.b1f-actions{flex-direction:column}.b1f-actions button{width:100%}}
`}</style>}
