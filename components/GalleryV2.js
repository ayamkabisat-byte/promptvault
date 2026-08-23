"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Camera, Dice5, LayoutGrid, Palette, Search, Shuffle, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getPublicStats, incrementPromptMetric, trackSiteVisit } from "@/lib/metrics";
import { usePresence } from "@/hooks/usePresence";
import PromptCard from "./PromptCard";
import PromptDrawer from "./PromptDrawer";

const MEDIUMS = ["All", "Fotografi", "Graphic", "Ilustrasi"];
const MEDIUM_ICONS = { All: LayoutGrid, Fotografi: Camera, Graphic: Palette, Ilustrasi: Sparkles };
const LAYOUTS = ["portrait", "compact", "tall", "portrait", "square", "portrait", "compact", "tall"];

const safePrompts = (rows = []) => rows.map((row) => ({
  ...row,
  view_count: Number(row.view_count || 0),
  copy_count: Number(row.copy_count || 0),
  favorite_count: Number(row.favorite_count || 0),
  status: row.status || "published",
  is_featured: Boolean(row.is_featured),
}));

const compact = (value = 0) => new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
}).format(Number(value || 0));

const hashString = (input = "") => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const randomKey = (item, seed) => hashString(`${seed}:${item.id}:${item.title || ""}`);
const layoutFor = (item, index, seed) => {
  if (item.is_featured && index < 10) return index % 2 === 0 ? "tall" : "portrait";
  const value = hashString(`${seed}:layout:${item.id}:${index}`);
  return LAYOUTS[value % LAYOUTS.length];
};

