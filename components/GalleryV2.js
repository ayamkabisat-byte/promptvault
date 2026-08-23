"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Camera, Dice5, LayoutGrid, Palette, Search, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getPublicStats, incrementPromptMetric, trackSiteVisit } from "@/lib/metrics";
import { usePresence } from "@/hooks/usePresence";
import PromptCard from "./PromptCard";
import PromptDrawer from "./PromptDrawer";

const MEDIUMS = ["All", "Fotografi", "Graphic", "Ilustrasi"];
const MEDIUM_ICONS = { All: LayoutGrid, Fotografi: Camera, Graphic: Palette, Ilustrasi: Sparkles };

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

export default function GalleryV2() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [medium, setMedium] = useState("All");
  const [model, setModel] = useState("All");
  const [sort, setSort] = useState("featured");
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
      if (sort === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sort === "popular") {
        const score = (p) => p.view_count + p.copy_count * 4 + p.favorite_count * 3;
        return score(b) - score(a);
      }
      return Number(b.is_featured) - Number(a.is_featured) || new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return rows;
  }, [prompts, search, medium, model, sort]);

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

  return (
    <main className="pv2-shell pv2-gallery-first">
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
          <button onClick={surpriseMe}><Dice5 size={14} /> <span>Surprise</span></button>
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
          {[["featured", "Featured"], ["newest", "Newest"], ["popular", "Popular"]].map(([value, label]) => (
            <button
              key={value}
              className={sort === value ? "active" : ""}
              onClick={() => setSort(value)}
            >
              {label}
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
        <span>{sort === "popular" ? "Most engaged" : sort === "featured" ? "Curated first" : "Latest first"}</span>
      </section>

      {loading ? (
        <div className="pv2-masonry pv2-skeleton-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="pv2-skeleton" style={{ height: 320 + (i % 3) * 90 }} />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="pv2-masonry">
          {filtered.map((item) => (
            <PromptCard
              key={item.id}
              item={item}
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
        .pv2-gallery-strip{max-width:1920px;margin:0 auto;padding:11px clamp(12px,2vw,30px) 9px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:18px;border-bottom:1px solid rgba(255,255,255,.055);}
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

        .pv2-gallery-controls,.pv2-gallery-first .pv2-filterbar,.pv2-gallery-first .pv2-results-head,.pv2-gallery-first .pv2-masonry,.pv2-gallery-first .pv2-empty{max-width:1920px;margin-left:auto;margin-right:auto;padding-left:clamp(12px,2vw,30px);padding-right:clamp(12px,2vw,30px);}
        .pv2-gallery-controls{display:flex;align-items:center;gap:10px;padding-top:10px;margin-bottom:8px;}
        .pv2-gallery-first .pv2-search input{height:43px;border-radius:12px;background:#0c0d11;}
        .pv2-gallery-first .pv2-sort-tabs{border-radius:12px;background:#0c0d11;}
        .pv2-gallery-first .pv2-sort-tabs button{padding:8px 12px;}
        .pv2-filterbar-tight{margin-bottom:8px!important;}
        .pv2-gallery-first .pv2-medium-tabs button{padding:7px 11px;}
        .pv2-gallery-first .pv2-filterbar select{min-width:155px;padding:8px 11px;background:#0c0d11;}
        .pv2-results-head-tight{margin-bottom:9px!important;opacity:.78;}

        .pv2-gallery-first .pv2-masonry{column-count:4;column-gap:18px;padding-bottom:54px;}
        .pv2-gallery-first .pv2-card{margin-bottom:18px;border-radius:16px;border-color:rgba(255,255,255,.07);background:#0d0e12;box-shadow:none;}
        .pv2-gallery-first .pv2-card:hover{transform:translateY(-3px);border-color:rgba(255,157,46,.2);box-shadow:0 20px 60px rgba(0,0,0,.38);}
        .pv2-gallery-first .pv2-card-media{min-height:240px;}
        .pv2-gallery-first .pv2-card-media>img{min-height:240px;}
        .pv2-gallery-first .pv2-card-shade{background:linear-gradient(to bottom,rgba(0,0,0,.04) 35%,rgba(0,0,0,.08) 52%,rgba(3,3,5,.93) 100%);}
        .pv2-gallery-first .pv2-card-caption{left:16px;right:16px;bottom:14px;}
        .pv2-gallery-first .pv2-card-caption h3{font-size:18px;line-height:1.16;margin-bottom:5px;text-shadow:0 2px 18px rgba(0,0,0,.7);}
        .pv2-gallery-first .pv2-card-caption p{font-size:10px;-webkit-line-clamp:2;opacity:0;transform:translateY(5px);transition:opacity .22s ease,transform .22s ease;}
        .pv2-gallery-first .pv2-card:hover .pv2-card-caption p{opacity:.9;transform:none;}
        .pv2-gallery-first .pv2-card-actions{top:45px;}
        .pv2-gallery-first .pv2-card-meta{padding:9px 12px;background:#0b0c10;}
        .pv2-gallery-first .pv2-card-tags span,.pv2-gallery-first .pv2-card-metrics span{font-size:9px;}
        .pv2-gallery-first .pv2-skeleton{margin-bottom:18px;border-radius:16px;}
        .pv2-gallery-first .pv2-footer{display:none;}

        @media (min-width:2200px){.pv2-gallery-first .pv2-masonry{column-count:5;max-width:2200px;}.pv2-gallery-controls,.pv2-gallery-strip,.pv2-gallery-first .pv2-filterbar,.pv2-gallery-first .pv2-results-head{max-width:2200px;}}
        @media (max-width:1280px){.pv2-gallery-first .pv2-masonry{column-count:3;}.pv2-gallery-stats span:nth-child(3){display:none;}}
        @media (max-width:860px){.pv2-gallery-first .pv2-masonry{column-count:2;column-gap:12px;}.pv2-gallery-first .pv2-card{margin-bottom:12px;}.pv2-gallery-stats{justify-content:flex-end;gap:10px;}.pv2-gallery-stats span:nth-child(2),.pv2-gallery-stats span:nth-child(3){display:none;}.pv2-gallery-controls{align-items:stretch;flex-direction:column;}.pv2-gallery-controls .pv2-sort-tabs{align-self:flex-start;}.pv2-gallery-first .pv2-filterbar{align-items:flex-start;}.pv2-gallery-first .pv2-card-caption p{display:none;}}
        @media (max-width:560px){.pv2-gallery-strip{grid-template-columns:1fr auto;gap:10px;}.pv2-gallery-stats{display:none;}.pv2-gallery-actions button span{display:none;}.pv2-gallery-actions button{width:32px;padding:0;justify-content:center;}.pv2-gallery-first .pv2-masonry{column-count:1;padding-left:10px;padding-right:10px;}.pv2-gallery-first .pv2-card-media{min-height:260px;}.pv2-gallery-first .pv2-card-media>img{min-height:260px;}.pv2-gallery-first .pv2-filterbar{flex-direction:column;}.pv2-gallery-first .pv2-filterbar select{width:100%;}.pv2-results-head-tight span:last-child{display:none;}}
      `}</style>
    </main>
  );
}
