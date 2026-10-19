"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Copy, Images, Search, Slash, Sparkles, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

const compactRatio = (width, height) => width && height ? `${width} × ${height}` : "Unknown";
const differentRatio = (item) => {
  const a = Number(item.before_width) / Number(item.before_height);
  const b = Number(item.after_width) / Number(item.after_height);
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) > 0.012;
};

export default function SlashLabGallery() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [mode, setMode] = useState("All");
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("compare");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from("slashlab_entries")
          .select("id,entry_code,batch,command,title,category,description,command_type,before_image_url,after_image_url,original_group,original_file_name,result_file_name,before_width,before_height,after_width,after_height,tested_model,source,sort_order,is_featured")
          .eq("status", "published")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });
        if (fetchError) throw fetchError;
        if (alive) setEntries(data || []);
      } catch (err) {
        if (alive) {
          setError("The collection could not be loaded. Please try again later.");
          console.error("SlashLab load error", err);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const categories = useMemo(() => ["All", ...new Set(entries.map((e) => e.category).filter(Boolean))], [entries]);
  const filtered = useMemo(() => entries.filter((item) => {
    if (category !== "All" && item.category !== category) return false;
    if (mode !== "All" && item.command_type !== mode) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return [item.command, item.title, item.category, item.description, item.batch].join(" ").toLowerCase().includes(needle);
  }), [entries, category, mode, search]);

  const openEntry = (item) => { setSelected(item); setView("compare"); };
  const navigate = (step) => {
    if (!selected || filtered.length < 2) return;
    const index = filtered.findIndex((item) => item.id === selected.id);
    openEntry(filtered[((index < 0 ? 0 : index) + step + filtered.length) % filtered.length]);
  };

  useEffect(() => {
    if (!selected) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = priorOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selected]);

  const copy = async (item) => {
    try {
      await navigator.clipboard.writeText(item.command);
      setCopied(item.entry_code);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  };

  return (
    <main className="sl1">
      <header className="sl1-top">
        <Link href="/" className="sl1-back"><ArrowLeft size={15} /> PromptVault</Link>
        <Link href="/" className="sl1-brand"><img src="/logo.png" alt="" /> <strong>Prompt<span>Vault</span></strong></Link>
        <Link href="/fashion" className="sl1-next">Fashion Prompt</Link>
      </header>

      <section className="sl1-hero">
        <div className="sl1-eyebrow"><Slash size={14} /> A PROMPTVAULT COLLECTION</div>
        <h1>Slash<i>Lab.</i></h1>
        <p>A gallery of tested AI photography slash commands. Explore real before-and-after results, copy a single command, and try it on your own photo.</p>
        <div className="sl1-overview">
          <span><b>{entries.length}</b> Tested results</span>
          <span><b>{new Set(entries.map((e) => e.command)).size}</b> Slash commands</span>
          <span><Images size={14} /> Real before &amp; after</span>
        </div>
      </section>

      <section className="sl1-controls" aria-label="Filter slash commands">
        <div className="sl1-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search /goldenhour, lighting, film…" aria-label="Search slash commands" /></div>
        <select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((name) => <option key={name}>{name}</option>)}
        </select>
        <div className="sl1-mode" aria-label="Command type">
          {["All", "single", "mixed"].map((name) => <button type="button" key={name} onClick={() => setMode(name)} className={mode === name ? "active" : ""}>{name === "All" ? "All" : name === "single" ? "Single" : "Mixed"}</button>)}
        </div>
      </section>
      <div className="sl1-results"><span>{loading ? "Loading…" : `${filtered.length} results`}</span><span>BEFORE · AFTER · COPY SLASH</span></div>

      {error ? (
        <div className="sl1-empty" role="alert">{error}</div>
      ) : loading ? (
        <div className="sl1-grid sl1-loading">{Array.from({length:8}).map((_,i)=><div className="sl1-placeholder" key={i}/>)}</div>
      ) : filtered.length ? (
        <div className="sl1-grid">
          {filtered.map((item) => (
            <article key={item.id} className="sl1-card">
              <button type="button" className="sl1-card-main" onClick={() => openEntry(item)} aria-label={`Compare before and after for ${item.command}`}>
                <img src={item.after_image_url} alt={`Result of ${item.command}`} loading="lazy" />
                <span className="sl1-after-label">AFTER</span>
                <span className="sl1-overlay"><Images size={15} /> Compare</span>
              </button>
              <div className="sl1-card-foot">
                <span className="sl1-card-category">{item.category}</span>
                <div className="sl1-card-actions">
                  <button type="button" className="sl1-card-title" onClick={() => openEntry(item)}>{item.command}</button>
                  <button className="sl1-copy-small" type="button" onClick={() => copy(item)} title={`Copy ${item.command}`} aria-label={`Copy ${item.command}`}>{copied === item.entry_code ? <Check size={15}/> : <Copy size={15}/>}</button>
                </div>
                <span className="sl1-card-sub">{item.title} · Batch {item.batch}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="sl1-empty">No slash commands match your filters.</div>
      )}

      <footer className="sl1-footer"><span>SlashLab · PromptVault</span><span>Short commands. Real transformations.</span></footer>

      {selected && (
        <div className="sl1-backdrop" onClick={() => setSelected(null)} role="presentation">
          <section className="sl1-dialog" role="dialog" aria-modal="true" aria-label={`Before and after for ${selected.command}`} onClick={(e) => e.stopPropagation()}>
            <div className="sl1-dialog-head">
              <div className="sl1-dialog-title"><small>{selected.category} · {selected.command_type} · Batch {selected.batch}</small><h2>{selected.command}</h2></div>
              <button type="button" className="sl1-close" aria-label="Close comparison" onClick={() => setSelected(null)}><X size={21}/></button>
            </div>
            <div className="sl1-tabbar" role="group" aria-label="Comparison view">
              {[["compare","Side by side"],["before","Original"],["after","Result"]].map(([name,title])=><button key={name} className={view===name?"active":""} type="button" onClick={()=>setView(name)}>{title}</button>)}
            </div>
            <div className={`sl1-comparison ${view === "compare" ? "compare" : "single-view"}`}>
              {(view==="compare" || view==="before") && <figure><div className="sl1-figure-image"><img src={selected.before_image_url} alt={`Original photo for ${selected.command}`}/></div><figcaption>BEFORE <span>{compactRatio(selected.before_width,selected.before_height)}</span></figcaption></figure>}
              {(view==="compare" || view==="after") && <figure><div className="sl1-figure-image"><img src={selected.after_image_url} alt={`Edited result for ${selected.command}`}/></div><figcaption>AFTER <span>{compactRatio(selected.after_width,selected.after_height)}</span></figcaption></figure>}
            </div>
            <div className="sl1-dialog-bottom">
              <div className="sl1-notes"><strong>{selected.title}</strong><p>{selected.description || "Original photo compared with the tested result of this slash command."}</p>{differentRatio(selected) && <small>Aspect ratio changed in this result. Both photos are shown without cropping.</small>}</div>
              <button className="sl1-copy-primary" onClick={() => copy(selected)} type="button">{copied===selected.entry_code?<Check size={16}/>:<Copy size={16}/>} {copied===selected.entry_code?"Copied!":"Copy Slash"}</button>
            </div>
            <div className="sl1-navbottom">
              <button type="button" onClick={()=>navigate(-1)} disabled={filtered.length<2}><ChevronLeft size={15}/> Previous</button>
              <span>{filtered.findIndex((i)=>i.id===selected.id)+1} / {filtered.length}</span>
              <button type="button" onClick={()=>navigate(1)} disabled={filtered.length<2}>Next <ChevronRight size={15}/></button>
            </div>
          </section>
        </div>
      )}

      <style>{`
        .sl1{min-height:100vh;background:#070709;color:var(--text)}
        .sl1-top{height:62px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 clamp(15px,3vw,48px);max-width:2000px;margin:auto}
        .sl1-back,.sl1-next{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700;color:var(--muted)}
        .sl1-back:hover,.sl1-next:hover{color:var(--accent)}
        .sl1-brand{display:flex;gap:8px;align-items:center;font-size:14px;letter-spacing:-.03em}
        .sl1-brand img{width:30px;height:30px;border-radius:9px;object-fit:cover}
        .sl1-brand span{color:var(--accent)}
        .sl1-hero{max-width:1550px;margin:auto;text-align:center;padding:64px 24px 40px}
        .sl1-eyebrow{display:inline-flex;gap:7px;align-items:center;color:var(--accent2);font-size:10px;letter-spacing:.16em;font-weight:800}
        .sl1-hero h1{font-family:var(--font-display),Georgia,serif;font-weight:400;font-size:clamp(55px,7vw,100px);letter-spacing:-.065em;line-height:1;margin:13px 0 18px}
        .sl1-hero h1 i{color:var(--accent)}
        .sl1-hero p{font-size:13px;line-height:1.85;max-width:650px;margin:0 auto;color:var(--muted)}
        .sl1-overview{margin-top:25px;display:flex;gap:20px;justify-content:center;align-items:center;flex-wrap:wrap;font-size:10px;color:#888991;text-transform:uppercase;letter-spacing:.07em}
        .sl1-overview span{display:flex;align-items:center;gap:6px}.sl1-overview b{font-size:12px;color:#e9e8ed}
        .sl1-controls{max-width:1550px;margin:0 auto;padding:13px 24px;display:flex;gap:10px;align-items:center;border-top:1px solid var(--border)}
        .sl1-search{position:relative;flex:1}.sl1-search svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--dim)}
        .sl1-search input,.sl1-controls select{background:#101115;border:1px solid var(--border);border-radius:11px;height:43px;outline:none;color:var(--text);font-size:11px}
        .sl1-search input{padding:0 14px 0 42px;width:100%}.sl1-search input:focus{border-color:rgba(255,157,46,.4)}
        .sl1-controls select{padding:0 12px;max-width:190px;min-width:120px}
        .sl1-mode{display:flex;padding:4px;border:1px solid var(--border);background:#101115;border-radius:11px;gap:3px}
        .sl1-mode button{border:0;background:transparent;color:var(--muted);font-size:10px;font-weight:700;padding:9px 13px;cursor:pointer;border-radius:8px}
        .sl1-mode button.active{color:#17110b;background:var(--accent)}
        .sl1-results{max-width:1550px;padding:7px 24px 13px;margin:auto;display:flex;justify-content:space-between;color:var(--dim);font-size:9px;letter-spacing:.12em;text-transform:uppercase}
        .sl1-grid{max-width:1550px;margin:0 auto;padding:0 24px 75px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:17px}
        .sl1-card{min-width:0}
        .sl1-card-main{width:100%;aspect-ratio:3/4;border:1px solid var(--border);border-radius:15px;overflow:hidden;position:relative;background:#121319;display:block;padding:0;cursor:pointer}
        .sl1-card-main img{width:100%;height:100%;display:block;object-fit:cover;transition:transform .35s}
        .sl1-card-main:hover img{transform:scale(1.03)}
        .sl1-after-label{position:absolute;left:10px;top:10px;padding:6px 8px;border-radius:7px;background:rgba(0,0,0,.65);color:#f3f3f5;font-size:9px;font-weight:800;letter-spacing:.12em}
        .sl1-overlay{position:absolute;inset:auto 10px 10px 10px;border-radius:9px;display:flex;align-items:center;justify-content:center;gap:7px;background:rgba(9,9,11,.82);padding:11px;color:white;font-size:11px;font-weight:750;opacity:0;transform:translateY(5px);transition:.2s}
        .sl1-card-main:hover .sl1-overlay,.sl1-card-main:focus-visible .sl1-overlay{opacity:1;transform:none}
        .sl1-card-foot{padding:11px 2px}
        .sl1-card-category{color:var(--accent2);font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}
        .sl1-card-actions{display:flex;justify-content:space-between;align-items:center;gap:7px;margin-top:4px}
        .sl1-card-title{border:0;background:none;padding:0;cursor:pointer;color:var(--text);font-size:16px;font-weight:750;text-align:left;overflow-wrap:anywhere}
        .sl1-card-title:hover{color:var(--accent)}
        .sl1-copy-small{flex-shrink:0;width:31px;height:31px;display:grid;place-items:center;border:1px solid var(--border);background:#121317;border-radius:9px;cursor:pointer}
        .sl1-copy-small:hover{border-color:var(--accent);color:var(--accent)}
        .sl1-card-sub{font-size:10px;color:var(--dim);display:block;margin-top:1px}
        .sl1-placeholder{aspect-ratio:3/4;border-radius:15px;background:linear-gradient(105deg,#131419,#202127,#131419);background-size:200% 100%;animation:sl1Shimmer 1.4s infinite}
        @keyframes sl1Shimmer{to{background-position:-200% 0}}
        .sl1-empty{max-width:1500px;margin:auto;text-align:center;padding:100px 20px;color:var(--muted);font-size:13px}
        .sl1-footer{max-width:1550px;margin:auto;border-top:1px solid var(--border);padding:25px 24px 45px;display:flex;justify-content:space-between;gap:10px;color:var(--dim);font-size:9px;text-transform:uppercase;letter-spacing:.12em}
        .sl1-backdrop{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.78);backdrop-filter:blur(8px);padding:24px;display:flex;align-items:center;justify-content:center}
        .sl1-dialog{background:#101116;border:1px solid rgba(255,255,255,.14);width:min(1060px,100%);max-height:95vh;overflow-y:auto;border-radius:21px;box-shadow:0 30px 100px rgba(0,0,0,.45)}
        .sl1-dialog-head{padding:18px 22px 9px;display:flex;align-items:start;justify-content:space-between;gap:12px}
        .sl1-dialog-title small{font-size:10px;color:var(--accent2);text-transform:uppercase;letter-spacing:.1em}
        .sl1-dialog-title h2{font-size:25px;font-weight:800;margin:5px 0 0;letter-spacing:-.02em;overflow-wrap:anywhere}
        .sl1-close{border:1px solid var(--border);background:#17181d;color:var(--text);border-radius:10px;cursor:pointer;width:34px;height:34px;display:grid;place-items:center}
        .sl1-tabbar{display:flex;gap:5px;padding:0 22px 15px}
        .sl1-tabbar button{cursor:pointer;color:var(--muted);background:#15161c;border:1px solid var(--border);padding:8px 12px;border-radius:8px;font-size:10px;font-weight:800}
        .sl1-tabbar button.active{background:var(--accent);color:#17110a;border-color:var(--accent)}
        .sl1-comparison{background:#07080a;display:grid;gap:13px;padding:15px 20px}
        .sl1-comparison.compare{grid-template-columns:repeat(2,minmax(0,1fr))}
        .sl1-comparison.single-view{grid-template-columns:minmax(0,1fr)}
        .sl1-comparison figure{min-width:0;margin:0}
        .sl1-figure-image{width:100%;height:min(50vh,510px);display:flex;justify-content:center;align-items:center;background:#08090c;border-radius:11px;overflow:hidden}
        .sl1-comparison img{width:100%;height:100%;object-fit:contain;display:block}
        .sl1-comparison figcaption{padding:8px 3px 2px;font-weight:750;font-size:10px;letter-spacing:.12em;color:#cccdd2;display:flex;align-items:center;justify-content:space-between}
        .sl1-comparison figcaption span{font-size:10px;font-weight:500;color:var(--dim);letter-spacing:0}
        .sl1-dialog-bottom{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:20px 22px}
        .sl1-notes strong{font-size:12px}.sl1-notes p{font-size:11px;line-height:1.6;color:var(--muted);margin:4px 0 0}
        .sl1-notes small{display:block;margin-top:7px;color:#a4a4ae;font-size:10px}
        .sl1-copy-primary{display:flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;cursor:pointer;background:var(--accent);border:0;border-radius:11px;color:#1c130a;font-size:11px;font-weight:800;padding:13px 17px}
        .sl1-navbottom{border-top:1px solid var(--border);padding:10px 22px 16px;display:flex;justify-content:space-between;align-items:center}
        .sl1-navbottom button{font-size:10px;display:flex;gap:5px;align-items:center;cursor:pointer;color:var(--muted);border:0;background:none}.sl1-navbottom button:disabled{opacity:.35;cursor:default}
        .sl1-navbottom span{font-size:10px;color:var(--dim)}
        @media(min-width:1700px){.sl1-grid{grid-template-columns:repeat(5,minmax(0,1fr))}}
        @media(max-width:1120px){.sl1-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
        @media(max-width:760px){.sl1-hero{padding:44px 18px 30px}.sl1-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:0 12px 50px}.sl1-controls{flex-wrap:wrap;padding:12px}.sl1-search{flex-basis:100%}.sl1-controls select{flex:1}.sl1-results{padding:7px 12px 12px}.sl1-card-main{border-radius:11px}.sl1-card-title{font-size:13px}.sl1-card-category{font-size:8px}.sl1-overlay{opacity:1;transform:none;inset:auto 7px 7px;padding:7px;font-size:9px}.sl1-backdrop{padding:0}.sl1-dialog{border-radius:0;max-height:100dvh;height:100dvh;display:flex;flex-direction:column}.sl1-comparison{overflow-y:auto;flex:1}.sl1-dialog-bottom{flex-direction:column;align-items:stretch;gap:12px}.sl1-figure-image{height:min(40vh,440px)}}
        @media(max-width:480px){.sl1-next{display:none}.sl1-brand{margin-left:auto}.sl1-overview{gap:11px;font-size:9px}.sl1-comparison.compare{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:9px}.sl1-comparison.compare .sl1-figure-image{height:min(43vh,300px)}.sl1-figure-image{height:min(53vh,480px)}.sl1-comparison figcaption{font-size:9px}.sl1-comparison figcaption span{font-size:9px}.sl1-dialog-head,.sl1-tabbar,.sl1-dialog-bottom{padding-left:13px;padding-right:13px}.sl1-navbottom{padding-left:13px;padding-right:13px}.sl1-footer{flex-direction:column}}
      `}</style>
    </main>
  );
}
