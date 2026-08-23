"use client";

import { Check, Copy, Eye, Heart, Sparkles } from "lucide-react";

const compact = (value = 0) => new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
}).format(Number(value || 0));

const RATIO_LABEL = {
  tall: "9:16",
  portrait: "3:4",
  compact: "4:5",
  square: "1:1",
};

export default function PromptCard({ item, layout = "portrait", copied, favorite, onCopy, onFavorite, onOpen }) {
  return (
    <article className={`pv2-card pv2-card-${layout}`} data-layout={layout} onClick={() => onOpen(item)}>
      <div className="pv2-card-media">
        <img src={item.image_url} alt={item.title} loading="lazy" />
        <div className="pv2-card-hover-shade" />

        <div className="pv2-card-topline">
          <span className="pv2-ratio-badge">{RATIO_LABEL[layout] || "3:4"}</span>
          {item.is_featured && (
            <span className="pv2-chip pv2-chip-featured"><Sparkles size={11} /> Featured</span>
          )}
        </div>

        <div className="pv2-card-actions">
          <button
            className={`pv2-icon-btn ${favorite ? "active" : ""}`}
            onClick={(e) => { e.stopPropagation(); onFavorite(item); }}
            aria-label="Favorite"
          >
            <Heart size={15} fill={favorite ? "currentColor" : "none"} />
          </button>
          <button
            className={`pv2-icon-btn ${copied ? "success" : ""}`}
            onClick={(e) => { e.stopPropagation(); onCopy(item); }}
            aria-label="Copy prompt"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>
      </div>

      <div className="pv2-gallery-card-info">
        <div className="pv2-gallery-card-title-row">
          <h3>{item.title}</h3>
          <div className="pv2-card-metrics">
            <span><Heart size={11} /> {compact(item.favorite_count)}</span>
            <span><Eye size={11} /> {compact(item.view_count)}</span>
          </div>
        </div>
        <div className="pv2-gallery-card-subline">
          <span>{item.medium || "Fotografi"} · {item.category || "General"}</span>
          <span>{item.model || "AI Visual"}</span>
        </div>
      </div>
    </article>
  );
}
