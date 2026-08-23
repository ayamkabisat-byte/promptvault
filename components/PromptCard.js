"use client";

import { Check, Copy, Eye, Heart, Sparkles } from "lucide-react";

const compact = (value = 0) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0));

export default function PromptCard({ item, copied, favorite, onCopy, onFavorite, onOpen }) {
  return (
    <article className="pv2-card" onClick={() => onOpen(item)}>
      <div className="pv2-card-media">
        <img src={item.image_url} alt={item.title} loading="lazy" />
        <div className="pv2-card-shade" />
        <div className="pv2-card-topline">
          <span className="pv2-chip">{item.model || "AI Visual"}</span>
          {item.is_featured && <span className="pv2-chip pv2-chip-featured"><Sparkles size={11} /> Featured</span>}
        </div>
        <div className="pv2-card-actions">
          <button className={`pv2-icon-btn ${favorite ? "active" : ""}`} onClick={(e) => { e.stopPropagation(); onFavorite(item); }} aria-label="Favorite">
            <Heart size={15} fill={favorite ? "currentColor" : "none"} />
          </button>
          <button className={`pv2-icon-btn ${copied ? "success" : ""}`} onClick={(e) => { e.stopPropagation(); onCopy(item); }} aria-label="Copy prompt">
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>
        <div className="pv2-card-caption">
          <div className="pv2-card-category">{item.medium || "Fotografi"} · {item.category || "General"}</div>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
      </div>
      <div className="pv2-card-meta">
        <div className="pv2-card-tags">
          {(item.tags || []).slice(0, 2).map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
        <div className="pv2-card-metrics">
          <span><Eye size={12} /> {compact(item.view_count)}</span>
          <span><Copy size={12} /> {compact(item.copy_count)}</span>
          <span><Heart size={12} /> {compact(item.favorite_count)}</span>
        </div>
      </div>
    </article>
  );
}
