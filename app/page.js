"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Search, Copy, Check, LayoutGrid, LogIn, Settings,
  Lock, Plus, Upload, Trash2, Edit2, X, KeyRound, Image as ImageIcon,
  Camera, Palette, Brush,
} from "lucide-react";

/* ─────────────────────────────────────────────
   SUPABASE
───────────────────────────────────────────── */
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  || "";
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase     = createClient(supabaseUrl, supabaseKey);

/* ─────────────────────────────────────────────
   CONSTANTS — Mediums & Categories
───────────────────────────────────────────── */
const MEDIUMS = ["Fotografi", "Graphic", "Ilustrasi"];

const MEDIUM_ICONS = {
  Fotografi: Camera,
  Graphic: Palette,
  Ilustrasi: Brush,
};

// Default categories per medium. Tambahan dari user akan di-merge otomatis.
const DEFAULT_CATEGORIES_BY_MEDIUM = {
  Fotografi: ["Couple", "Man", "Woman", "Vacation", "Photoshoot", "Selfie"],
  Graphic:   ["Poster", "Logo", "Branding", "Typography", "Packaging"],
  Ilustrasi: ["Character", "Scene", "Concept Art", "Anime", "Editorial"],
};

const AUTO_TAG_KEYWORDS = [
  "neon","cyberpunk","studio","beach","sunset","minimalist","fashion","dark",
  "bright","vintage","car","night","sunlight","cinematic","portrait","realistic",
  "anime","3d","bokeh","dramatic","moody","golden hour","urban","forest",
  "underwater","futuristic","retro","colorful","monochrome",
];