export default function GalleryV2() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [medium, setMedium] = useState("All");
  const [model, setModel] = useState("All");
  const [sort, setSort] = useState("random");
  const [shuffleSeed, setShuffleSeed] = useState(() => Math.floor(Math.random() * 2147483647));
  const [selected, setSelected] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [favorites, setFavorites] = useState(() => new Set());
  const [stats, setStats] = useState({ total_views: 0, unique_visitors: 0 });
  const { online, visitorId } = usePresence();

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPrompts(safePrompts(data || []).filter((item) => item.status !== "draft"));
    } catch (error) {
      console.error("PromptVault fetch error", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  useEffect(() => {
    if (!visitorId || visitorId === "server") return;
    const key = "promptvault_session_tracked";
    const alreadyTracked = sessionStorage.getItem(key);
    const run = async () => {
      if (!alreadyTracked) {
        await trackSiteVisit(visitorId);
        sessionStorage.setItem(key, "1");
      }
      setStats(await getPublicStats());
    };
    run();
  }, [visitorId]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("promptvault_favorites") || "[]");
      setFavorites(new Set(saved));
    } catch {}
  }, []);

  const models = useMemo(() => ["All", ...new Set(prompts.map((p) => p.model).filter(Boolean))], [prompts]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let rows = prompts.filter((item) => {
      const matchesMedium = medium === "All" || item.medium === medium || (!item.medium && medium === "Fotografi");
      const matchesModel = model === "All" || item.model === model;
      const hay = `${item.title || ""} ${item.description || ""} ${(item.tags || []).join(" ")} ${item.category || ""}`.toLowerCase();
      return matchesMedium && matchesModel && (!needle || hay.includes(needle));
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "random") return randomKey(a, shuffleSeed) - randomKey(b, shuffleSeed);
      if (sort === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sort === "popular") {
        const score = (p) => p.view_count + p.copy_count * 4 + p.favorite_count * 3;
        return score(b) - score(a);
      }
      return Number(b.is_featured) - Number(a.is_featured) || new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return rows;
  }, [prompts, search, medium, model, sort, shuffleSeed]);

  const updateLocalMetric = (id, field, delta) => {
    setPrompts((prev) => prev.map((p) => p.id === id
      ? { ...p, [field]: Math.max(0, Number(p[field] || 0) + delta) }
      : p));
    setSelected((prev) => prev?.id === id
      ? { ...prev, [field]: Math.max(0, Number(prev[field] || 0) + delta) }
      : prev);
  };

  const openPrompt = async (item) => {
    setSelected(item);
    updateLocalMetric(item.id, "view_count", 1);
    await incrementPromptMetric(item.id, "view");
  };

  const copyPrompt = async (item) => {
    await navigator.clipboard.writeText(item.description || "");
    setCopiedId(item.id);
    updateLocalMetric(item.id, "copy_count", 1);
    incrementPromptMetric(item.id, "copy");
    setTimeout(() => setCopiedId(null), 1600);
  };

  const toggleFavorite = (item) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      const isFav = next.has(item.id);
      if (isFav) next.delete(item.id); else next.add(item.id);
      localStorage.setItem("promptvault_favorites", JSON.stringify([...next]));
      updateLocalMetric(item.id, "favorite_count", isFav ? -1 : 1);
      incrementPromptMetric(item.id, isFav ? "unfavorite" : "favorite");
      return next;
    });
  };

  const surpriseMe = () => {
    if (!filtered.length) return;
    openPrompt(filtered[Math.floor(Math.random() * filtered.length)]);
  };

  const reshuffle = () => {
    setSort("random");
    setShuffleSeed(Math.floor(Math.random() * 2147483647));
  };

  const selectSort = (value) => {
    if (value === "random") {
      reshuffle();
      return;
    }
    setSort(value);
  };

  const sortLabel = sort === "random"
    ? "Fresh shuffled mix"
    : sort === "popular"
      ? "Most engaged"
      : sort === "featured"
        ? "Curated first"
        : "Latest first";

  return (
    <main className="pv2-shell pv2-gallery-first pv2-dynamic-gallery">
      <section className="pv2-gallery-strip">
        <Link href="/" className="pv2-gallery-brand" aria-label="PromptVault home">
          <img src="/logo.png" alt="" />
          <strong>Prompt<span>Vault</span></strong>
        </Link>

        <div className="pv2-gallery-stats" aria-label="PromptVault statistics">
          <span><b>{prompts.length.toLocaleString()}</b> prompts</span>
          <span><b>{compact(stats.unique_visitors)}</b> visitors</span>
          <span><b>{compact(stats.total_views)}</b> visits</span>
          <span className="online"><i /> <b>{online}</b> online</span>
        </div>

        <div className="pv2-gallery-actions">
          <button onClick={reshuffle} title="Shuffle gallery"><Shuffle size={14} /> <span>Shuffle</span></button>
          <button onClick={surpriseMe} title="Open a random prompt"><Dice5 size={14} /> <span>Surprise</span></button>
          <Link href="/admin">Admin</Link>
        </div>
      </section>

      <section className="pv2-gallery-controls">
        <div className="pv2-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts, styles, tags…"
          />
        </div>

        <div className="pv2-sort-tabs">
          {[["random", "Random"], ["featured", "Featured"], ["newest", "Newest"], ["popular", "Popular"]].map(([value, label]) => (
            <button
              key={value}
              className={sort === value ? "active" : ""}
              onClick={() => selectSort(value)}
            >
              {value === "random" && <Shuffle size={12} />} {label}
            </button>
          ))}
        </div>
      </section>

      <section className="pv2-filterbar pv2-filterbar-tight">
        <div className="pv2-medium-tabs">
          {MEDIUMS.map((name) => {
            const Icon = MEDIUM_ICONS[name];
            return (
              <button
                key={name}
                className={medium === name ? "active" : ""}
                onClick={() => setMedium(name)}
              >
                <Icon size={14} /> {name}
              </button>
            );
          })}
        </div>

        <select value={model} onChange={(e) => setModel(e.target.value)} aria-label="Filter by AI model">
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </section>

      <section className="pv2-results-head pv2-results-head-tight">
        <span>{filtered.length} results</span>
        <span>{sortLabel}</span>
      </section>

      {loading ? (
        <div className="pv2-masonry pv2-skeleton-grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="pv2-skeleton" style={{ height: [320, 430, 270, 380][i % 4] }} />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="pv2-masonry">
          {filtered.map((item, index) => (
            <PromptCard
              key={item.id}
              item={item}
              layout={layoutFor(item, index, shuffleSeed)}
              copied={copiedId === item.id}
              favorite={favorites.has(item.id)}
              onCopy={copyPrompt}
              onFavorite={toggleFavorite}
              onOpen={openPrompt}
            />
          ))}
        </div>
      ) : (
        <div className="pv2-empty">No prompts match this filter.</div>
      )}

      <PromptDrawer
        item={selected}
        copied={selected && copiedId === selected.id}
        favorite={selected && favorites.has(selected.id)}
        onClose={() => setSelected(null)}
        onCopy={copyPrompt}
        onFavorite={toggleFavorite}
      />

      <style>{`
        .pv2-gallery-first{overflow:visible;background:#070709;}
        .pv2-gallery-strip{max-width:2100px;margin:0 auto;padding:10px clamp(12px,1.8vw,30px) 9px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:18px;border-bottom:1px solid rgba(255,255,255,.055);}
        .pv2-gallery-brand{display:inline-flex;align-items:center;gap:8px;min-width:max-content;}
        .pv2-gallery-brand img{width:28px;height:28px;border-radius:9px;object-fit:cover;border:1px solid rgba(255,255,255,.12);}
        .pv2-gallery-brand strong{font-size:14px;letter-spacing:-.025em;}
        .pv2-gallery-brand strong span{color:var(--accent);}
        .pv2-gallery-stats{display:flex;align-items:center;justify-content:center;gap:18px;color:var(--dim);font-size:10px;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;overflow:hidden;}
        .pv2-gallery-stats b{color:#c8c7cc;font-size:11px;letter-spacing:-.01em;}
        .pv2-gallery-stats .online{display:inline-flex;align-items:center;gap:6px;color:#8fae98;}
        .pv2-gallery-stats .online i{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px rgba(82,214,138,.08);}
        .pv2-gallery-actions{display:flex;align-items:center;gap:7px;}
        .pv2-gallery-actions button,.pv2-gallery-actions a{height:30px;border-radius:9px;border:1px solid var(--border);background:rgba(255,255,255,.025);padding:0 10px;display:inline-flex;align-items:center;gap:6px;color:var(--muted);font-size:10px;font-weight:700;cursor:pointer;}
        .pv2-gallery-actions button:hover,.pv2-gallery-actions a:hover{color:var(--text);border-color:var(--border-strong);background:var(--surface2);}

        .pv2-gallery-controls,.pv2-gallery-first .pv2-filterbar,.pv2-gallery-first .pv2-results-head,.pv2-gallery-first .pv2-masonry,.pv2-gallery-first .pv2-empty{max-width:2100px;margin-left:auto;margin-right:auto;padding-left:clamp(12px,1.8vw,30px);padding-right:clamp(12px,1.8vw,30px);}
        .pv2-gallery-controls{display:flex;align-items:center;gap:10px;padding-top:10px;margin-bottom:8px;}
        .pv2-gallery-first .pv2-search input{height:43px;border-radius:12px;background:#0c0d11;}
        .pv2-gallery-first .pv2-sort-tabs{border-radius:12px;background:#0c0d11;}
        .pv2-gallery-first .pv2-sort-tabs button{padding:8px 11px;display:inline-flex;align-items:center;gap:5px;}
        .pv2-filterbar-tight{margin-bottom:8px!important;}
        .pv2-gallery-first .pv2-medium-tabs button{padding:7px 11px;}
        .pv2-gallery-first .pv2-filterbar select{min-width:155px;padding:8px 11px;background:#0c0d11;}
        .pv2-results-head-tight{margin-bottom:10px!important;opacity:.78;}

        .pv2-dynamic-gallery .pv2-masonry{column-count:4;column-gap:16px;padding-bottom:54px;}
        .pv2-dynamic-gallery .pv2-card{break-inside:avoid;margin:0 0 18px;border:0;border-radius:0;background:transparent;box-shadow:none;overflow:visible;transform:none;display:inline-block;width:100%;}
        .pv2-dynamic-gallery .pv2-card:hover{transform:none;border:0;box-shadow:none;}
        .pv2-dynamic-gallery .pv2-card-media{position:relative;width:100%;min-height:0;border-radius:14px;overflow:hidden;background:#0d0e12;border:1px solid rgba(255,255,255,.065);transition:transform .28s cubic-bezier(.16,1,.3,1),border-color .2s,box-shadow .2s;}
        .pv2-dynamic-gallery .pv2-card:hover .pv2-card-media{transform:translateY(-2px);border-color:rgba(255,157,46,.2);box-shadow:0 20px 50px rgba(0,0,0,.34);}
        .pv2-dynamic-gallery .pv2-card-portrait .pv2-card-media{aspect-ratio:3/4;}
        .pv2-dynamic-gallery .pv2-card-tall .pv2-card-media{aspect-ratio:9/16;}
        .pv2-dynamic-gallery .pv2-card-compact .pv2-card-media{aspect-ratio:4/5;}
        .pv2-dynamic-gallery .pv2-card-square .pv2-card-media{aspect-ratio:1/1;}
        .pv2-dynamic-gallery .pv2-card-media>img{width:100%;height:100%;min-height:0;display:block;object-fit:cover;transition:transform .5s cubic-bezier(.16,1,.3,1),filter .25s;}
        .pv2-dynamic-gallery .pv2-card:hover .pv2-card-media>img{transform:scale(1.025);}
        .pv2-card-hover-shade{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.08),transparent 35%,rgba(0,0,0,.16));opacity:.35;transition:.2s;pointer-events:none;}
        .pv2-card:hover .pv2-card-hover-shade{opacity:.8;}
        .pv2-dynamic-gallery .pv2-card-topline{top:9px;left:9px;right:9px;display:flex;align-items:flex-start;gap:6px;}
        .pv2-ratio-badge{font-size:9px;font-weight:800;letter-spacing:.02em;padding:5px 7px;border-radius:7px;background:rgba(7,7,9,.7);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(10px);color:#e7e6e9;}
        .pv2-dynamic-gallery .pv2-chip-featured{margin-left:auto;}
        .pv2-dynamic-gallery .pv2-card-actions{right:9px;top:42px;opacity:0;transform:translateX(5px);}
        .pv2-dynamic-gallery .pv2-card:hover .pv2-card-actions{opacity:1;transform:none;}
        .pv2-dynamic-gallery .pv2-icon-btn{width:33px;height:33px;border-radius:10px;}

        .pv2-gallery-card-info{padding:9px 2px 0;}
        .pv2-gallery-card-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
        .pv2-gallery-card-title-row h3{font-size:13px;line-height:1.28;margin:0;font-weight:700;letter-spacing:-.015em;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .pv2-gallery-card-title-row .pv2-card-metrics{display:flex;gap:7px;align-items:center;flex-shrink:0;color:#6f717a;}
        .pv2-gallery-card-title-row .pv2-card-metrics span{font-size:9px;display:flex;align-items:center;gap:3px;}
        .pv2-gallery-card-subline{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;color:#686a73;font-size:9px;line-height:1.3;}
        .pv2-gallery-card-subline span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .pv2-gallery-card-subline span:last-child{text-align:right;color:#858791;max-width:45%;}
        .pv2-gallery-first .pv2-skeleton{margin-bottom:18px;border-radius:14px;}
        .pv2-gallery-first .pv2-footer{display:none;}

        @media (min-width:1780px){.pv2-dynamic-gallery .pv2-masonry{column-count:5;}}
        @media (max-width:1320px){.pv2-dynamic-gallery .pv2-masonry{column-count:3;}.pv2-gallery-stats{gap:12px;}}
        @media (max-width:920px){
          .pv2-gallery-strip{grid-template-columns:auto 1fr auto;gap:10px;}
          .pv2-gallery-stats span:not(.online){display:none;}
          .pv2-gallery-stats{justify-content:flex-end;}
          .pv2-gallery-controls{align-items:stretch;}
          .pv2-dynamic-gallery .pv2-masonry{column-count:2;column-gap:12px;}
          .pv2-dynamic-gallery .pv2-card{margin-bottom:15px;}
          .pv2-gallery-actions button span{display:none;}
        }
        @media (max-width:680px){
          .pv2-gallery-controls{display:block;padding-top:8px;}
          .pv2-gallery-first .pv2-sort-tabs{margin-top:8px;width:100%;overflow:auto;display:flex;}
          .pv2-gallery-first .pv2-sort-tabs button{flex:1;justify-content:center;white-space:nowrap;}
          .pv2-gallery-first .pv2-filterbar{align-items:flex-start;}
          .pv2-gallery-first .pv2-filterbar select{min-width:118px;max-width:130px;}
          .pv2-gallery-brand strong{display:none;}
          .pv2-gallery-actions a{padding:0 8px;}
        }
        @media (max-width:480px){
          .pv2-gallery-strip{padding-left:10px;padding-right:10px;}
          .pv2-gallery-stats{display:none;}
          .pv2-gallery-actions{margin-left:auto;}
          .pv2-dynamic-gallery .pv2-masonry{column-count:2;column-gap:9px;padding-left:9px;padding-right:9px;}
          .pv2-dynamic-gallery .pv2-card{margin-bottom:12px;}
          .pv2-gallery-card-info{padding-top:6px;}
          .pv2-gallery-card-title-row h3{font-size:11px;}
          .pv2-gallery-card-title-row .pv2-card-metrics span:nth-child(1){display:none;}
          .pv2-gallery-card-subline{font-size:8px;}
          .pv2-gallery-card-subline span:last-child{display:none;}
          .pv2-ratio-badge{font-size:8px;padding:4px 6px;}
          .pv2-dynamic-gallery .pv2-card-actions{opacity:1;transform:none;top:36px;}
          .pv2-dynamic-gallery .pv2-icon-btn{width:29px;height:29px;}
        }
      `}</style>
    </main>
  );
}
