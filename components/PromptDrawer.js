"use client";

import Link from "next/link";
import { Check, Copy, Eye, Heart, Share2, X } from "lucide-react";

export default function PromptDrawer({ item, copied, favorite, onClose, onCopy, onFavorite }) {
  if (!item) return null;

  const handleShare = async () => {
    const url = `${window.location.origin}/prompt/${item.id}`;
    try {
      if (navigator.share) await navigator.share({ title: item.title, text: item.description, url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  };

  return (
    <div className="pv2-drawer-backdrop" onClick={onClose}>
      <aside className="pv2-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="pv2-drawer-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="pv2-drawer-image-wrap">
          <img src={item.image_url} alt={item.title} className="pv2-drawer-image" />
        </div>
        <div className="pv2-drawer-body">
          <div className="pv2-drawer-kicker">{item.medium || "AI Visual"} · {item.category || "General"}</div>
          <h2>{item.title}</h2>
          <div className="pv2-drawer-model">{item.model || "AI model"}</div>
          <div className="pv2-prompt-box">{item.description}</div>
          {(item.tags || []).length > 0 && <div className="pv2-drawer-tags">{item.tags.map((t) => <span key={t}>#{t}</span>)}</div>}
          <div className="pv2-drawer-metrics">
            <span><Eye size={14} /> {Number(item.view_count || 0).toLocaleString()}</span>
            <span><Copy size={14} /> {Number(item.copy_count || 0).toLocaleString()}</span>
            <span><Heart size={14} /> {Number(item.favorite_count || 0).toLocaleString()}</span>
          </div>
          <div className="pv2-drawer-actions">
            <button className="pv2-primary-btn" onClick={() => onCopy(item)}>{copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy Prompt</>}</button>
            <button className={`pv2-secondary-btn ${favorite ? "active" : ""}`} onClick={() => onFavorite(item)}><Heart size={15} fill={favorite ? "currentColor" : "none"} /> Save</button>
            <button className="pv2-secondary-btn" onClick={handleShare}><Share2 size={15} /> Share</button>
          </div>
          <Link href={`/prompt/${item.id}`} className="pv2-full-link">Open dedicated page →</Link>
        </div>
      </aside>
    </div>
  );
}