const ADD_NEW_CAT_VALUE = "__ADD_NEW_CATEGORY__";

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const STYLES = `
  /* NAV */
  .pv-nav{position:sticky;top:0;z-index:90;background:rgba(8,8,8,.88);
    backdrop-filter:blur(24px) saturate(180%);border-bottom:1px solid var(--border);
    height:64px;display:flex;align-items:center;padding:0 32px;gap:0}
  .pv-nav-logo{display:flex;align-items:center;gap:10px;cursor:pointer;flex:1}
  .pv-nav-logo-icon{width:36px;height:36px;border-radius:10px;overflow:hidden;
    box-shadow:0 0 0 1px var(--accent-border)}
  .pv-nav-logo-icon img{width:100%;height:100%;object-fit:cover;display:block}
  .pv-nav-logo-name{font-family:'DM Serif Display',serif;font-size:19px;
    letter-spacing:-.3px;color:var(--text)}
  .pv-nav-logo-name span{color:var(--accent)}
  .pv-nav-links{display:flex;gap:4px}
  .pv-nav-link{display:flex;align-items:center;gap:6px;padding:7px 15px;
    border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;
    color:var(--text-muted);border:1px solid transparent;transition:all .18s;
    background:none;font-family:'DM Sans',sans-serif}
  .pv-nav-link:hover{color:var(--text);background:rgba(255,255,255,.04)}
  .pv-nav-link.active{color:var(--accent);border-color:var(--accent-border);
    background:var(--accent-dim)}

  /* PAGE WRAP */
  .pv-page{max-width:1440px;margin:0 auto;padding:0 32px}

  /* HERO */
  .pv-hero{padding:64px 0 36px}
  .pv-hero-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:11px;
    font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--accent);
    margin-bottom:18px;padding:5px 13px;border-radius:100px;
    border:1px solid var(--accent-border);background:var(--accent-dim)}
  .pv-hero-title{font-family:'DM Serif Display',serif;
    font-size:clamp(36px,5vw,60px);line-height:1.04;letter-spacing:-1.5px;
    margin-bottom:14px;color:var(--text)}
  .pv-hero-title em{color:var(--accent);font-style:italic}
  .pv-hero-sub{font-size:16px;color:var(--text-muted);line-height:1.65;max-width:500px}
  .pv-hero-sub small{color:var(--text-dim);font-size:13px;display:block;margin-top:4px}
  .pv-hero-stats{display:flex;gap:32px;margin-top:28px}
  .pv-stat-num{font-family:'DM Serif Display',serif;font-size:32px;
    color:var(--text);letter-spacing:-1px}
  .pv-stat-label{font-size:11px;color:var(--text-dim);font-weight:700;
    letter-spacing:.1em;text-transform:uppercase}

  /* MEDIUM TABS — top-level navigation */
  .pv-mediums{display:flex;gap:2px;margin-bottom:24px;border-bottom:1px solid var(--border);
    overflow-x:auto;scrollbar-width:none}
  .pv-mediums::-webkit-scrollbar{display:none}
  .pv-medium{display:inline-flex;align-items:center;gap:9px;padding:14px 20px;
    font-size:14px;font-weight:600;cursor:pointer;color:var(--text-muted);
    border:none;background:none;border-bottom:2px solid transparent;
    transition:color .18s,border-color .18s;font-family:'DM Sans',sans-serif;
    margin-bottom:-1px;white-space:nowrap}
  .pv-medium:hover{color:var(--text)}
  .pv-medium.active{color:var(--accent);border-bottom-color:var(--accent)}
  .pv-medium-count{font-size:10px;font-weight:700;color:var(--text-dim);
    padding:2px 8px;border-radius:100px;background:var(--surface2);
    letter-spacing:.04em}
  .pv-medium.active .pv-medium-count{color:var(--accent);background:var(--accent-dim)}

  /* TOOLBAR */
  .pv-toolbar{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
  .pv-search-wrap{flex:1;min-width:220px;position:relative}
  .pv-search-wrap svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);
    color:var(--text-muted);pointer-events:none}
  .pv-search-input{width:100%;background:var(--surface);border:1px solid var(--border);
    border-radius:10px;padding:12px 16px 12px 44px;font-size:14px;color:var(--text);
    outline:none;font-family:'DM Sans',sans-serif;transition:border-color .2s,background .2s}
  .pv-search-input:focus{border-color:var(--accent-border);background:var(--accent-dim)}
  .pv-search-input::placeholder{color:var(--text-dim)}
  .pv-filter-select{background:var(--surface);border:1px solid var(--border);
    border-radius:10px;padding:12px 36px 12px 16px;font-size:14px;color:var(--text);
    outline:none;cursor:pointer;font-family:'DM Sans',sans-serif;appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4l4 4 4-4' stroke='rgba(232,232,224,0.35)' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 12px center;
    transition:border-color .2s}
  .pv-filter-select:focus{border-color:var(--accent-border)}
  .pv-filter-select option{background:#111}

  /* CATEGORY PILLS */
  .pv-cats{display:flex;gap:8px;margin-bottom:28px;flex-wrap:wrap}
  .pv-cat{padding:6px 15px;border-radius:100px;font-size:12px;font-weight:500;
    cursor:pointer;border:1px solid var(--border);color:var(--text-muted);
    transition:all .18s;background:none;font-family:'DM Sans',sans-serif;
    white-space:nowrap}
  .pv-cat:hover{border-color:var(--accent-border);color:var(--text)}
  .pv-cat.active{background:var(--accent);color:#080808;
    border-color:var(--accent);font-weight:700}

  /* COUNT */
  .pv-count{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
    color:var(--text-dim);margin-bottom:20px}

  /* GRID */
  .pv-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-bottom:80px}
  @media(max-width:1200px){.pv-grid{grid-template-columns:repeat(4,1fr)}}
  @media(max-width:900px){.pv-grid{grid-template-columns:repeat(3,1fr);gap:12px}}
  @media(max-width:600px){.pv-grid{grid-template-columns:repeat(2,1fr);gap:10px}}

  /* CARD */
  .pv-card{border-radius:var(--radius-card);overflow:hidden;background:var(--surface);
    border:1px solid var(--border);transition:transform .35s cubic-bezier(.16,1,.3,1),
    border-color .25s,box-shadow .25s;cursor:pointer}
  .pv-card:hover{transform:translateY(-5px);border-color:var(--accent-border);
    box-shadow:0 24px 60px rgba(0,0,0,.65),0 0 0 1px rgba(230,140,30,.18)}
  .pv-card:hover .pv-card-img-inner{transform:scale(1.07)}
  .pv-card:hover .pv-card-overlay{opacity:1}

  .pv-card-img{width:100%;aspect-ratio:3/4;overflow:hidden;position:relative;
    background:#0d0d0d}
  .pv-card-img-inner{width:100%;height:100%;object-fit:cover;display:block;
    transition:transform .65s cubic-bezier(.16,1,.3,1)}
  .pv-card-badge{position:absolute;top:10px;left:10px;font-size:9px;font-weight:700;
    letter-spacing:.1em;text-transform:uppercase;background:rgba(8,8,8,.72);
    backdrop-filter:blur(10px);color:var(--accent);padding:4px 9px;border-radius:7px;
    border:1px solid var(--accent-border)}
  .pv-card-overlay{position:absolute;inset:0;
    background:linear-gradient(to top,rgba(8,8,8,.95) 0%,rgba(8,8,8,.08) 55%,transparent 100%);
    opacity:0;transition:opacity .28s;display:flex;flex-direction:column;
    justify-content:flex-end;padding:14px;gap:8px}
  .pv-card-overlay-tags{display:flex;gap:4px;flex-wrap:wrap}
  .pv-card-overlay-tag{font-size:8px;font-weight:700;color:rgba(230,140,30,.8);
    background:rgba(230,140,30,.1);padding:2px 7px;border-radius:4px;letter-spacing:.06em}
  .pv-card-overlay-prompt{font-size:10px;color:rgba(232,232,224,.7);line-height:1.5;
    font-style:italic;display:-webkit-box;-webkit-line-clamp:3;
    -webkit-box-orient:vertical;overflow:hidden}

  .pv-card-body{padding:13px 14px;display:flex;flex-direction:column;gap:10px}
  .pv-card-title{font-size:13px;font-weight:500;line-height:1.35;color:var(--text)}
  .pv-card-model{font-size:10px;color:var(--text-dim);font-weight:500}
  .pv-copy-btn{display:flex;align-items:center;justify-content:center;gap:6px;
    background:var(--accent-dim);border:1px solid var(--accent-border);border-radius:9px;
    padding:9px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
    color:var(--accent);cursor:pointer;transition:all .2s;
    font-family:'DM Sans',sans-serif;width:100%}
  .pv-copy-btn:hover{background:var(--accent);color:#080808;border-color:var(--accent)}
  .pv-copy-btn.copied{background:rgba(34,197,94,.12);color:#4ade80;
    border-color:rgba(34,197,94,.3)}

  /* EMPTY */
  .pv-empty{grid-column:1/-1;padding:80px 20px;text-align:center;
    border:1px dashed var(--border);border-radius:24px;background:var(--surface)}
  .pv-empty p{font-size:16px;color:var(--text-muted);
    font-family:'DM Serif Display',serif;font-style:italic}

  /* LOADING */
  .pv-loading{display:flex;flex-direction:column;align-items:center;
    justify-content:center;min-height:40vh;gap:16px}
  .pv-spinner{width:40px;height:40px;border:3px solid var(--border);
    border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}

  /* MODAL */
  .pv-modal-backdrop{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.85);
    backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;
    padding:20px;animation:fadeIn .18s ease}
  .pv-modal{background:var(--surface);border:1px solid var(--border);border-radius:24px;
    max-width:560px;width:100%;overflow:hidden;
    box-shadow:0 40px 120px rgba(0,0,0,.7);
    animation:slideUp .25s cubic-bezier(.16,1,.3,1);
    max-height:90vh;display:flex;flex-direction:column;position:relative}
  .pv-modal-img{width:100%;aspect-ratio:16/9;object-fit:cover;flex-shrink:0}
  .pv-modal-body{padding:28px;overflow-y:auto}
  .pv-modal-cat{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
    color:var(--accent);margin-bottom:8px;display:flex;align-items:center;gap:8px}
  .pv-modal-cat-medium{color:var(--text-dim);font-weight:500}
  .pv-modal-title{font-size:22px;font-weight:700;margin-bottom:14px;
    font-family:'DM Serif Display',serif}
  .pv-modal-prompt{font-size:13px;line-height:1.7;color:var(--text-muted);
    margin-bottom:18px;background:var(--bg);border:1px solid var(--border);
    border-radius:10px;padding:16px;font-family:monospace}
  .pv-modal-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px}
  .pv-modal-tag{font-size:10px;font-weight:700;color:var(--accent);
    background:var(--accent-dim);padding:3px 10px;border-radius:6px;
    border:1px solid var(--accent-border)}
  .pv-modal-copy{width:100%;padding:14px;background:var(--accent);color:#080808;
    font-size:13px;font-weight:800;border:none;border-radius:10px;cursor:pointer;
    font-family:'DM Sans',sans-serif;letter-spacing:.08em;text-transform:uppercase;
    display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s}
  .pv-modal-copy:hover{background:#f09c30}
  .pv-modal-close{position:absolute;top:14px;right:14px;width:34px;height:34px;
    border-radius:50%;background:rgba(8,8,8,.65);backdrop-filter:blur(8px);
    border:1px solid var(--border);color:var(--text);cursor:pointer;
    display:flex;align-items:center;justify-content:center;transition:all .15s;z-index:10}
  .pv-modal-close:hover{background:rgba(255,255,255,.1)}

  /* ── ADMIN ── */
  .pv-login-wrap{min-height:calc(100vh - 64px);display:flex;align-items:center;
    justify-content:center;padding:40px 20px}
  .pv-login-card{width:100%;max-width:420px;background:var(--surface);
    border:1px solid var(--border);border-radius:28px;padding:48px 40px;
    box-shadow:0 40px 120px rgba(0,0,0,.6)}
  .pv-login-icon{width:72px;height:72px;border-radius:20px;background:var(--accent-dim);
    border:1px solid var(--accent-border);display:flex;align-items:center;
    justify-content:center;margin:0 auto 28px;color:var(--accent)}
  .pv-login-title{font-size:26px;font-weight:700;text-align:center;margin-bottom:6px}
  .pv-login-sub{font-size:13px;color:var(--text-muted);text-align:center;margin-bottom:32px}
  .pv-login-input{width:100%;background:var(--bg);border:1px solid var(--border);
    border-radius:12px;padding:16px 20px;font-size:24px;color:var(--text);
    text-align:center;letter-spacing:.4em;outline:none;font-family:monospace;
    margin-bottom:12px;transition:border-color .2s}
  .pv-login-input:focus{border-color:var(--accent-border)}
  .pv-login-input.error{border-color:#ef4444;animation:shake .4s}
  .pv-login-error{font-size:11px;color:#ef4444;text-align:center;font-weight:700;
    letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px}
  .pv-login-btn{width:100%;padding:16px;background:var(--accent);color:#080808;
    font-size:14px;font-weight:800;border:none;border-radius:12px;cursor:pointer;
    font-family:'DM Sans',sans-serif;letter-spacing:.06em;text-transform:uppercase;
    transition:all .2s;box-shadow:0 8px 32px rgba(230,140,30,.3)}
  .pv-login-btn:hover{background:#f09c30;transform:translateY(-1px)}

  /* DASHBOARD */
  .pv-dashboard{display:grid;grid-template-columns:380px 1fr;gap:28px;
    padding:36px 0 60px;min-height:calc(100vh - 64px)}
  @media(max-width:900px){.pv-dashboard{grid-template-columns:1fr}}

  .pv-form-card{background:var(--surface);border:1px solid var(--border);
    border-radius:24px;padding:32px;position:sticky;top:84px;
    max-height:calc(100vh - 100px);overflow-y:auto;scrollbar-width:thin}
  @media(max-width:900px){.pv-form-card{position:static;max-height:none}}
  .pv-form-card::-webkit-scrollbar{width:3px}
  .pv-form-card::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}

  .pv-form-header{display:flex;align-items:center;justify-content:space-between;
    margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--border)}
  .pv-form-title{font-size:20px;font-weight:700;color:var(--accent);
    display:flex;align-items:center;gap:8px}
  .pv-form-cancel{font-size:11px;font-weight:700;color:var(--text-dim);cursor:pointer;
    text-transform:uppercase;letter-spacing:.1em;transition:color .15s;
    border:none;background:none;font-family:'DM Sans',sans-serif}
  .pv-form-cancel:hover{color:#ef4444}

  .pv-field{margin-bottom:18px}
  .pv-field-label{font-size:10px;font-weight:700;letter-spacing:.18em;
    text-transform:uppercase;color:var(--text-dim);margin-bottom:7px;display:block}
  .pv-field-label span{color:var(--accent);font-weight:400;text-transform:none;
    letter-spacing:0;margin-left:6px}
  .pv-field-input,.pv-field-select,.pv-field-textarea{width:100%;background:var(--bg);
    border:1px solid var(--border);border-radius:10px;padding:12px 14px;
    font-size:13px;color:var(--text);outline:none;font-family:'DM Sans',sans-serif;
    transition:border-color .2s}
  .pv-field-input:focus,.pv-field-select:focus,.pv-field-textarea:focus{
    border-color:var(--accent-border)}
  .pv-field-textarea{resize:none;line-height:1.6}
  .pv-field-select{cursor:pointer;appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4l4 4 4-4' stroke='rgba(232,232,224,0.35)' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 12px center;
    padding-right:36px}

  /* ADD CATEGORY INLINE */
  .pv-add-cat-row{display:flex;gap:6px;align-items:stretch}
  .pv-add-cat-row input{flex:1;background:var(--bg);
    border:1px solid var(--accent-border);border-radius:10px;
    padding:12px 14px;font-size:13px;color:var(--text);outline:none;
    font-family:'DM Sans',sans-serif}
  .pv-add-cat-row input:focus{border-color:var(--accent)}
  .pv-add-cat-btn{padding:0 14px;border:none;border-radius:10px;cursor:pointer;
    font-size:11px;font-weight:700;font-family:'DM Sans',sans-serif;
    text-transform:uppercase;letter-spacing:.06em;display:flex;
    align-items:center;justify-content:center;transition:all .15s}
  .pv-add-cat-btn.confirm{background:var(--accent);color:#080808}
  .pv-add-cat-btn.confirm:hover{background:#f09c30}
  .pv-add-cat-btn.cancel{background:var(--surface2);color:var(--text-muted);
    border:1px solid var(--border)}
  .pv-add-cat-btn.cancel:hover{color:#ef4444}

  .pv-upload-zone{width:100%;aspect-ratio:4/3;border-radius:12px;
    border:2px dashed var(--border);overflow:hidden;display:flex;flex-direction:column;
    align-items:center;justify-content:center;cursor:pointer;position:relative;
    transition:border-color .2s,background .2s;background:var(--bg)}
  .pv-upload-zone:hover{border-color:var(--accent-border);background:var(--accent-dim)}
  .pv-upload-zone img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .pv-upload-overlay{position:absolute;inset:0;background:rgba(8,8,8,.55);
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
  .pv-upload-text{font-size:10px;font-weight:700;text-transform:uppercase;
    letter-spacing:.1em;color:var(--text-muted)}

  .pv-tags-wrap{min-height:60px;background:var(--bg);border:1px solid var(--border);
    border-radius:10px;padding:8px 10px;display:flex;flex-wrap:wrap;gap:6px;
    align-items:center}
  .pv-tag-chip{display:flex;align-items:center;gap:5px;background:var(--accent-dim);
    border:1px solid var(--accent-border);color:var(--accent);font-size:10px;
    font-weight:700;padding:4px 10px;border-radius:6px;letter-spacing:.05em}
  .pv-tag-x{cursor:pointer;opacity:.6;transition:opacity .15s;border:none;
    background:none;color:inherit;padding:0;line-height:1;display:flex;
    align-items:center}
  .pv-tag-x:hover{opacity:1}
  .pv-tag-input{background:none;border:none;outline:none;font-size:12px;
    color:var(--text);font-family:'DM Sans',sans-serif;flex:1;min-width:80px}
  .pv-tag-input::placeholder{color:var(--text-dim)}

  .pv-submit-btn{width:100%;padding:16px;background:var(--accent);color:#080808;
    font-size:12px;font-weight:800;border:none;border-radius:12px;cursor:pointer;
    font-family:'DM Sans',sans-serif;letter-spacing:.1em;text-transform:uppercase;
    display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s;
    box-shadow:0 6px 24px rgba(230,140,30,.25);margin-top:8px}
  .pv-submit-btn:hover{background:#f09c30;transform:translateY(-1px)}
  .pv-submit-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}

  .pv-table-card{background:var(--surface);border:1px solid var(--border);
    border-radius:24px;padding:28px;overflow:hidden}
  .pv-table-header{display:flex;align-items:center;justify-content:space-between;
    margin-bottom:24px}
  .pv-table-title{font-size:20px;font-weight:700}
  .pv-table-title span{color:var(--accent)}
  .pv-logout-btn{font-size:11px;font-weight:700;text-transform:uppercase;
    letter-spacing:.12em;color:var(--text-dim);cursor:pointer;padding:8px 16px;
    border-radius:8px;border:1px solid var(--border);background:none;
    font-family:'DM Sans',sans-serif;transition:all .2s}
  .pv-logout-btn:hover{color:#ef4444;border-color:rgba(239,68,68,.3);
    background:rgba(239,68,68,.06)}

  .pv-table-wrap{overflow-x:auto;border-radius:14px;border:1px solid var(--border)}
  .pv-table{width:100%;border-collapse:collapse}
  .pv-table thead tr{background:var(--surface2)}
  .pv-table th{padding:13px 16px;font-size:10px;font-weight:700;letter-spacing:.15em;
    text-transform:uppercase;color:var(--text-dim);text-align:left;white-space:nowrap}
  .pv-table tbody tr{border-top:1px solid var(--border);transition:background .15s}
  .pv-table tbody tr:hover{background:rgba(255,255,255,.02)}
  .pv-table td{padding:14px 16px;font-size:13px;vertical-align:middle}

  .pv-row-thumb{width:56px;height:56px;border-radius:10px;object-fit:cover;
    border:1px solid var(--border)}
  .pv-row-title{font-weight:500;color:var(--text);line-height:1.3}
  .pv-row-meta{display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap}
  .pv-row-cat{display:inline-block;font-size:9px;font-weight:700;letter-spacing:.08em;
    text-transform:uppercase;padding:3px 8px;border-radius:5px;
    background:var(--accent-dim);border:1px solid var(--accent-border);
    color:var(--accent)}
  .pv-row-medium{display:inline-block;font-size:9px;font-weight:600;
    letter-spacing:.05em;color:var(--text-dim);font-style:italic}
  .pv-action-btn{padding:8px;border-radius:8px;border:none;background:var(--surface2);
    cursor:pointer;color:var(--text-muted);transition:all .15s}
  .pv-action-btn.edit:hover{color:var(--accent);background:var(--accent-dim)}
  .pv-action-btn.del:hover{color:#ef4444;background:rgba(239,68,68,.08)}
  .pv-actions{display:flex;gap:6px;justify-content:flex-end;opacity:.5;
    transition:opacity .15s}
  .pv-table tbody tr:hover .pv-actions{opacity:1}

  /* SECURITY PANEL */
  .pv-sec-card{background:var(--surface);border:1px solid var(--border);
    border-radius:20px;padding:20px;margin-bottom:16px}
  .pv-sec-label{font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;
    color:var(--text-dim);margin-bottom:12px;display:flex;align-items:center;gap:6px}

  /* RESPONSIVE */
  @media(max-width:900px){
    .pv-page{padding:0 16px}
    .pv-nav{padding:0 16px}
    .pv-hero{padding:40px 0 28px}
    .pv-hero-title{font-size:34px}
  }
  @media(max-width:480px){
    .pv-nav-logo-name{font-size:16px}
    .pv-medium{padding:12px 14px;font-size:13px}
  }
`;

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const getMedium = (item) => item.medium || "Fotografi"; // backward-compat for legacy rows

