"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Edit2, ImagePlus, Lock, LogOut, Plus, Search, Sparkles, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getPublicStats } from "@/lib/metrics";
import { generateAutoTags } from "@/lib/autoTags";

const EMPTY = {
  title: "",
  model: "Gemini Nano Banana",
  medium: "Fotografi",
  category: "",
  description: "",
  tags: "",
  status: "published",
  is_featured: false,
};

function storagePathFromUrl(url = "") {
  const marker = "/storage/v1/object/public/prompt-images/";
  if (!url.includes(marker)) return null;
  return decodeURIComponent(url.split(marker)[1].split("?")[0]);
}

function slugify(value = "") {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseTags(value = "") {
  return [...new Set(
    String(value)
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
  )];
}

async function convertToWebP(file) {
  if (!file || typeof document === "undefined") return file;
  const img = document.createElement("img");
  const objectUrl = URL.createObjectURL(file);
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = objectUrl;
  });

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
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [prompts, setPrompts] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);

  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");
  const [siteStats, setSiteStats] = useState({ total_views: 0, unique_visitors: 0 });

  const isAdmin = Boolean(session);

  const fetchPrompts = useCallback(async () => {
    const { data, error } = await supabase
      .from("prompts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("PromptVault prompt fetch error", error);
      return;
    }
    setPrompts(data || []);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("prompt_categories")
      .select("id, medium, name, slug, sort_order, is_active")
      .order("medium", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.warn("PromptVault category fetch error", error);
      return;
    }
    setCategories(data || []);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthReady(true);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchPrompts();
    fetchCategories();
    getPublicStats().then(setSiteStats).catch(() => {});
  }, [isAdmin, fetchPrompts, fetchCategories]);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.medium === form.medium && category.is_active !== false),
    [categories, form.medium]
  );

  useEffect(() => {
    if (editing || form.category || !activeCategories.length) return;
    setForm((prev) => ({ ...prev, category: activeCategories[0].name }));
  }, [activeCategories, editing, form.category]);

  const totals = useMemo(
    () => prompts.reduce(
      (acc, p) => ({
        views: acc.views + Number(p.view_count || 0),
        copies: acc.copies + Number(p.copy_count || 0),
        favorites: acc.favorites + Number(p.favorite_count || 0),
      }),
      { views: 0, copies: 0, favorites: 0 }
    ),
    [prompts]
  );

  const filteredPrompts = useMemo(() => {
    const terms = catalogSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return prompts;

    return prompts.filter((p) => {
      const tags = Array.isArray(p.tags) ? p.tags.join(" ") : String(p.tags || "");
      const haystack = [
        p.id,
        p.title,
        p.description,
        p.medium,
        p.category,
        p.model,
        p.status,
        tags,
      ].map((value) => String(value || "").toLowerCase()).join(" ");

      return terms.every((term) => haystack.includes(term));
    });
  }, [prompts, catalogSearch]);

  const requireSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) {
      setSession(null);
      throw new Error("Sesi admin sudah berakhir. Silakan sign in kembali dengan email + password.");
    }
    return data.session;
  };

  const login = async (e) => {
    e.preventDefault();
    setAuthError("");

    if (!email.trim()) {
      setAuthError("Email admin wajib diisi. Login password-only lama sudah dinonaktifkan agar perubahan tidak gagal diam-diam.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) setAuthError(error.message);
  };

  const reset = () => {
    setForm(EMPTY);
    setEditing(null);
    setNewCategory("");
    setFile(null);
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview("");
  };

  const edit = (p) => {
    setSaveNotice("");
    setEditing(p);
    setForm({
      title: p.title || "",
      model: p.model || "",
      medium: p.medium || "Fotografi",
      category: p.category || "",
      description: p.description || "",
      tags: (p.tags || []).join(", "),
      status: p.status || "published",
      is_featured: Boolean(p.is_featured),
    });
    setPreview(p.image_url || "");
    setFile(null);
    setNewCategory("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeMedium = (nextMedium) => {
    const first = categories.find(
      (category) => category.medium === nextMedium && category.is_active !== false
    );
    setForm((prev) => ({
      ...prev,
      medium: nextMedium,
      category: first?.name || "",
    }));
    setNewCategory("");
  };

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;

    const existing = categories.find(
      (category) =>
        category.medium === form.medium &&
        category.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      setForm((prev) => ({ ...prev, category: existing.name }));
      setNewCategory("");
      return;
    }

    setCategorySaving(true);
    try {
      await requireSession();

      const currentMax = categories
        .filter((category) => category.medium === form.medium)
        .reduce((max, category) => Math.max(max, Number(category.sort_order || 0)), 0);

      const { data, error } = await supabase
        .from("prompt_categories")
        .insert([{
          medium: form.medium,
          name,
          slug: slugify(name) || `category-${Date.now()}`,
          sort_order: currentMax + 1,
          is_active: true,
        }])
        .select("id, medium, name, slug, sort_order, is_active")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Category tidak berhasil dibuat.");

      setCategories((prev) => [...prev, data]);
      setForm((prev) => ({ ...prev, category: data.name }));
      setNewCategory("");
    } catch (error) {
      alert(`Gagal menambah category: ${error.message}`);
    } finally {
      setCategorySaving(false);
    }
  };

  const applyAutoTags = () => {
    const existing = parseTags(form.tags);
    const generated = generateAutoTags(form, 18);
    const merged = [...new Set([...existing, ...generated])].slice(0, 20);
    setForm((prev) => ({ ...prev, tags: merged.join(", ") }));
  };

  const uploadImage = async () => {
    if (!file) {
      return {
        url: editing?.image_url || "",
        uploadedPath: null,
      };
    }

    const webp = await convertToWebP(file);
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
    const { error } = await supabase.storage
      .from("prompt-images")
      .upload(path, webp, { contentType: "image/webp" });

    if (error) throw error;

    return {
      url: supabase.storage.from("prompt-images").getPublicUrl(path).data.publicUrl,
      uploadedPath: path,
    };
  };

  const save = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      return alert("Title dan prompt wajib diisi.");
    }
    if (!form.category.trim()) {
      return alert("Category wajib dipilih atau dibuat terlebih dahulu.");
    }
    if (!editing && !file) {
      return alert("Image wajib untuk prompt baru.");
    }

    setSaving(true);
    setSaveNotice("");
    let uploadedPath = null;

    try {
      await requireSession();

      const oldImage = editing?.image_url || "";
      const uploaded = await uploadImage();
      uploadedPath = uploaded.uploadedPath;

      const tags = form.tags.trim()
        ? parseTags(form.tags)
        : generateAutoTags(form, 18);

      const payload = {
        title: form.title.trim(),
        model: form.model.trim(),
        medium: form.medium,
        category: form.category.trim(),
        description: form.description.trim(),
        tags,
        image_url: uploaded.url,
        status: form.status,
        is_featured: form.is_featured,
      };

      let saved;
      if (editing) {
        const { data, error } = await supabase
          .from("prompts")
          .update(payload)
          .eq("id", editing.id)
          .select("id, title, category, medium, status, image_url, updated_at")
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          throw new Error("Prompt tidak berubah. Akses update ditolak atau row tidak ditemukan.");
        }
        saved = data;
      } else {
        const { data, error } = await supabase
          .from("prompts")
          .insert([payload])
          .select("id, title, category, medium, status, image_url, updated_at")
          .single();

        if (error) throw error;
        if (!data) throw new Error("Prompt baru tidak berhasil dibuat.");
        saved = data;
      }

      if (String(saved.category || "") !== payload.category) {
        throw new Error(
          `Verifikasi gagal: category di database masih "${saved.category || "kosong"}", bukan "${payload.category}".`
        );
      }

      if (file && oldImage && oldImage !== uploaded.url) {
        const oldPath = storagePathFromUrl(oldImage);
        if (oldPath) await supabase.storage.from("prompt-images").remove([oldPath]);
      }

      const notice = editing
        ? `Tersimpan ✓ ${saved.title} → ${saved.category}`
        : `Published ✓ ${saved.title} → ${saved.category}`;

      reset();
      await fetchPrompts();
      setSaveNotice(notice);
      setTimeout(() => setSaveNotice(""), 4500);
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage.from("prompt-images").remove([uploadedPath]);
      }
      alert(`Gagal menyimpan: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!confirm(`Hapus “${p.title}” permanen?`)) return;

    try {
      await requireSession();

      const { data, error } = await supabase
        .from("prompts")
        .delete()
        .eq("id", p.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error("Prompt tidak terhapus. Akses delete ditolak atau row tidak ditemukan.");
      }

      const path = storagePathFromUrl(p.image_url);
      if (path) await supabase.storage.from("prompt-images").remove([path]);
      await fetchPrompts();
    } catch (error) {
      alert(`Gagal menghapus: ${error.message}`);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    reset();
  };

  if (!authReady) {
    return (
      <main className="pv2-admin-login">
        <div className="pv2-login-card"><p>Checking admin session…</p></div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="pv2-admin-login">
        <Link href="/" className="pv2-back-link"><ArrowLeft size={14} /> Gallery</Link>
        <form onSubmit={login} className="pv2-login-card">
          <div className="pv2-login-icon"><Lock size={26} /></div>
          <h1>PromptVault Admin</h1>
          <p>Sign in dengan Supabase Auth email + password. Login password-only lama sudah dinonaktifkan supaya edit, category, dan delete selalu diverifikasi oleh database.</p>
          <input
            className="pv2-field"
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            className="pv2-field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {authError && <div className="pv2-auth-error">{authError}</div>}
          <button className="pv2-primary-btn wide">Sign in</button>
        </form>
      </main>
    );
  }

  return (
    <main className="pv2-admin-shell">
      <header className="pv2-admin-header">
        <div>
          <Link href="/"><ArrowLeft size={14} /> Gallery</Link>
          <h1>PromptVault <span>Studio</span></h1>
        </div>
        <button onClick={logout}><LogOut size={14} /> Sign out</button>
      </header>

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
          <div className="pv2-admin-form-head">
            <h2>{editing ? <><Edit2 size={16} /> Edit prompt</> : <><Plus size={16} /> New prompt</>}</h2>
            {editing && <button type="button" onClick={reset}><X size={14} /> Cancel</button>}
          </div>

          {saveNotice && (
            <div
              role="status"
              style={{
                marginBottom: 12,
                padding: "9px 11px",
                borderRadius: 10,
                border: "1px solid rgba(83, 209, 139, .25)",
                background: "rgba(83, 209, 139, .08)",
                color: "#8ee2b1",
                fontSize: 11,
                lineHeight: 1.4,
              }}
            >
              {saveNotice}
            </div>
          )}

          <label>
            Title
            <input className="pv2-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>

          <div className="pv2-form-row">
            <label>
              Model
              <input className="pv2-field" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </label>
            <label>
              Medium
              <select className="pv2-field" value={form.medium} onChange={(e) => changeMedium(e.target.value)}>
                <option>Fotografi</option>
                <option>Graphic</option>
                <option>Ilustrasi</option>
              </select>
            </label>
          </div>

          <div className="pv2-field-group">
            <div className="pv2-field-label-row">
              <span>Category</span>
              <small>{activeCategories.length} saved</small>
            </div>
            <select className="pv2-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {!activeCategories.length && <option value="">No category yet</option>}
              {activeCategories.map((category) => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
            <div className="pv2-category-add-row">
              <input
                className="pv2-field"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  }
                }}
                placeholder={`Add ${form.medium} category…`}
              />
              <button type="button" onClick={addCategory} disabled={categorySaving || !newCategory.trim()}>
                <Plus size={13} /> {categorySaving ? "Adding…" : "Add"}
              </button>
            </div>
          </div>

          <label>
            Prompt
            <textarea className="pv2-field" rows={7} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>

          <div className="pv2-field-group">
            <div className="pv2-field-label-row">
              <span>Tags</span>
              <button type="button" className="pv2-auto-tags" onClick={applyAutoTags}>
                <Sparkles size={12} /> Auto Tags
              </button>
            </div>
            <input
              className="pv2-field"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="cinematic, portrait, flash"
            />
            <small className="pv2-field-help">
              Auto Tags membaca title, prompt, category, medium, dan model. Tetap bisa diedit manual.
            </small>
          </div>

          <div className="pv2-form-row">
            <label>
              Status
              <select className="pv2-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </label>
            <label className="pv2-check">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
              />
              <Sparkles size={14} /> Featured
            </label>
          </div>

          <label className="pv2-upload">
            <ImagePlus size={22} />
            <span>{file ? file.name : editing ? "Replace image (optional)" : "Choose image"}</span>
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const next = e.target.files?.[0];
                if (!next) return;
                setFile(next);
                if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
                setPreview(URL.createObjectURL(next));
              }}
            />
          </label>

          {preview && <img className="pv2-admin-preview" src={preview} alt="Preview" />}

          <button className="pv2-primary-btn wide" disabled={saving}>
            {saving ? "Saving…" : <><Upload size={15} /> {editing ? "Save changes" : "Publish prompt"}</>}
          </button>
        </form>

        <section className="pv2-admin-list">
          <div className="pv2-admin-list-head">
            <h2>Prompt catalog</h2>
            <span>{catalogSearch.trim() ? `${filteredPrompts.length} of ${prompts.length}` : `${prompts.length} items`}</span>
          </div>

          <div className="pv2-admin-search">
            <Search size={16} aria-hidden="true" />
            <input
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Search title, prompt, category, tags, model, ID…"
              aria-label="Search prompt catalog"
              autoComplete="off"
            />
            {catalogSearch && (
              <button type="button" onClick={() => setCatalogSearch("")} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          {filteredPrompts.length ? (
            filteredPrompts.map((p) => (
              <article key={p.id} className="pv2-admin-row">
                <img src={p.image_url} alt="" />
                <div className="grow">
                  <strong>{p.title}</strong>
                  <span>{p.medium || "Fotografi"} · {p.category} · {p.model || "AI"}</span>
                  <small>{p.status || "published"}{p.is_featured ? " · featured" : ""}</small>
                </div>
                <button type="button" onClick={() => edit(p)} aria-label={`Edit ${p.title}`}>
                  <Edit2 size={14} />
                </button>
                <button type="button" className="danger" onClick={() => remove(p)} aria-label={`Delete ${p.title}`}>
                  <Trash2 size={14} />
                </button>
              </article>
            ))
          ) : (
            <div className="pv2-admin-search-empty">
              No prompt found for “{catalogSearch.trim()}”.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
