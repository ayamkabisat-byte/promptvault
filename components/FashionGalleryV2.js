"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Heart,
  ImageUp,
  Info,
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

export default function FashionGalleryV2() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All");
  const [scene, setScene] = useState("All");
  const [selected, setSelected] = useState(null);
  const [mediaMode, setMediaMode] = useState("look");
  const [copiedId, setCopiedId] = useState(null);
  const [favorites, setFavorites] = useState(() => new Set());

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("fashion_prompts")
        .select("*")
        .eq("status", "published")
        .order("source_style_id", { ascending: true });
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
  const ootdCount = useMemo(() => prompts.filter((p) => p.image_img2img_url).length, [prompts]);

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
    try {
      await supabase.rpc("increment_fashion_prompt_metric", {
        fashion_prompt_id_input: item.id,
        metric_input: type,
      });
    } catch {}
  };

  const openPrompt = useCallback((item) => {
    setSelected(item);
    setMediaMode(item.image_img2img_url ? "look" : "info");
    metric(item, "view");
  }, []);

  const navigateSelected = useCallback((step) => {
    if (!selected || !filtered.length) return;
    const currentIndex = filtered.findIndex((item) => item.id === selected.id);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (baseIndex + step + filtered.length) % filtered.length;
    openPrompt(filtered[nextIndex]);
  }, [selected, filtered, openPrompt]);

  useEffect(() => {
    if (!selected) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowRight") navigateSelected(1);
      if (event.key === "ArrowLeft") navigateSelected(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selected, navigateSelected]);

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

  const selectedImage = selected
    ? mediaMode === "look"
      ? (selected.image_img2img_url || selected.image_infographic_url)
      : (selected.image_infographic_url || selected.image_img2img_url)
    : null;

  const selectedIndex = selected ? filtered.findIndex((item) => item.id === selected.id) : -1;

  return (
    <main className="fp-shell">
      <header className="fp-topbar">
        <div className="fp-topbar-inner">
          <Link href="/" className="fp-back"><ArrowLeft size={15} /> PromptVault</Link>
          <div className="fp-brand">
            <span className="fp-brand-icon"><Shirt size={18} /></span>
            <div><strong>Fashion Prompt</strong><small>Fashion Style Archive</small></div>
          </div>
          <Link href="/fashion/import-ootd" className="fp-import"><ImageUp size={14} /> OOTD Import</Link>
        </div>
      </header>

      <section className="fp-hero">
        <div>
          <span className="fp-eyebrow"><Sparkles size={13} /> A room inside PromptVault</span>
          <h1>Fashion <i>Prompt</i></h1>
          <p>Explore fashion styles through real OOTD looks and infographic breakdowns. Copy the transformation prompt to restyle your own subject while preserving identity.</p>
        </div>
        <div className="fp-stat"><strong>{prompts.length}</strong><span>styles</span><small>{ootdCount} OOTD ready</small></div>
      </section>

      <section className="fp-controls">
        <div className="fp-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Decora, Gyaru, Techwear…" /></div>
        <div className="fp-region-tabs">
          {regions.map((name) => <button key={name} className={region === name ? "active" : ""} onClick={() => setRegion(name)}>{name}</button>)}
        </div>
        <select value={scene} onChange={(e) => setScene(e.target.value)} aria-label="Filter fashion scene">
          {scenes.map((name) => <option key={name}>{name}</option>)}
        </select>
      </section>

      <div className="fp-result"><span>{filtered.length} styles</span><span>LOOK · INFOGRAPHIC · TRANSFORM PROMPT</span></div>

      {loading ? (
        <section className="fp-grid">{Array.from({ length: 12 }).map((_, i) => <div className="fp-skeleton" key={i} />)}</section>
      ) : filtered.length ? (
        <section className="fp-grid">
          {filtered.map((item) => {
            const cover = item.image_img2img_url || item.image_infographic_url;
            return (
              <article key={item.id} className="fp-card" onClick={() => openPrompt(item)}>
                <div className="fp-card-media">
                  {cover ? <img src={cover} alt={item.title} loading="lazy" /> : <div className="fp-placeholder"><Shirt size={30} /><span>Image pending</span></div>}
                  <div className="fp-gradient" />
                  <div className="fp-badges"><span>{item.region}</span>{item.image_img2img_url && <b>LOOK</b>}</div>
                  <div className="fp-card-actions">
                    <button className={favorites.has(item.id) ? "active" : ""} onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }} aria-label="Favorite"><Heart size={15} fill={favorites.has(item.id) ? "currentColor" : "none"} /></button>
                    <button className={copiedId === item.id ? "copied" : ""} onClick={(e) => { e.stopPropagation(); copyPrompt(item); }} aria-label="Copy prompt">{copiedId === item.id ? <Check size={15} /> : <Copy size={15} />}</button>
                  </div>
                </div>
                <div className="fp-card-info">
                  <span>{item.scene}</span><h2>{item.title}</h2>
                  <div><em>{item.era}</em><small><Eye size={11} /> {compact(item.view_count)} · <Heart size={11} /> {compact(item.favorite_count)}</small></div>
                </div>
              </article>
            );
          })}
        </section>
      ) : <div className="fp-empty">No fashion styles match this filter.</div>}

      {selected && (
        <div className="fp-modal-backdrop" onClick={() => setSelected(null)}>
          <aside className="fp-modal" onClick={(e) => e.stopPropagation()}>
            <button className="fp-close" onClick={() => setSelected(null)} aria-label="Close detail" title="Close"><X size={21} /></button>

            <div className="fp-modal-media">
              <div className="fp-media-tabs">
                <button className={mediaMode === "look" ? "active" : ""} disabled={!selected.image_img2img_url} onClick={() => setMediaMode("look")}>LOOK</button>
                <button className={mediaMode === "info" ? "active" : ""} disabled={!selected.image_infographic_url} onClick={() => setMediaMode("info")}><Info size={12} /> INFOGRAPHIC</button>
              </div>

              {filtered.length > 1 && (
                <>
                  <button className="fp-nav fp-nav-prev" onClick={() => navigateSelected(-1)} aria-label="Previous style" title="Previous style"><ChevronLeft size={23} /></button>
                  <button className="fp-nav fp-nav-next" onClick={() => navigateSelected(1)} aria-label="Next style" title="Next style"><ChevronRight size={23} /></button>
                </>
              )}

              {selectedImage ? <img src={selectedImage} alt={`${selected.title} ${mediaMode}`} /> : <div className="fp-placeholder large"><Shirt size={42} /><span>Image pending</span></div>}
              {selectedIndex >= 0 && <div className="fp-counter">{selectedIndex + 1} / {filtered.length}</div>}
            </div>

            <div className="fp-modal-body">
              <span className="fp-eyebrow">{selected.country} · {selected.era}</span>
              <h2>{selected.title}</h2>
              <p className="fp-dna">{selected.visual_dna}</p>
              <div className="fp-meta">
                <div><b>Silhouette</b><span>{selected.silhouette}</span></div>
                <div><b>Wardrobe</b><span>{selected.wardrobe}</span></div>
                <div><b>Hair</b><span>{selected.hair}</span></div>
                <div><b>Makeup / Grooming</b><span>{selected.makeup}</span></div>
                <div><b>Accessories</b><span>{selected.accessories}</span></div>
                <div><b>Palette</b><span>{selected.palette}</span></div>
              </div>
              <div className="fp-prompt">{buildFashionInfographicPrompt(selected)}</div>
              <div className="fp-tags">{(selected.tags || []).map((tag) => <span key={tag}>#{tag}</span>)}</div>
              <div className="fp-actions">
                <button className="primary" onClick={() => copyPrompt(selected)}>{copiedId === selected.id ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy Fashion Transform Prompt</>}</button>
                <button className={favorites.has(selected.id) ? "secondary active" : "secondary"} onClick={() => toggleFavorite(selected)}><Heart size={15} fill={favorites.has(selected.id) ? "currentColor" : "none"} /> Save</button>
                {filtered.length > 1 && <button className="secondary fp-next-inline" onClick={() => navigateSelected(1)}>Next style <ChevronRight size={15} /></button>}
              </div>
            </div>
          </aside>
        </div>
      )}

      <style>{`
        .fp-shell{min-height:100vh;background:#08070d;color:#f5f0ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--lav:#b8a1ff;--lav2:#d8caff;--panel:#100d17;--line:rgba(216,202,255,.14);--muted:#a49ab5}.fp-shell *{box-sizing:border-box}.fp-shell button,.fp-shell input,.fp-shell select{font:inherit}.fp-shell a{text-decoration:none;color:inherit}
        .fp-topbar{position:sticky;top:0;z-index:30;background:rgba(8,7,13,.84);backdrop-filter:blur(18px);border-bottom:1px solid var(--line)}.fp-topbar-inner{max-width:2100px;margin:auto;height:62px;padding:0 clamp(12px,1.8vw,30px);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px}.fp-back,.fp-import{display:inline-flex;align-items:center;gap:7px;color:var(--muted);font-size:12px;font-weight:750}.fp-import{justify-self:end;border:1px solid var(--line);padding:8px 11px;border-radius:999px}.fp-brand{display:flex;align-items:center;gap:9px}.fp-brand-icon{width:34px;height:34px;border-radius:12px;background:linear-gradient(145deg,#c8b7ff,#7254cc);display:grid;place-items:center;color:#120d21}.fp-brand strong{display:block;font-size:14px}.fp-brand small{display:block;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-top:2px}
        .fp-hero{max-width:2100px;margin:auto;padding:38px clamp(12px,1.8vw,30px) 24px;display:grid;grid-template-columns:1fr auto;gap:28px;align-items:end}.fp-eyebrow{display:inline-flex;align-items:center;gap:6px;color:var(--lav);font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:800}.fp-hero h1{font-size:clamp(44px,6.2vw,94px);line-height:.86;margin:16px 0 18px;letter-spacing:-.07em;font-weight:900}.fp-hero h1 i{font-family:Georgia,serif;font-weight:400;color:var(--lav2)}.fp-hero p{max-width:760px;margin:0;color:var(--muted);font-size:14px;line-height:1.65}.fp-stat{width:190px;border:1px solid var(--line);background:radial-gradient(circle at 80% 10%,rgba(184,161,255,.16),transparent 48%),var(--panel);border-radius:22px;padding:20px}.fp-stat strong{font-size:42px;color:var(--lav2)}.fp-stat span,.fp-stat small{display:block}.fp-stat span{font-size:12px;font-weight:800}.fp-stat small{font-size:9px;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:.08em}
        .fp-controls{max-width:2100px;margin:auto;padding:0 clamp(12px,1.8vw,30px);display:grid;grid-template-columns:minmax(260px,1fr) auto minmax(150px,220px);gap:10px;align-items:center}.fp-search{height:44px;border:1px solid var(--line);background:#0d0a13;border-radius:14px;display:flex;align-items:center;gap:9px;padding:0 14px;color:var(--muted)}.fp-search input{border:0;outline:0;background:transparent;color:#fff;width:100%}.fp-region-tabs{display:flex;gap:5px;border:1px solid var(--line);background:#0d0a13;border-radius:14px;padding:4px;max-width:850px;overflow:auto}.fp-region-tabs button{white-space:nowrap;border:0;background:transparent;color:var(--muted);font-size:10px;font-weight:800;padding:8px 10px;border-radius:10px;cursor:pointer}.fp-region-tabs button.active{background:var(--lav);color:#130f1d}.fp-controls select{height:44px;border:1px solid var(--line);background:#0d0a13;color:#ddd3ee;border-radius:14px;padding:0 12px;outline:0}.fp-result{max-width:2100px;margin:10px auto 12px;padding:0 clamp(12px,1.8vw,30px);display:flex;justify-content:space-between;color:#71677f;font-size:9px;text-transform:uppercase;letter-spacing:.12em}

        /* PromptVault-style visual masonry: larger cards, clean image-first layout. */
        .fp-grid{max-width:2100px;margin:auto;padding:0 clamp(12px,1.8vw,30px) 70px;column-count:4;column-gap:16px}.fp-card{break-inside:avoid;display:inline-block;width:100%;margin:0 0 18px;vertical-align:top;background:transparent;border:0;border-radius:0;overflow:visible;cursor:pointer;transition:none}.fp-card:hover{transform:none}.fp-card-media{position:relative;aspect-ratio:3/4;background:#0c0911;border:1px solid rgba(255,255,255,.065);border-radius:14px;overflow:hidden;transition:transform .28s cubic-bezier(.16,1,.3,1),border-color .2s,box-shadow .2s}.fp-card:hover .fp-card-media{transform:translateY(-2px);border-color:rgba(184,161,255,.24);box-shadow:0 20px 50px rgba(0,0,0,.34)}.fp-card-media img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s cubic-bezier(.16,1,.3,1)}.fp-card:hover img{transform:scale(1.025)}.fp-gradient{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,7,13,.02) 52%,rgba(8,7,13,.42) 100%);pointer-events:none}.fp-badges{position:absolute;top:9px;left:9px;right:9px;display:flex;justify-content:space-between;gap:6px}.fp-badges span,.fp-badges b{padding:5px 7px;border-radius:7px;background:rgba(7,7,9,.7);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(10px);font-size:8px;text-transform:uppercase;letter-spacing:.08em}.fp-badges b{background:rgba(216,202,255,.9);color:#170f26}.fp-card-actions{position:absolute;right:9px;top:42px;display:flex;gap:5px;opacity:0;transform:translateX(5px);transition:.2s}.fp-card:hover .fp-card-actions{opacity:1;transform:none}.fp-card-actions button{width:33px;height:33px;border-radius:10px;border:1px solid rgba(255,255,255,.13);background:rgba(8,7,13,.68);color:#ddd2ee;display:grid;place-items:center;cursor:pointer}.fp-card-actions button.active{color:#d3bfff}.fp-card-actions button.copied{background:var(--lav);color:#120d1c}.fp-card-info{padding:9px 2px 0}.fp-card-info>span{font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:var(--lav)}.fp-card-info h2{font-size:13px;line-height:1.28;margin:4px 0 7px;letter-spacing:-.015em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fp-card-info>div{display:flex;justify-content:space-between;gap:7px;color:#686a73;font-size:9px}.fp-card-info em{font-style:normal;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fp-card-info small{display:flex;align-items:center;gap:3px;flex-shrink:0}.fp-placeholder{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#796c8c;font-size:10px}.fp-skeleton{display:inline-block;width:100%;aspect-ratio:3/4;margin:0 0 18px;border-radius:14px;background:linear-gradient(100deg,#0e0b14 30%,#171020 50%,#0e0b14 70%);background-size:300% 100%;animation:pulse 1.8s infinite;border:1px solid var(--line)}@keyframes pulse{0%{background-position:100% 0}100%{background-position:0 0}}.fp-empty{padding:80px;text-align:center;color:var(--muted)}

        .fp-modal-backdrop{position:fixed;inset:0;z-index:80;background:rgba(3,2,6,.88);backdrop-filter:blur(12px);display:grid;place-items:center;padding:20px}.fp-modal{position:relative;width:min(1280px,96vw);max-height:92vh;overflow:auto;background:#0d0a13;border:1px solid rgba(216,202,255,.2);border-radius:26px;display:grid;grid-template-columns:minmax(360px,.9fr) minmax(440px,1.1fr);overscroll-behavior:contain}.fp-close{position:absolute;right:14px;top:14px;z-index:20;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.22);background:rgba(8,7,13,.92);box-shadow:0 8px 28px rgba(0,0,0,.45);color:#fff;display:grid;place-items:center;cursor:pointer}.fp-close:hover{background:var(--lav);color:#140e20}.fp-modal-media{position:relative;min-height:660px;background:#08070d;display:grid;place-items:center;overflow:hidden}.fp-modal-media img{width:100%;height:100%;max-height:88vh;object-fit:contain}.fp-media-tabs{position:absolute;top:14px;left:14px;z-index:8;display:flex;gap:6px;padding:4px;border:1px solid rgba(255,255,255,.12);background:rgba(8,7,13,.72);backdrop-filter:blur(10px);border-radius:999px}.fp-media-tabs button{border:0;background:transparent;color:#b8aec8;padding:7px 10px;border-radius:999px;font-size:9px;font-weight:850;letter-spacing:.08em;display:flex;align-items:center;gap:5px;cursor:pointer}.fp-media-tabs button.active{background:var(--lav);color:#130f1d}.fp-media-tabs button:disabled{opacity:.3;cursor:not-allowed}.fp-nav{position:absolute;z-index:9;top:50%;transform:translateY(-50%);width:43px;height:43px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(8,7,13,.72);backdrop-filter:blur(10px);color:#f2ecff;display:grid;place-items:center;cursor:pointer;transition:.18s}.fp-nav:hover{background:var(--lav);color:#140e20}.fp-nav-prev{left:13px}.fp-nav-next{right:13px}.fp-counter{position:absolute;left:50%;bottom:14px;z-index:8;transform:translateX(-50%);padding:6px 9px;border-radius:999px;background:rgba(8,7,13,.72);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(10px);font-size:9px;color:#c9bfd7;letter-spacing:.08em}.fp-placeholder.large{min-height:620px}.fp-modal-body{padding:54px 34px 34px}.fp-modal-body h2{font-size:34px;line-height:1.02;letter-spacing:-.045em;margin:9px 0 12px}.fp-dna{color:#b5aac1;line-height:1.6;font-size:12px;margin:0 0 18px}.fp-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}.fp-meta div{border:1px solid var(--line);background:#100d17;border-radius:13px;padding:11px}.fp-meta b{display:block;color:var(--lav);font-size:8px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px}.fp-meta span{font-size:10px;line-height:1.45;color:#b9afc5}.fp-prompt{max-height:240px;overflow:auto;white-space:pre-wrap;border:1px solid rgba(184,161,255,.2);background:#09070e;border-radius:15px;padding:15px;color:#cec4d9;font-size:10px;line-height:1.55}.fp-tags{display:flex;flex-wrap:wrap;gap:5px;margin:12px 0}.fp-tags span{font-size:8px;color:#8e819e}.fp-actions{display:flex;gap:8px;flex-wrap:wrap}.fp-actions button{height:42px;border-radius:13px;padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;font-weight:800;font-size:10px}.fp-actions .primary{border:0;background:var(--lav);color:#140e20}.fp-actions .secondary{border:1px solid var(--line);background:#110d18;color:#d8cfdf}.fp-actions .secondary.active{color:var(--lav2)}.fp-next-inline{margin-left:auto}

        @media(max-width:1320px){.fp-grid{column-count:3}.fp-controls{grid-template-columns:1fr}.fp-region-tabs{max-width:none}.fp-modal{grid-template-columns:1fr 1fr}}
        @media(max-width:900px){.fp-grid{column-count:2;column-gap:12px}.fp-hero{grid-template-columns:1fr}.fp-stat{display:none}.fp-modal{display:block}.fp-modal-media{min-height:0}.fp-modal-media img{max-height:66vh}.fp-meta{grid-template-columns:1fr}.fp-topbar-inner{grid-template-columns:1fr auto}.fp-brand{display:none}.fp-card{margin-bottom:15px}}
        @media(max-width:620px){.fp-grid{column-count:2;column-gap:9px;padding-left:9px;padding-right:9px}.fp-card{margin-bottom:12px}.fp-card-media{border-radius:11px}.fp-card-info{padding-top:6px}.fp-card-info h2{font-size:11px}.fp-card-info>div{display:block}.fp-card-info small{margin-top:4px}.fp-card-actions{opacity:1;transform:none;top:36px}.fp-card-actions button{width:29px;height:29px}.fp-hero{padding-top:28px}.fp-hero h1{font-size:54px}.fp-result span:last-child{display:none}.fp-modal-backdrop{padding:0;display:block}.fp-modal{width:100vw;height:100dvh;max-height:100dvh;border:0;border-radius:0;overflow-y:auto;padding-top:0}.fp-close{position:fixed;top:calc(env(safe-area-inset-top, 0px) + 12px);right:12px;z-index:120;width:44px;height:44px;background:rgba(8,7,13,.96);border-color:rgba(255,255,255,.3);box-shadow:0 10px 32px rgba(0,0,0,.62)}.fp-modal-media{min-height:58dvh;padding-top:58px}.fp-media-tabs{position:absolute;top:calc(env(safe-area-inset-top, 0px) + 14px);left:12px;right:68px;width:max-content;max-width:calc(100% - 88px)}.fp-nav{top:auto;bottom:16px;transform:none;width:42px;height:42px}.fp-nav-prev{left:12px}.fp-nav-next{right:12px}.fp-counter{bottom:24px}.fp-modal-body{padding:28px 18px calc(28px + env(safe-area-inset-bottom, 0px))}.fp-modal-body h2{font-size:27px}.fp-actions{display:grid;grid-template-columns:1fr 1fr}.fp-actions .primary{grid-column:1/-1}.fp-next-inline{margin-left:0}.fp-import{font-size:0}.fp-import svg{margin:0}}
      `}</style>
    </main>
  );
}
