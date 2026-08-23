"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Camera, Copy, Dice5, Heart, LayoutGrid, Palette, Search, Sparkles, Users } from "lucide-react";
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
      let query = supabase.from("prompts").select("*").order("created_at", { ascending: false });
      const { data, error } = await query;
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
      if (sort === "az") return String(a.title).localeCompare(String(b.title));
      return Number(b.is_featured) - Number(a.is_featured) || new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    return rows;
  }, [prompts, search, medium, model, sort]);

  const updateLocalMetric = (id, field, delta) => {
    setPrompts((prev) => prev.map((p) => p.id === id ? { ...p, [field]: Math.max(0, Number(p[field] || 0) + delta) } : p));
    setSelected((prev) => prev?.id === id ? { ...prev, [field]: Math.max(0, Number(prev[field] || 0) + delta) } : prev);
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

  const uniqueTags = new Set(prompts.flatMap((p) => p.tags || [])).size;

  return (
    <main className="pv2-shell">
      <nav className="pv2-nav">
        <Link href="/" className="pv2-brand"><img src="/logo.png" alt="PromptVault" /><span>Prompt<span>Vault</span></span></Link>
        <div className="pv2-nav-center">
          <button className="active"><LayoutGrid size={14} /> Explore</button>
          <button onClick={surpriseMe}><Dice5 size={14} /> Surprise me</button>
        </div>
        <div className="pv2-nav-right">
          <span className="pv2-online"><i /> {online} online</span>
          <Link href="/admin" className="pv2-admin-link">Admin</Link>
        </div>
      </nav>

      <section className="pv2-hero">
        <div className="pv2-hero-glow pv2-glow-a" /><div className="pv2-hero-glow pv2-glow-b" />
        <div className="pv2-hero-copy">
          <div className="pv2-eyebrow"><Sparkles size={13} /> Curated AI prompt library</div>
          <h1>Find a visual. <em>Steal the prompt.</em><br />Make it yours.</h1>
          <p>Prompt visual pilihan untuk photography, graphic design, illustration, dan eksperimen AI—dikurasi agar cepat dicari, disalin, dan digunakan ulang.</p>
          <div className="pv2-hero-stats">
            <div><strong>{prompts.length.toLocaleString()}</strong><span>Prompts</span></div>
            <div><strong>{uniqueTags.toLocaleString()}</strong><span>Tags</span></div>
            <div><strong>{stats.unique_visitors.toLocaleString()}</strong><span>Visitors</span></div>
            <div><strong>{stats.total_views.toLocaleString()}</strong><span>Visits</span></div>
            <div className="live"><strong>{online}</strong><span><Users size={12} /> Online now</span></div>
          </div>
        </div>
      </section>

      <section className="pv2-controls">
        <div className="pv2-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search prompts, styles, tags, categories…" /></div>
        <div className="pv2-sort-tabs">
          {[['featured','Featured'],['newest','Newest'],['popular','Popular']].map(([value,label]) => <button key={value} className={sort === value ? "active" : ""} onClick={() => setSort(value)}>{label}</button>)}
        </div>
      </section>

      <section className="pv2-filterbar">
        <div className="pv2-medium-tabs">
          {MEDIUMS.map((name) => {
            const Icon = MEDIUM_ICONS[name];
            return <button key={name} className={medium === name ? "active" : ""} onClick={() => setMedium(name)}><Icon size={14} /> {name}</button>;
          })}
        </div>
        <select value={model} onChange={(e) => setModel(e.target.value)}>{models.map((m) => <option key={m} value={m}>{m}</option>)}</select>
      </section>

      <section className="pv2-results-head"><span>{filtered.length} results</span><span>{sort === 'popular' ? 'Ranked by engagement' : sort === 'featured' ? 'Curated selection first' : 'Recently added first'}</span></section>

      {loading ? (
        <div className="pv2-masonry pv2-skeleton-grid">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="pv2-skeleton" style={{ height: 260 + (i % 3) * 60 }} />)}</div>
      ) : filtered.length ? (
        <div className="pv2-masonry">
          {filtered.map((item) => <PromptCard key={item.id} item={item} copied={copiedId === item.id} favorite={favorites.has(item.id)} onCopy={copyPrompt} onFavorite={toggleFavorite} onOpen={openPrompt} />)}
        </div>
      ) : <div className="pv2-empty">No prompts match this filter.</div>}

      <PromptDrawer item={selected} copied={selected && copiedId === selected.id} favorite={selected && favorites.has(selected.id)} onClose={() => setSelected(null)} onCopy={copyPrompt} onFavorite={toggleFavorite} />

      <footer className="pv2-footer"><span>PromptVault v2</span><span>Built for prompt discovery · Supabase powered</span></footer>
    </main>
  );
}
