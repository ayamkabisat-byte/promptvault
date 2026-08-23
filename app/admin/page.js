"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Check, Edit2, ImagePlus, Lock, LogOut, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getPublicStats } from "@/lib/metrics";

const EMPTY = { title: "", model: "Gemini Nano Banana", medium: "Fotografi", category: "Portrait", description: "", tags: "", status: "published", is_featured: false };

function storagePathFromUrl(url = "") {
  const marker = "/storage/v1/object/public/prompt-images/";
  if (!url.includes(marker)) return null;
  return decodeURIComponent(url.split(marker)[1].split("?")[0]);
}

async function convertToWebP(file) {
  if (!file || typeof document === "undefined") return file;
  const img = document.createElement("img");
  const objectUrl = URL.createObjectURL(file);
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = objectUrl; });
  const maxSide = 1800;
  const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * ratio);
  canvas.height = Math.round(img.naturalHeight * ratio);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(objectUrl);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
}

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [legacyAuthed, setLegacyAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [prompts, setPrompts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [siteStats, setSiteStats] = useState({ total_views: 0, unique_visitors: 0 });

  const isAdmin = Boolean(session || legacyAuthed);

  const fetchPrompts = useCallback(async () => {
    const { data, error } = await supabase.from("prompts").select("*").order("created_at", { ascending: false });
    if (!error) setPrompts(data || []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (isAdmin) { fetchPrompts(); getPublicStats().then(setSiteStats); } }, [isAdmin, fetchPrompts]);

  const totals = useMemo(() => prompts.reduce((acc, p) => ({
    views: acc.views + Number(p.view_count || 0),
    copies: acc.copies + Number(p.copy_count || 0),
    favorites: acc.favorites + Number(p.favorite_count || 0),
  }), { views: 0, copies: 0, favorites: 0 }), [prompts]);

  const login = async (e) => {
    e.preventDefault(); setAuthError("");
    if (email.trim()) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setAuthError(error.message);
      return;
    }
    try {
      const { data, error } = await supabase.from("settings").select("value").eq("key", "admin_password").single();
      if (!error && data?.value === password) setLegacyAuthed(true);
      else setAuthError("Legacy password salah atau security migration sudah aktif.");
    } catch { setAuthError("Legacy login tidak tersedia."); }
  };

  const reset = () => { setForm(EMPTY); setEditing(null); setFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(""); };

  const edit = (p) => {
    setEditing(p);
    setForm({ title: p.title || "", model: p.model || "", medium: p.medium || "Fotografi", category: p.category || "General", description: p.description || "", tags: (p.tags || []).join(", "), status: p.status || "published", is_featured: Boolean(p.is_featured) });
    setPreview(p.image_url || ""); setFile(null); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uploadImage = async () => {
    if (!file) return editing?.image_url || "";
    const webp = await convertToWebP(file);
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
    const { error } = await supabase.storage.from("prompt-images").upload(path, webp, { contentType: "image/webp" });
    if (error) throw error;
    return supabase.storage.from("prompt-images").getPublicUrl(path).data.publicUrl;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return alert("Title dan prompt wajib diisi.");
    if (!editing && !file) return alert("Image wajib untuk prompt baru.");
    setSaving(true);
    try {
      const oldImage = editing?.image_url || "";
      const imageUrl = await uploadImage();
      const basePayload = { title: form.title.trim(), model: form.model.trim(), medium: form.medium, category: form.category.trim(), description: form.description.trim(), tags: form.tags.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean), image_url: imageUrl };
      const v2Payload = { ...basePayload, status: form.status, is_featured: form.is_featured };
      let result = editing
        ? await supabase.from("prompts").update(v2Payload).eq("id", editing.id)
        : await supabase.from("prompts").insert([v2Payload]);
      if (result.error && /column|schema cache/i.test(result.error.message || "")) {
        result = editing
          ? await supabase.from("prompts").update(basePayload).eq("id", editing.id)
          : await supabase.from("prompts").insert([basePayload]);
      }
      if (result.error) throw result.error;
      if (file && oldImage && oldImage !== imageUrl) {
        const path = storagePathFromUrl(oldImage); if (path) await supabase.storage.from("prompt-images").remove([path]);
      }
      reset(); await fetchPrompts();
    } catch (error) { alert(`Gagal menyimpan: ${error.message}`); }
    finally { setSaving(false); }
  };

  const remove = async (p) => {
    if (!confirm(`Hapus “${p.title}” permanen?`)) return;
    const { error } = await supabase.from("prompts").delete().eq("id", p.id);
    if (error) return alert(error.message);
    const path = storagePathFromUrl(p.image_url); if (path) await supabase.storage.from("prompt-images").remove([path]);
    fetchPrompts();
  };

  const logout = async () => { if (session) await supabase.auth.signOut(); setLegacyAuthed(false); };

  if (!isAdmin) return (
    <main className="pv2-admin-login">
      <Link href="/" className="pv2-back-link"><ArrowLeft size={14} /> Gallery</Link>
      <form onSubmit={login} className="pv2-login-card">
        <div className="pv2-login-icon"><Lock size={26} /></div>
        <h1>PromptVault Admin</h1>
        <p>Gunakan Supabase Auth email + password. Selama migration belum dijalankan, kosongkan email untuk memakai password dashboard lama.</p>
        <input className="pv2-field" type="email" placeholder="Admin email (recommended)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="pv2-field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {authError && <div className="pv2-auth-error">{authError}</div>}
        <button className="pv2-primary-btn wide">Sign in</button>
      </form>
    </main>
  );

  return (
    <main className="pv2-admin-shell">
      <header className="pv2-admin-header"><div><Link href="/"><ArrowLeft size={14} /> Gallery</Link><h1>PromptVault <span>Studio</span></h1></div><button onClick={logout}><LogOut size={14} /> Sign out</button></header>
      <section className="pv2-admin-stats">
        <div><BarChart3 size={16} /><strong>{prompts.length}</strong><span>Prompts</span></div>
        <div><strong>{totals.views.toLocaleString()}</strong><span>Prompt views</span></div>
        <div><strong>{totals.copies.toLocaleString()}</strong><span>Copies</span></div>
        <div><strong>{totals.favorites.toLocaleString()}</strong><span>Favorites</span></div>
        <div><strong>{siteStats.unique_visitors.toLocaleString()}</strong><span>Visitors</span></div>
        <div><strong>{siteStats.total_views.toLocaleString()}</strong><span>Visits</span></div>
      </section>

      <div className="pv2-admin-grid">
        <form className="pv2-admin-form" onSubmit={save}>
          <div className="pv2-admin-form-head"><h2>{editing ? <><Edit2 size={16} /> Edit prompt</> : <><Plus size={16} /> New prompt</>}</h2>{editing && <button type="button" onClick={reset}><X size={14} /> Cancel</button>}</div>
          <label>Title<input className="pv2-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <div className="pv2-form-row"><label>Model<input className="pv2-field" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></label><label>Medium<select className="pv2-field" value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })}><option>Fotografi</option><option>Graphic</option><option>Ilustrasi</option></select></label></div>
          <label>Category<input className="pv2-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
          <label>Prompt<textarea className="pv2-field" rows={7} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label>Tags<input className="pv2-field" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="cinematic, portrait, flash" /></label>
          <div className="pv2-form-row"><label>Status<select className="pv2-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="published">Published</option><option value="draft">Draft</option></select></label><label className="pv2-check"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /><Sparkles size={14} /> Featured</label></div>
          <label className="pv2-upload"><ImagePlus size={22} /><span>{file ? file.name : editing ? "Replace image (optional)" : "Choose image"}</span><input type="file" accept="image/*" hidden onChange={(e) => { const next = e.target.files?.[0]; if (!next) return; setFile(next); if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview); setPreview(URL.createObjectURL(next)); }} /></label>
          {preview && <img className="pv2-admin-preview" src={preview} alt="Preview" />}
          <button className="pv2-primary-btn wide" disabled={saving}>{saving ? "Saving…" : <><Upload size={15} /> {editing ? "Save changes" : "Publish prompt"}</>}</button>
        </form>

        <section className="pv2-admin-list"><div className="pv2-admin-list-head"><h2>Prompt catalog</h2><span>{prompts.length} items</span></div>{prompts.map((p) => <article key={p.id} className="pv2-admin-row"><img src={p.image_url} alt="" /><div className="grow"><strong>{p.title}</strong><span>{p.medium || "Fotografi"} · {p.category} · {p.model || "AI"}</span><small>{p.status || "published"}{p.is_featured ? " · featured" : ""}</small></div><button onClick={() => edit(p)}><Edit2 size={14} /></button><button className="danger" onClick={() => remove(p)}><Trash2 size={14} /></button></article>)}</section>
      </div>
    </main>
  );
}