/* ─────────────────────────────────────────────
   CARD
───────────────────────────────────────────── */
function Card({ item, copiedId, onCopy, onOpen }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";

    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.style.opacity = "";
          el.style.transform = "";
          el.classList.add("card-revealed");
          obs.disconnect();
        }
      },
      { threshold: 0.01, rootMargin: "0px 0px 50px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const isCopied = copiedId === item.id;

  return (
    <div ref={ref} className="pv-card" onClick={() => onOpen(item)}>
      <div className="pv-card-img">
        <img className="pv-card-img-inner" src={item.image_url} alt={item.title} loading="lazy" />
        <div className="pv-card-badge">{item.category}</div>
        <div className="pv-card-overlay">
          <div className="pv-card-overlay-tags">
            {(item.tags || []).slice(0, 3).map(t => <span key={t} className="pv-card-overlay-tag">#{t}</span>)}
          </div>
          <p className="pv-card-overlay-prompt">&ldquo;{item.description}&rdquo;</p>
        </div>
      </div>
      <div className="pv-card-body">
        <div className="pv-card-title">{item.title}</div>
        {item.model && <div className="pv-card-model">{item.model}</div>}
        <button
          className={`pv-copy-btn${isCopied ? " copied" : ""}`}
          onClick={e => { e.stopPropagation(); onCopy(item); }}
        >
          {isCopied ? <><Check size={11} /> Tersalin / Copied</> : <><Copy size={11} /> Salin Prompt / Copy</>}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DETAIL MODAL
───────────────────────────────────────────── */
function Modal({ item, copiedId, onCopy, onClose }) {
  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!item) return null;
  const isCopied = copiedId === item.id;

  return (
    <div className="pv-modal-backdrop" onClick={onClose}>
      <div className="pv-modal" onClick={e => e.stopPropagation()}>
        <button className="pv-modal-close" onClick={onClose}><X size={14} /></button>
        <img className="pv-modal-img" src={item.image_url} alt={item.title} />
        <div className="pv-modal-body">
          <div className="pv-modal-cat">
            <span>{item.category}</span>
            <span className="pv-modal-cat-medium">· {getMedium(item)}</span>
          </div>
          <div className="pv-modal-title">{item.title}</div>
          {item.model && <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 12 }}>{item.model}</div>}
          <div className="pv-modal-prompt">{item.description}</div>
          {item.tags?.length > 0 && (
            <div className="pv-modal-tags">{item.tags.map(t => <span key={t} className="pv-modal-tag">#{t}</span>)}</div>
          )}
          <button className="pv-modal-copy" onClick={() => onCopy(item)}>
            {isCopied ? <><Check size={14} /> Tersalin!</> : <><Copy size={14} /> Salin Prompt / Copy Prompt</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GALLERY PAGE
───────────────────────────────────────────── */
function GalleryPage({ prompts, loading }) {
  const [search, setSearch]     = useState("");
  const [medium, setMedium]     = useState("All");
  const [cat, setCat]           = useState("All");
  const [sort, setSort]         = useState("newest");
  const [copiedId, setCopiedId] = useState(null);
  const [modal, setModal]       = useState(null);

  // Reset category filter when medium changes — selected cat may not exist in new medium
  useEffect(() => { setCat("All"); }, [medium]);

  // Counts per medium for tab badges
  const mediumCounts = useMemo(() => {
    const counts = { All: prompts.length };
    MEDIUMS.forEach(m => {
      counts[m] = prompts.filter(p => getMedium(p) === m).length;
    });
    return counts;
  }, [prompts]);

  // Categories scoped to current medium (defaults + user-added merged)
  const categories = useMemo(() => {
    const inMedium = medium === "All"
      ? prompts
      : prompts.filter(p => getMedium(p) === medium);

    const defaults = medium === "All"
      ? Object.values(DEFAULT_CATEGORIES_BY_MEDIUM).flat()
      : DEFAULT_CATEGORIES_BY_MEDIUM[medium] || [];

    const fromPrompts = inMedium.map(p => p.category).filter(Boolean);
    return ["All", ...new Set([...defaults, ...fromPrompts])];
  }, [prompts, medium]);

  const filtered = useMemo(() => {
    let res = prompts.filter(p => {
      const matchMedium = medium === "All" || getMedium(p) === medium;
      const matchCat    = cat === "All" || p.category === cat;
      const q           = search.toLowerCase();
      const matchSearch = !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q));
      return matchMedium && matchCat && matchSearch;
    });
    if (sort === "az") res = [...res].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "za") res = [...res].sort((a, b) => b.title.localeCompare(a.title));
    return res;
  }, [prompts, medium, cat, search, sort]);

  const handleCopy = useCallback(item => {
    navigator.clipboard?.writeText(item.description).catch(() => {});
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const uniqueTags = [...new Set(prompts.flatMap(p => p.tags || []))].length;

  return (
    <div className="pv-page">
      {modal && <Modal item={modal} copiedId={copiedId} onCopy={handleCopy} onClose={() => setModal(null)} />}

      {/* HERO */}
      <div className="pv-hero">
        <div className="pv-hero-eyebrow">
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
          AI Prompt Gallery
        </div>
        <h1 className="pv-hero-title">Visual AI <em>Prompt</em><br />Library</h1>
        <p className="pv-hero-sub">
          Koleksi prompt visual terbaik untuk proyek kreasi AI Anda.
          <small>Best AI visual prompts for your creative projects.</small>
        </p>
        <div className="pv-hero-stats">
          {[
            { n: prompts.length, l: "Prompts" },
            { n: MEDIUMS.length, l: "Mediums" },
            { n: uniqueTags, l: "Unique Tags" },
          ].map(s => (
            <div key={s.l}>
              <div className="pv-stat-num">{s.n}</div>
              <div className="pv-stat-label">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MEDIUM TABS — top-level navigation */}
      <div className="pv-mediums">
        <button
          className={`pv-medium${medium === "All" ? " active" : ""}`}
          onClick={() => setMedium("All")}
        >
          <LayoutGrid size={15} />
          Semua / All
          <span className="pv-medium-count">{mediumCounts.All}</span>
        </button>
        {MEDIUMS.map(m => {
          const Icon = MEDIUM_ICONS[m];
          return (
            <button
              key={m}
              className={`pv-medium${medium === m ? " active" : ""}`}
              onClick={() => setMedium(m)}
            >
              <Icon size={15} />
              {m}
              <span className="pv-medium-count">{mediumCounts[m]}</span>
            </button>
          );
        })}
      </div>

      {/* TOOLBAR */}
      <div className="pv-toolbar">
        <div className="pv-search-wrap">
          <Search size={16} />
          <input
            className="pv-search-input" type="text"
            placeholder="Cari judul, tag, atau prompt… / Search prompts…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="pv-filter-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Terbaru / Newest</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
        </select>
      </div>

      {/* CATEGORIES */}
      <div className="pv-cats">
        {categories.map(c => (
          <button key={c} className={`pv-cat${cat === c ? " active" : ""}`} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      {/* COUNT */}
      <div className="pv-count">{filtered.length} prompt{filtered.length !== 1 ? "s" : ""} ditemukan / found</div>

      {/* GRID */}
      {loading ? (
        <div className="pv-loading">
          <div className="pv-spinner" />
          <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Memuat data… / Loading…</p>
        </div>
      ) : (
        <div className="pv-grid">
          {filtered.length === 0 ? (
            <div className="pv-empty">
              <ImageIcon size={40} style={{ color: "var(--text-dim)", margin: "0 auto 16px", display: "block" }} />
              <p>{search || cat !== "All" || medium !== "All" ? "Tidak ada hasil. / No results found." : "Belum ada prompt. / No prompts yet."}</p>
            </div>
          ) : filtered.map(item => (
            <Card key={item.id} item={item} copiedId={copiedId} onCopy={handleCopy} onOpen={setModal} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ADMIN LOGIN
───────────────────────────────────────────── */
function AdminLogin({ onLogin, dbPassword }) {
  const [pass, setPass]   = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = e => {
    e.preventDefault();
    if (pass === dbPassword) {
      onLogin(); setError(false);
    } else {
      setError(true); setPass("");
    }
  };

  return (
    <div className="pv-login-wrap pv-page">
      <div className="pv-login-card">
        <div className="pv-login-icon"><Lock size={32} /></div>
        <div className="pv-login-title">Admin Access</div>
        <div className="pv-login-sub">Masukkan password dashboard / Enter dashboard password</div>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className={`pv-login-input${error ? " error" : ""}`}
            placeholder="••••••••"
            value={pass}
            onChange={e => { setPass(e.target.value); setError(false); }}
            autoFocus
          />
          {error && <div className="pv-login-error">Password salah / Wrong password</div>}
          <button type="submit" className="pv-login-btn">Buka Dashboard / Enter</button>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ADMIN DASHBOARD
───────────────────────────────────────────── */
const initialFormState = () => ({
  title: "",
  model: "Gemini Nano Banana",
  medium: "Fotografi",
  category: DEFAULT_CATEGORIES_BY_MEDIUM.Fotografi[0],
  description: "",
  tags: [],
});

function AdminDashboard({ prompts, fetchPrompts, onLogout }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialFormState());
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [selectedFile, setSelectedFile]       = useState(null);
  const [previewUrl, setPreviewUrl]           = useState("");
  const [tagInput, setTagInput]               = useState("");
  const [isUploading, setIsUploading]         = useState(false);
  const [isChangingPass, setIsChangingPass]   = useState(false);
  const [newPassword, setNewPassword]         = useState("");

  // Inline "add new category" state
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");

  // Categories scoped to currently selected medium (defaults + user-added)
  const cats = useMemo(() => {
    const defaults = DEFAULT_CATEGORIES_BY_MEDIUM[form.medium] || [];
    const fromPrompts = prompts
      .filter(p => getMedium(p) === form.medium)
      .map(p => p.category)
      .filter(Boolean);
    return [...new Set([...defaults, ...fromPrompts])];
  }, [prompts, form.medium]);

  // When medium changes, ensure selected category exists in the new medium's category list
  useEffect(() => {
    if (cats.length > 0 && !cats.includes(form.category)) {
      setForm(f => ({ ...f, category: cats[0] }));
    }
    // Cancel any pending "add new" when medium switches
    setIsAddingCat(false);
    setNewCatInput("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.medium]);

  /* ── Helpers ── */
  const resetForm = () => {
    setEditingId(null);
    setForm(initialFormState());
    setCurrentImageUrl(""); setSelectedFile(null);
    if (previewUrl && !previewUrl.startsWith("/")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(""); setTagInput("");
    setIsAddingCat(false); setNewCatInput("");
  };

  const startEdit = item => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      model: item.model || "Gemini Nano Banana",
      medium: getMedium(item),
      category: item.category,
      description: item.description,
      tags: item.tags || [],
    });
    setCurrentImageUrl(item.image_url); setSelectedFile(null); setPreviewUrl("");
    setIsAddingCat(false); setNewCatInput("");
    window.scrollTo({ top: 0 });
  };

  const handleDesc = e => {
    const text = e.target.value;
    const found = AUTO_TAG_KEYWORDS.filter(kw => text.toLowerCase().includes(kw));
    setForm(f => ({ ...f, description: text, tags: [...new Set([...f.tags, ...found])] }));
  };

  const addTag = e => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().toLowerCase();
      if (!form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }));
      setTagInput("");
    }
  };

  /* ── Category select handler ── */
  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === ADD_NEW_CAT_VALUE) {
      setIsAddingCat(true);
      setNewCatInput("");
    } else {
      setForm(f => ({ ...f, category: value }));
    }
  };

  const confirmNewCategory = () => {
    const newCat = newCatInput.trim();
    if (!newCat) {
      // Empty input: just cancel
      setIsAddingCat(false);
      return;
    }
    setForm(f => ({ ...f, category: newCat }));
    setIsAddingCat(false);
    setNewCatInput("");
  };

  const cancelNewCategory = () => {
    setIsAddingCat(false);
    setNewCatInput("");
  };

  /* ── Image conversion ── */
  const convertToWebP = (file) =>
    new Promise(resolve => {
      if (file.type === "image/webp") { resolve(file); return; }
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        canvas.width = img.width; canvas.height = img.height;
        ctx.drawImage(img, 0, 0); URL.revokeObjectURL(url);
        canvas.toBlob(blob => resolve(new File([blob], file.name.replace(/\.(jpg|jpeg|png|gif|bmp)$/i, ".webp"), { type: "image/webp" })), "image/webp", 0.85);
      };
      img.src = url;
    });

  const handleFile = e => {
    const file = e.target.files[0]; if (!file) return;
    setSelectedFile(file);
    if (previewUrl && !previewUrl.startsWith("/")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  /* ── Submit ── */
  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.title || !form.description) { alert("Harap isi Judul dan Prompt!"); return; }
    if (!form.category) { alert("Kategori belum dipilih!"); return; }
    if (!editingId && !selectedFile) { alert("Harap pilih gambar untuk post baru!"); return; }
    setIsUploading(true);
    try {
      let finalImageUrl = currentImageUrl;
      if (selectedFile) {
        const webpFile = await convertToWebP(selectedFile);
        const filePath = `uploads/${Date.now()}.webp`;
        const { error: upErr } = await supabase.storage.from("prompt-images").upload(filePath, webpFile, { contentType: "image/webp" });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("prompt-images").getPublicUrl(filePath);
        finalImageUrl = publicUrl;
      }
      const payload = {
        title: form.title,
        description: form.description,
        model: form.model,
        medium: form.medium,
        category: form.category,
        tags: form.tags,
        image_url: finalImageUrl,
      };
      if (editingId) {
        const { error } = await supabase.from("prompts").update(payload).eq("id", editingId);
        if (error) throw error;
        alert("Berhasil diperbarui! / Updated successfully!");
      } else {
        const { error } = await supabase.from("prompts").insert([payload]);
        if (error) throw error;
        alert("Berhasil dipublikasikan! / Published!");
      }
      resetForm(); fetchPrompts();
    } catch (err) {
      alert("Gagal: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async id => {
    if (!confirm("Hapus permanen? / Delete permanently?")) return;
    const { error } = await supabase.from("prompts").delete().eq("id", id);
    if (!error) fetchPrompts();
    else alert("Gagal menghapus: " + error.message);
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) { alert("Password minimal 6 karakter!"); return; }
    try {
      const { data, error: upErr } = await supabase.from("settings").update({ value: newPassword.trim() }).eq("key", "admin_password").select();
      if (!upErr && data.length === 0) {
        const { error: insErr } = await supabase.from("settings").insert({ key: "admin_password", value: newPassword.trim() });
        if (insErr) throw insErr;
      } else if (upErr) throw upErr;
      alert("Password berhasil diperbarui!");
      setNewPassword(""); setIsChangingPass(false);
    } catch (err) {
      alert("Gagal: " + err.message);
    }
  };

  return (
    <div className="pv-page">
      <div className="pv-dashboard">
        {/* LEFT */}
        <div>
          {/* Security */}
          <div className="pv-sec-card">
            <div className="pv-sec-label"><KeyRound size={13} /> Keamanan / Security</div>
            {isChangingPass ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input className="pv-field-input" type="text" placeholder="Password baru (min. 6)…" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleChangePassword} style={{ flex: 1, padding: "9px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Simpan</button>
                  <button onClick={() => { setIsChangingPass(false); setNewPassword(""); }} style={{ padding: "9px 14px", background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Batal</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setIsChangingPass(true)} style={{ width: "100%", padding: "10px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all .2s" }}>
                Ganti Password Dashboard
              </button>
            )}
          </div>

          {/* Form */}
          <form className="pv-form-card" onSubmit={handleSubmit}>
            <div className="pv-form-header">
              <div className="pv-form-title">
                {editingId ? <><Edit2 size={18} /> Edit Prompt</> : <><Plus size={18} /> New Prompt</>}
              </div>
              {editingId && <button type="button" className="pv-form-cancel" onClick={resetForm}>Batal / Cancel</button>}
            </div>

            <div className="pv-field">
              <label className="pv-field-label">Judul / Title</label>
              <input className="pv-field-input" type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Portrait of a Warrior…" />
            </div>

            <div className="pv-field">
              <label className="pv-field-label">Gambar / Image <span>— {editingId ? "Opsional" : "Wajib"} · auto convert WebP</span></label>
              <label className="pv-upload-zone">
                {previewUrl
                  ? <><img src={previewUrl} alt="preview" /><div className="pv-upload-overlay"><Upload size={20} /><span className="pv-upload-text">Ganti / Change</span></div></>
                  : editingId && currentImageUrl
                    ? <><img src={currentImageUrl} alt="current" style={{ opacity: .25, filter: "grayscale(1)" }} /><div className="pv-upload-overlay"><Upload size={20} /><span className="pv-upload-text">Klik untuk ganti</span></div></>
                    : <><Upload size={24} style={{ color: "var(--text-dim)" }} /><span className="pv-upload-text" style={{ marginTop: 8 }}>JPG / PNG / WebP</span></>
                }
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
              </label>
            </div>

            {/* MEDIUM */}
            <div className="pv-field">
              <label className="pv-field-label">Medium <span>— jenis karya</span></label>
              <select
                className="pv-field-select"
                value={form.medium}
                onChange={e => setForm(f => ({ ...f, medium: e.target.value }))}
              >
                {MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* CATEGORY — with inline "add new" */}
            <div className="pv-field">
              <label className="pv-field-label">
                Kategori / Category
                <span>— pilih atau tambah baru</span>
              </label>
              {!isAddingCat ? (
                <select
                  className="pv-field-select"
                  value={cats.includes(form.category) ? form.category : ""}
                  onChange={handleCategoryChange}
                >
                  {!cats.includes(form.category) && form.category && (
                    <option value={form.category}>{form.category} (baru)</option>
                  )}
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value={ADD_NEW_CAT_VALUE}>+ Tambah kategori baru…</option>
                </select>
              ) : (
                <div className="pv-add-cat-row">
                  <input
                    autoFocus
                    type="text"
                    value={newCatInput}
                    onChange={e => setNewCatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") { e.preventDefault(); confirmNewCategory(); }
                      if (e.key === "Escape") { e.preventDefault(); cancelNewCategory(); }
                    }}
                    placeholder={`Kategori baru untuk ${form.medium}…`}
                  />
                  <button type="button" className="pv-add-cat-btn confirm" onClick={confirmNewCategory} title="Tambah">
                    <Check size={14} />
                  </button>
                  <button type="button" className="pv-add-cat-btn cancel" onClick={cancelNewCategory} title="Batal">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="pv-field">
              <label className="pv-field-label">Model AI</label>
              <input className="pv-field-input" type="text" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
            </div>

            <div className="pv-field">
              <label className="pv-field-label">Tags <span>— auto dari prompt + manual</span></label>
              <div className="pv-tags-wrap">
                {form.tags.map(t => (
                  <span key={t} className="pv-tag-chip">
                    #{t}
                    <button type="button" className="pv-tag-x" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}><X size={10} /></button>
                  </span>
                ))}
                <input className="pv-tag-input" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="Ketik & Enter…" />
              </div>
            </div>

            <div className="pv-field">
              <label className="pv-field-label">Teks Prompt</label>
              <textarea className="pv-field-textarea" rows={5} value={form.description} onChange={handleDesc} placeholder="Paste prompt AI — tag akan muncul otomatis…" />
            </div>

            <button type="submit" className="pv-submit-btn" disabled={isUploading}>
              {isUploading ? "Mengupload…" : editingId ? <><Check size={16} /> Simpan / Save</> : <><Upload size={16} /> Publikasikan / Publish</>}
            </button>
          </form>
        </div>

        {/* RIGHT — Table */}
        <div>
          <div className="pv-table-card">
            <div className="pv-table-header">
              <div className="pv-table-title">Katalog Prompts <span>({prompts.length})</span></div>
              <button className="pv-logout-btn" onClick={onLogout}>Keluar / Sign Out</button>
            </div>
            <div className="pv-table-wrap">
              <table className="pv-table">
                <thead>
                  <tr>
                    <th>Visual</th>
                    <th>Detail</th>
                    <th>Tags</th>
                    <th style={{ textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {prompts.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: "48px", textAlign: "center", color: "var(--text-dim)", fontStyle: "italic" }}>Belum ada prompt / No prompts yet</td></tr>
                  ) : prompts.map(p => (
                    <tr key={p.id}>
                      <td><img className="pv-row-thumb" src={p.image_url} alt={p.title} loading="lazy" /></td>
                      <td>
                        <div className="pv-row-title">{p.title}</div>
                        <div className="pv-row-meta">
                          <span className="pv-row-cat">{p.category}</span>
                          <span className="pv-row-medium">{getMedium(p)}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {(p.tags || []).slice(0, 3).map(t => <span key={t} style={{ fontSize: 10, color: "var(--text-dim)", fontStyle: "italic" }}>#{t}</span>)}
                        </div>
                      </td>
                      <td>
                        <div className="pv-actions">
                          <button className="pv-action-btn edit" onClick={() => startEdit(p)} title="Edit"><Edit2 size={14} /></button>
                          <button className="pv-action-btn del" onClick={() => handleDelete(p.id)} title="Hapus"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROOT APP
───────────────────────────────────────────── */
export default function App() {
  const [prompts, setPrompts]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState("gallery");
  const [isAdmin, setIsAdmin]       = useState(false);
  const [dbPassword, setDbPassword] = useState("admin123");

  /* Guard — no Supabase config */
  const hasConfig = supabaseUrl && supabaseKey;

  const fetchPrompts = useCallback(async () => {
    if (!hasConfig) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("prompts").select("*").order("created_at", { ascending: false });
      if (error) console.error("Supabase error:", error);
      else setPrompts(data || []);
    } catch (err) {
      console.error("Connection error:", err);
    } finally {
      setLoading(false);
    }
  }, [hasConfig]);

  const fetchAdminPassword = useCallback(async () => {
    if (!hasConfig) return;
    try {
      const { data, error } = await supabase.from("settings").select("value").eq("key", "admin_password").single();
      if (data && !error) setDbPassword(data.value);
    } catch (_) {}
  }, [hasConfig]);

  useEffect(() => {
    fetchPrompts();
    fetchAdminPassword();
  }, [fetchPrompts, fetchAdminPassword]);

  /* No config guard */
  if (!hasConfig) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 440, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 24, padding: "48px 40px", textAlign: "center" }}>
          <Lock size={40} style={{ color: "var(--accent)", margin: "0 auto 20px" }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Database Terputus</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
            Pastikan file <code style={{ color: "var(--accent)" }}>.env.local</code> berisi{" "}
            <code style={{ color: "var(--accent)" }}>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code style={{ color: "var(--accent)" }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Inject styles once */}
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* NAVBAR */}
      <nav className="pv-nav">
        <div className="pv-nav-logo" onClick={() => setTab("gallery")}>
          <div className="pv-nav-logo-icon"><img src="/logo.png" alt="PromptVault" /></div>
          <span className="pv-nav-logo-name">Prompt<span>Vault</span></span>
        </div>
        <div className="pv-nav-links">
          <button className={`pv-nav-link${tab === "gallery" ? " active" : ""}`} onClick={() => setTab("gallery")}>
            <LayoutGrid size={15} /> Gallery / Galeri
          </button>
          <button className={`pv-nav-link${tab === "admin" ? " active" : ""}`} onClick={() => setTab("admin")}>
            {isAdmin ? <><Settings size={15} /> Dashboard</> : <><LogIn size={15} /> Admin</>}
          </button>
        </div>
      </nav>

      {/* PAGES */}
      {tab === "gallery" && <GalleryPage prompts={prompts} loading={loading} />}
      {tab === "admin" && !isAdmin && <AdminLogin onLogin={() => setIsAdmin(true)} dbPassword={dbPassword} />}
      {tab === "admin" && isAdmin && (
        <AdminDashboard
          prompts={prompts}
          fetchPrompts={fetchPrompts}
          onLogout={() => { setIsAdmin(false); setTab("gallery"); }}
        />
      )}
    </>
  );
}
