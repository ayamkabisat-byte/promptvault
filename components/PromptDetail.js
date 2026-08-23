"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Eye, Heart, Share2 } from "lucide-react";
import { incrementPromptMetric } from "@/lib/metrics";

export default function PromptDetail({ item }) {
  const [copied, setCopied] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [metrics, setMetrics] = useState({ view_count: Number(item.view_count || 0), copy_count: Number(item.copy_count || 0), favorite_count: Number(item.favorite_count || 0) });

  useEffect(() => {
    const viewedKey = `promptvault_viewed_${item.id}`;
    if (!sessionStorage.getItem(viewedKey)) {
      incrementPromptMetric(item.id, "view");
      sessionStorage.setItem(viewedKey, "1");
      setMetrics((m) => ({ ...m, view_count: m.view_count + 1 }));
    }
    try {
      const saved = JSON.parse(localStorage.getItem("promptvault_favorites") || "[]");
      setFavorite(saved.includes(item.id));
    } catch {}
  }, [item.id]);

  const copy = async () => {
    await navigator.clipboard.writeText(item.description || "");
    setCopied(true);
    incrementPromptMetric(item.id, "copy");
    setMetrics((m) => ({ ...m, copy_count: m.copy_count + 1 }));
    setTimeout(() => setCopied(false), 1600);
  };

  const toggleFavorite = () => {
    try {
      const saved = new Set(JSON.parse(localStorage.getItem("promptvault_favorites") || "[]"));
      const next = !saved.has(item.id);
      if (next) saved.add(item.id); else saved.delete(item.id);
      localStorage.setItem("promptvault_favorites", JSON.stringify([...saved]));
      setFavorite(next);
      incrementPromptMetric(item.id, next ? "favorite" : "unfavorite");
      setMetrics((m) => ({ ...m, favorite_count: Math.max(0, m.favorite_count + (next ? 1 : -1)) }));
    } catch {}
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: item.title, text: item.description, url: location.href });
      else await navigator.clipboard.writeText(location.href);
    } catch {}
  };

  return (
    <main className="pv2-detail-shell">
      <div className="pv2-detail-nav"><Link href="/"><ArrowLeft size={15} /> Back to gallery</Link><span>PromptVault</span></div>
      <div className="pv2-detail-grid">
        <div className="pv2-detail-visual"><img src={item.image_url} alt={item.title} /></div>
        <article className="pv2-detail-content">
          <div className="pv2-eyebrow">{item.medium || "AI Visual"} · {item.category || "General"}</div>
          <h1>{item.title}</h1>
          <div className="pv2-detail-model">{item.model || "AI model"}</div>
          <div className="pv2-detail-metrics"><span><Eye size={14} /> {metrics.view_count.toLocaleString()} views</span><span><Copy size={14} /> {metrics.copy_count.toLocaleString()} copies</span><span><Heart size={14} /> {metrics.favorite_count.toLocaleString()} saves</span></div>
          <div className="pv2-prompt-box large">{item.description}</div>
          {(item.tags || []).length > 0 && <div className="pv2-drawer-tags">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
          <div className="pv2-drawer-actions">
            <button className="pv2-primary-btn" onClick={copy}>{copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy prompt</>}</button>
            <button className={`pv2-secondary-btn ${favorite ? "active" : ""}`} onClick={toggleFavorite}><Heart size={15} fill={favorite ? "currentColor" : "none"} /> Save</button>
            <button className="pv2-secondary-btn" onClick={share}><Share2 size={15} /> Share</button>
          </div>
        </article>
      </div>
    </main>
  );
}
