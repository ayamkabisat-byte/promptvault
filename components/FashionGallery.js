"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  Heart,
  ImageUp,
  Search,
  Shirt,
  Sparkles,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { buildFashionInfographicPrompt } from "@/lib/fashionPrompt";

const compact = (value = 0) => new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
}).format(Number(value || 0));

const bentoClass = (item, index) => {
  if (item.is_featured) return "fashion-card fashion-card-featured";
  const pattern = ["fashion-card-wide", "fashion-card-normal", "fashion-card-tall", "fashion-card-normal", "fashion-card-wide", "fashion-card-normal"];
  return `fashion-card ${pattern[index % pattern.length]}`;
};

export default function FashionGallery() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All");
  const [scene, setScene] = useState("All");
  const [selected, setSelected] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [favorites, setFavorites] = useState(() => new Set());

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("fashion_prompts")
        .select("*")
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error("Fashion Prompt fetch error", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  useEffect(() => {
    try {
      setFavorites(new Set(JSON.parse(localStorage.getItem("fashion_prompt_favorites") || "[]")));
    } catch {}
  }, []);

  const regions = useMemo(() => ["All", ...new Set(prompts.map((p) => p.region).filter(Boolean))], [prompts]);
  const scenes = useMemo(() => ["All", ...new Set(prompts.map((p) => p.scene).filter(Boolean))], [prompts]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return prompts.filter((item) => {
      if (region !== "All" && item.region !== region) return false;
      if (scene !== "All" && item.scene !== scene) return false;
      if (!needle) return true;
      const hay = `${item.title || ""} ${item.region || ""} ${item.country || ""} ${item.era || ""} ${item.scene || ""} ${item.visual_dna || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [prompts, search, region, scene]);

  const metric = async (item, type) => {
    if (!item?.id) return;
    const field = type === "view" ? "view_count" : type === "copy" ? "copy_count" : "favorite_count";
    const delta = type === "unfavorite" ? -1 : 1;
    setPrompts((rows) => rows.map((row) => row.id === item.id
      ? { ...row, [field]: Math.max(0, Number(row[field] || 0) + delta) }
      : row));
    setSelected((row) => row?.id === item.id
      ? { ...row, [field]: Math.max(0, Number(row[field] || 0) + delta) }
      : row);
    try {
      await supabase.rpc("increment_fashion_prompt_metric", {
        fashion_prompt_id_input: item.id,
        metric_input: type,
      });
    } catch {}
  };

  const openPrompt = (item) => {
    setSelected(item);
    metric(item, "view");
  };

  const copyPrompt = async (item) => {
    const prompt = buildFashionInfographicPrompt(item);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(item.id);
      metric(item, "copy");
      setTimeout(() => setCopiedId(null), 1600);
    } catch {}
  };

  const toggleFavorite = (item) => {
    setFavorites((current) => {
      const next = new Set(current);
      const wasFavorite = next.has(item.id);
      if (wasFavorite) next.delete(item.id); else next.add(item.id);
      localStorage.setItem("fashion_prompt_favorites", JSON.stringify([...next]));
      metric(item, wasFavorite ? "unfavorite" : "favorite");
      return next;
    });
  };

  return (
    <main className="fashion-shell">
      <header className="fashion-topbar">
        <div className="fashion-topbar-inner">
          <Link href="/" className="fashion-back"><ArrowLeft size={15} /> PromptVault</Link>
          <div className="fashion-brand">
            <span className="fashion-brand-icon"><Shirt size={18} /></span>
            <div>
              <strong>Fashion Prompt</strong>
              <small>Infographic Room · style archive</small>
            </div>
          </div>
          <Link href="/fashion/import" className="fashion-import-link"><ImageUp size={14} /> Import Batch</Link>
        </div>
      </header>

      <section className="fashion-hero">
        <div className="fashion-hero-copy">
          <span className="fashion-eyebrow"><Sparkles size={13} /> A room inside PromptVault</span>
          <h1>Fashion <i>Prompt</i></h1>
          <p>Fashion-style infographic prompts with expressive poses, semi-realistic anime editorial rendering, and culturally contextual minimal backgrounds.</p>
        </div>
        <div className="fashion-hero-stat">
          <strong>{prompts.length}</strong>
          <span>styles in the room</span>
          <small>Batch 1A · Japan → USA</small>
        </div>
      </section>

      <section className="fashion-controls">
        <div className="fashion-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Decora, Gyaru, Ivy, Aerobics…" /></div>
        <div className="fashion-region-tabs">
          {regions.map((name) => <button key={name} className={region === name ? "active" : ""} onClick={() => setRegion(name)}>{name}</button>)}
        </div>
        <select value={scene} onChange={(e) => setScene(e.target.value)} aria-label="Filter fashion scene">
          {scenes.map((name) => <option key={name}>{name}</option>)}
        </select>
      </section>

      <div className="fashion-result-line"><span>{filtered.length} styles</span><span>Infographic prompts only</span></div>

      {loading ? (
        <section className="fashion-bento">
          {Array.from({ length: 10 }).map((_, index) => <div className={`fashion-skeleton skeleton-${index % 3}`} key={index} />)}
        </section>
      ) : filtered.length ? (
        <section className="fashion-bento">
          {filtered.map((item, index) => (
            <article key={item.id} className={bentoClass(item, index)} onClick={() => openPrompt(item)}>
              <div className="fashion-card-media">
                {item.image_infographic_url ? (
                  <img src={item.image_infographic_url} alt={item.title} loading="lazy" />
                ) : (
                  <div className="fashion-image-placeholder"><Shirt size={30} /><span>Infographic image<br />ready to import</span></div>
                )}
                <div className="fashion-card-gradient" />
                <div className="fashion-card-badges">
                  <span>{item.region}</span>
                  {item.is_featured && <b><Sparkles size={10} /> Featured</b>}
                </div>
                <div className="fashion-card-actions">
                  <button className={favorites.has(item.id) ? "active" : ""} onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }} aria-label="Favorite"><Heart size={15} fill={favorites.has(item.id) ? "currentColor" : "none"} /></button>
                  <button className={copiedId === item.id ? "copied" : ""} onClick={(e) => { e.stopPropagation(); copyPrompt(item); }} aria-label="Copy prompt">{copiedId === item.id ? <Check size={15} /> : <Copy size={15} />}</button>
                </div>
              </div>
              <div className="fashion-card-info">
                <span className="fashion-card-kicker">{item.scene}</span>
                <h2>{item.title}</h2>
                <div className="fashion-card-foot"><span>{item.era}</span><span><Eye size={11} /> {compact(item.view_count)} · <Heart size={11} /> {compact(item.favorite_count)}</span></div>
              </div>
            </article>
          ))}
        </section>
      ) : <div className="fashion-empty">No fashion styles match this filter.</div>}

      {selected && (
        <div className="fashion-modal-backdrop" onClick={() => setSelected(null)}>
          <aside className="fashion-modal" onClick={(e) => e.stopPropagation()}>
            <button className="fashion-close" onClick={() => setSelected(null)}><X size={18} /></button>
            <div className="fashion-modal-media">
              {selected.image_infographic_url
                ? <img src={selected.image_infographic_url} alt={selected.title} />
                : <div className="fashion-image-placeholder large"><Shirt size={42} /><span>Infographic image not uploaded yet</span></div>}
            </div>
            <div className="fashion-modal-body">
              <span className="fashion-eyebrow">{selected.country} · {selected.era}</span>
              <h2>{selected.title}</h2>
              <p className="fashion-dna">{selected.visual_dna}</p>
              <div className="fashion-meta-grid">
                <div><b>Silhouette</b><span>{selected.silhouette}</span></div>
                <div><b>Wardrobe</b><span>{selected.wardrobe}</span></div>
                <div><b>Hair</b><span>{selected.hair}</span></div>
                <div><b>Makeup / Grooming</b><span>{selected.makeup}</span></div>
                <div><b>Accessories</b><span>{selected.accessories}</span></div>
                <div><b>Palette</b><span>{selected.palette}</span></div>
              </div>
              <div className="fashion-prompt-box">{buildFashionInfographicPrompt(selected)}</div>
              <div className="fashion-tags">{(selected.tags || []).map((tag) => <span key={tag}>#{tag}</span>)}</div>
              <div className="fashion-modal-actions">
                <button className="fashion-primary" onClick={() => copyPrompt(selected)}>{copiedId === selected.id ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy Infographic Prompt</>}</button>
                <button className={`fashion-secondary ${favorites.has(selected.id) ? "active" : ""}`} onClick={() => toggleFavorite(selected)}><Heart size={15} fill={favorites.has(selected.id) ? "currentColor" : "none"} /> Save</button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <style>{`
        .fashion-shell{min-height:100vh;background:#08070d;color:#f5f0ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--lav:#b8a1ff;--lav2:#d8caff;--lav3:#8f73e7;--ink:#08070d;--panel:#100d17;--panel2:#161120;--line:rgba(216,202,255,.14);--muted:#a49ab5;}
        .fashion-shell *{box-sizing:border-box}.fashion-shell button,.fashion-shell input,.fashion-shell select{font:inherit}.fashion-shell a{text-decoration:none;color:inherit}
        .fashion-topbar{position:sticky;top:0;z-index:30;background:rgba(8,7,13,.82);backdrop-filter:blur(18px);border-bottom:1px solid var(--line)}
        .fashion-topbar-inner{max-width:1760px;margin:auto;height:62px;padding:0 clamp(16px,3vw,42px);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px}
        .fashion-back,.fashion-import-link{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;color:var(--muted)}.fashion-back:hover,.fashion-import-link:hover{color:var(--lav2)}
        .fashion-import-link{justify-self:end;border:1px solid var(--line);padding:8px 11px;border-radius:999px;background:rgba(184,161,255,.06)}
        .fashion-brand{display:flex;align-items:center;gap:9px}.fashion-brand-icon{width:34px;height:34px;border-radius:12px;background:linear-gradient(145deg,#c8b7ff,#7254cc);display:grid;place-items:center;color:#120d21;box-shadow:0 8px 28px rgba(143,115,231,.25)}.fashion-brand strong{display:block;font-size:14px;letter-spacing:-.02em}.fashion-brand small{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.1em;margin-top:2px}
        .fashion-hero{max-width:1760px;margin:auto;padding:48px clamp(16px,3vw,42px) 28px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:30px}.fashion-hero-copy{max-width:770px}.fashion-eyebrow{display:inline-flex;align-items:center;gap:6px;color:var(--lav);font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:800}.fashion-hero h1{font-size:clamp(45px,7vw,102px);line-height:.86;margin:17px 0 19px;letter-spacing:-.07em;font-weight:900}.fashion-hero h1 i{font-family:Georgia,serif;font-weight:400;color:var(--lav2)}.fashion-hero p{margin:0;color:var(--muted);font-size:14px;line-height:1.65;max-width:670px}.fashion-hero-stat{width:210px;min-height:150px;border:1px solid var(--line);background:radial-gradient(circle at 80% 10%,rgba(184,161,255,.16),transparent 48%),var(--panel);border-radius:24px;padding:22px;display:flex;flex-direction:column;justify-content:flex-end}.fashion-hero-stat strong{font-size:45px;color:var(--lav2);letter-spacing:-.05em}.fashion-hero-stat span{font-size:12px;font-weight:800}.fashion-hero-stat small{color:var(--muted);font-size:9px;margin-top:4px;text-transform:uppercase;letter-spacing:.08em}
        .fashion-controls{max-width:1760px;margin:0 auto;padding:0 clamp(16px,3vw,42px);display:grid;grid-template-columns:minmax(260px,1fr) auto minmax(150px,220px);gap:10px;align-items:center}.fashion-search{height:44px;border:1px solid var(--line);background:#0d0a13;border-radius:14px;display:flex;align-items:center;gap:9px;padding:0 14px;color:var(--muted)}.fashion-search input{border:0;outline:0;background:transparent;color:#fff;width:100%}.fashion-search input::placeholder{color:#6d6478}.fashion-region-tabs{display:flex;gap:5px;border:1px solid var(--line);background:#0d0a13;border-radius:14px;padding:4px}.fashion-region-tabs button{border:0;background:transparent;color:var(--muted);font-size:10px;font-weight:800;padding:8px 10px;border-radius:10px;cursor:pointer}.fashion-region-tabs button.active{background:var(--lav);color:#130f1d}.fashion-controls select{height:44px;border:1px solid var(--line);background:#0d0a13;color:#ddd3ee;border-radius:14px;padding:0 12px;outline:0}.fashion-result-line{max-width:1760px;margin:10px auto 12px;padding:0 clamp(16px,3vw,42px);display:flex;justify-content:space-between;color:#71677f;font-size:9px;text-transform:uppercase;letter-spacing:.12em}
        .fashion-bento{max-width:1760px;margin:auto;padding:0 clamp(16px,3vw,42px) 70px;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-auto-flow:dense;gap:14px}.fashion-card{grid-column:span 3;background:var(--panel);border:1px solid var(--line);border-radius:22px;overflow:hidden;cursor:pointer;transition:.22s transform,.22s border-color;min-width:0}.fashion-card:hover{transform:translateY(-3px);border-color:rgba(216,202,255,.34)}.fashion-card-wide{grid-column:span 6}.fashion-card-tall{grid-column:span 3;grid-row:span 2}.fashion-card-featured{grid-column:span 6;grid-row:span 2;background:linear-gradient(145deg,#151020,#0d0a12)}
        .fashion-card-media{position:relative;background:radial-gradient(circle at 50% 25%,rgba(184,161,255,.13),transparent 46%),#0c0911;min-height:270px;height:100%;max-height:620px;overflow:hidden}.fashion-card-normal .fashion-card-media{aspect-ratio:4/5}.fashion-card-wide .fashion-card-media{aspect-ratio:16/10}.fashion-card-tall .fashion-card-media,.fashion-card-featured .fashion-card-media{min-height:570px}.fashion-card-media img{width:100%;height:100%;object-fit:contain;display:block;transition:.35s transform}.fashion-card:hover .fashion-card-media img{transform:scale(1.015)}.fashion-card-gradient{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,7,13,.04) 45%,rgba(8,7,13,.74) 100%);pointer-events:none}.fashion-card-badges{position:absolute;top:12px;left:12px;right:12px;display:flex;justify-content:space-between;gap:8px}.fashion-card-badges span,.fashion-card-badges b{display:inline-flex;align-items:center;gap:4px;padding:6px 8px;border:1px solid rgba(255,255,255,.12);background:rgba(8,7,13,.6);backdrop-filter:blur(8px);border-radius:999px;color:#cabfe0;font-size:8px;text-transform:uppercase;letter-spacing:.09em}.fashion-card-badges b{color:#170f26;background:rgba(216,202,255,.88)}.fashion-card-actions{position:absolute;right:12px;bottom:12px;display:flex;gap:6px}.fashion-card-actions button{width:33px;height:33px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(8,7,13,.66);color:#ddd2ee;display:grid;place-items:center;cursor:pointer;backdrop-filter:blur(8px)}.fashion-card-actions button.active{color:#d3bfff}.fashion-card-actions button.copied{background:var(--lav);color:#120d1c}.fashion-card-info{padding:14px 15px 15px}.fashion-card-kicker{font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:var(--lav)}.fashion-card-info h2{font-size:14px;margin:5px 0 9px;letter-spacing:-.025em}.fashion-card-foot{display:flex;justify-content:space-between;gap:8px;align-items:center;color:#746b80;font-size:9px}.fashion-card-foot span:last-child{display:flex;align-items:center;gap:4px}
        .fashion-image-placeholder{width:100%;height:100%;min-height:270px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:11px;color:#796c8c;text-align:center;font-size:10px;line-height:1.45;background:linear-gradient(145deg,rgba(184,161,255,.07),transparent 55%)}.fashion-image-placeholder.large{min-height:520px}.fashion-empty{max-width:1760px;margin:auto;padding:70px 30px;color:var(--muted);text-align:center}.fashion-skeleton{min-height:360px;border-radius:22px;background:linear-gradient(100deg,#0e0b14 30%,#171020 50%,#0e0b14 70%);background-size:300% 100%;animation:fashionPulse 1.8s infinite;border:1px solid var(--line);grid-column:span 3}.fashion-skeleton.skeleton-0{grid-column:span 6}.fashion-skeleton.skeleton-2{min-height:520px}@keyframes fashionPulse{0%{background-position:100% 0}100%{background-position:0 0}}
        .fashion-modal-backdrop{position:fixed;inset:0;z-index:80;background:rgba(3,2,6,.84);backdrop-filter:blur(12px);display:grid;place-items:center;padding:22px}.fashion-modal{position:relative;width:min(1230px,96vw);max-height:92vh;overflow:auto;background:#0d0a13;border:1px solid rgba(216,202,255,.2);border-radius:28px;display:grid;grid-template-columns:minmax(340px,.88fr) minmax(430px,1.12fr);box-shadow:0 30px 100px rgba(0,0,0,.55)}.fashion-close{position:absolute;z-index:4;right:14px;top:14px;width:37px;height:37px;border:1px solid rgba(255,255,255,.13);background:rgba(8,7,13,.72);color:#fff;border-radius:50%;display:grid;place-items:center;cursor:pointer}.fashion-modal-media{background:radial-gradient(circle at 50% 22%,rgba(184,161,255,.16),transparent 48%),#08070c;min-height:620px;display:flex;align-items:center}.fashion-modal-media img{width:100%;height:auto;max-height:88vh;object-fit:contain}.fashion-modal-body{padding:40px 38px}.fashion-modal-body h2{font-size:34px;letter-spacing:-.045em;margin:8px 0 10px}.fashion-dna{color:#b4a9c1;line-height:1.6;font-size:13px;margin:0 0 18px}.fashion-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.fashion-meta-grid>div{border:1px solid var(--line);background:var(--panel2);border-radius:13px;padding:11px}.fashion-meta-grid b{display:block;color:var(--lav);font-size:8px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px}.fashion-meta-grid span{font-size:10px;line-height:1.5;color:#c4b9d0}.fashion-prompt-box{margin-top:14px;white-space:pre-wrap;max-height:260px;overflow:auto;border:1px solid var(--line);background:#09070d;border-radius:15px;padding:14px;color:#bfb4cb;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9px;line-height:1.62}.fashion-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:12px}.fashion-tags span{font-size:8px;color:#9286a1;background:rgba(184,161,255,.07);border:1px solid var(--line);border-radius:999px;padding:5px 7px}.fashion-modal-actions{display:flex;gap:8px;margin-top:16px}.fashion-primary,.fashion-secondary{height:40px;border-radius:12px;padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font-weight:800;font-size:10px;cursor:pointer}.fashion-primary{border:0;background:var(--lav);color:#120d1c;flex:1}.fashion-secondary{border:1px solid var(--line);background:var(--panel2);color:#ddd3e7}.fashion-secondary.active{color:var(--lav2);border-color:rgba(216,202,255,.32)}
        @media(max-width:1100px){.fashion-card,.fashion-card-tall{grid-column:span 4}.fashion-card-wide,.fashion-card-featured{grid-column:span 8}.fashion-controls{grid-template-columns:1fr auto}.fashion-controls select{grid-column:1/-1}.fashion-modal{grid-template-columns:1fr;max-width:720px}.fashion-modal-media{min-height:420px}.fashion-image-placeholder.large{min-height:420px}}
        @media(max-width:760px){.fashion-topbar-inner{grid-template-columns:auto 1fr auto}.fashion-brand small{display:none}.fashion-import-link{font-size:0}.fashion-import-link svg{width:16px;height:16px}.fashion-hero{grid-template-columns:1fr;padding-top:32px}.fashion-hero-stat{display:none}.fashion-controls{grid-template-columns:1fr}.fashion-region-tabs{overflow:auto}.fashion-controls select{grid-column:auto}.fashion-card,.fashion-card-wide,.fashion-card-tall,.fashion-card-featured{grid-column:span 6;grid-row:auto}.fashion-card-tall .fashion-card-media,.fashion-card-featured .fashion-card-media{min-height:440px}.fashion-meta-grid{grid-template-columns:1fr}.fashion-modal-body{padding:28px 20px}}
        @media(max-width:520px){.fashion-bento{gap:10px}.fashion-card,.fashion-card-wide,.fashion-card-tall,.fashion-card-featured{grid-column:1/-1}.fashion-card-media,.fashion-card-normal .fashion-card-media,.fashion-card-wide .fashion-card-media{aspect-ratio:3/4;min-height:0}.fashion-topbar-inner{padding:0 12px}.fashion-back{font-size:0}.fashion-back svg{width:17px;height:17px}.fashion-brand strong{font-size:12px}.fashion-modal-backdrop{padding:8px}.fashion-modal{width:100%;border-radius:20px}.fashion-modal-media{min-height:300px}.fashion-modal-body h2{font-size:27px}}
      `}</style>
    </main>
  );
}
