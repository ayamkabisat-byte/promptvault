"use client";

import React, { useState, useEffect } from 'react';
import { 
  Copy, Check, Search, Filter, Plus, Upload, Trash2, Settings, 
  LogIn, LayoutGrid, Image as ImageIcon, X, Lock, Edit2, KeyRound
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- KONFIGURASI ---
const DEFAULT_CATEGORIES = ['All', 'Couple', 'Man', 'Woman', 'Vacation', 'Photoshoot', 'Selfie'];
const AUTO_TAG_KEYWORDS = [
  'neon', 'cyberpunk', 'studio', 'beach', 'sunset', 'minimalist',
  'fashion', 'dark', 'bright', 'vintage', 'car', 'night', 'sunlight',
  'cinematic', 'portrait', 'realistic', 'anime', '3d',
  'bokeh', 'dramatic', 'moody', 'golden hour', 'urban', 'forest',
  'underwater', 'futuristic', 'retro', 'colorful', 'monochrome'
];

// Inisialisasi Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [prompts, setPrompts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeTab, setActiveTab] = useState('gallery');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Status Login & Keamanan
  const [passInput, setPassInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [dbPassword, setDbPassword] = useState('admin123');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Status Galeri
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedId, setCopiedId] = useState(null);

  // Status Admin & Form
  const [adminForm, setAdminForm] = useState({
    title: '', model: 'Gemini Nano Banana', category: 'Woman', description: '', tags: []
  });
  const [editingId, setEditingId] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // 1. AMBIL DATA AWAL
  useEffect(() => {
    if (supabaseUrl && supabaseAnonKey) {
      fetchPrompts();
      fetchAdminPassword();
    }
  }, []);

  // Sinkronisasi kategori dinamis
  useEffect(() => {
    if (prompts.length > 0) {
      const dbCategories = [...new Set(prompts.map(p => p.category))];
      const merged = [...new Set([...DEFAULT_CATEGORIES, ...dbCategories])];
      setCategories(merged);
    }
  }, [prompts]);

  // --- FETCH: PROMPTS ---
  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('Gagal mengambil data:', error);
      else setPrompts(data || []);
    } catch (err) {
      console.error('Kesalahan koneksi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FETCH: ADMIN PASSWORD ---
  const fetchAdminPassword = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'admin_password')
        .single();
      if (data && !error) setDbPassword(data.value);
    } catch (err) {
      setDbPassword('admin123');
    }
  };

  // --- UTILITAS: KONVERSI GAMBAR KE WEBP ---
  const convertToWebP = (file, quality = 0.85) => {
    return new Promise((resolve) => {
      if (file.type === 'image/webp') {
        resolve(file);
        return;
      }
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (blob) => {
            const webpFile = new File(
              [blob],
              file.name.replace(/\.(jpg|jpeg|png|gif|bmp)$/i, '.webp'),
              { type: 'image/webp' }
            );
            resolve(webpFile);
          },
          'image/webp',
          quality
        );
      };
      img.src = url;
    });
  };

  // --- LOGIKA: LOGIN ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (passInput === dbPassword) {
      setIsAdminLoggedIn(true);
      setLoginError(false);
      setPassInput('');
    } else {
      setLoginError(true);
      setPassInput('');
    }
  };

  // --- LOGIKA: GANTI PASSWORD ---
  const handleChangePassword = async () => {
    if (!newPassword.trim()) return alert("Password tidak boleh kosong!");
    if (newPassword.length < 6) return alert("Password minimal 6 karakter!");
    try {
      const { data, error: updateError } = await supabase
        .from('settings')
        .update({ value: newPassword.trim() })
        .eq('key', 'admin_password')
        .select();

      if (!updateError && data.length === 0) {
        const { error: insertError } = await supabase
          .from('settings')
          .insert({ key: 'admin_password', value: newPassword.trim() });
        if (insertError) throw insertError;
      } else if (updateError) {
        throw updateError;
      }

      setDbPassword(newPassword.trim());
      setNewPassword('');
      setIsChangingPass(false);
      alert("Password berhasil diperbarui!");
    } catch (err) {
      alert("Gagal: " + err.message);
    }
  };

  // --- LOGIKA: TAGS & AUTO-TAGGING ---
  const handleDescriptionChange = (e) => {
    const text = e.target.value;
    setAdminForm(prev => {
      const textLower = text.toLowerCase();
      const foundAutoTags = AUTO_TAG_KEYWORDS.filter(kw => textLower.includes(kw));
      const updatedTags = Array.from(new Set([...prev.tags, ...foundAutoTags]));
      return { ...prev, description: text, tags: updatedTags };
    });
  };

  const addManualTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!adminForm.tags.includes(newTag)) {
        setAdminForm(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setAdminForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  // --- LOGIKA: PILIH FILE + PREVIEW ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // --- LOGIKA: KATEGORI BARU ---
  const handleAddCategory = () => {
    if (newCatInput.trim()) {
      const cat = newCatInput.trim();
      if (!categories.includes(cat)) setCategories([...categories, cat]);
      setAdminForm({ ...adminForm, category: cat });
      setNewCatInput('');
      setIsAddingCategory(false);
    }
  };

  // --- LOGIKA: MODE EDIT ---
  const startEditing = (item) => {
    setEditingId(item.id);
    setAdminForm({
      title: item.title,
      model: item.model || 'Gemini Nano Banana',
      category: item.category,
      description: item.description,
      tags: item.tags || []
    });
    setCurrentImageUrl(item.image_url);
    setSelectedFile(null);
    setPreviewUrl('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setAdminForm({ title: '', model: 'Gemini Nano Banana', category: 'Woman', description: '', tags: [] });
    setCurrentImageUrl('');
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
  };

  // --- LOGIKA: SUBMIT (INSERT / UPDATE) ---
  const handleSubmitAdminForm = async (e) => {
    e.preventDefault();
    if (!adminForm.title || !adminForm.description) {
      alert("Harap isi Judul dan Prompt!");
      return;
    }
    if (!editingId && !selectedFile) {
      alert("Harap pilih gambar untuk post baru!");
      return;
    }

    setIsUploading(true);
    try {
      let finalImageUrl = currentImageUrl;

      if (selectedFile) {
        // Konversi otomatis ke WebP
        const webpFile = await convertToWebP(selectedFile);
        const fileName = `${Date.now()}.webp`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('prompt-images')
          .upload(filePath, webpFile, { contentType: 'image/webp' });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('prompt-images')
          .getPublicUrl(filePath);
        finalImageUrl = publicUrl;
      }

      const payload = {
        title: adminForm.title,
        description: adminForm.description,
        model: adminForm.model,
        category: adminForm.category,
        tags: adminForm.tags,
        image_url: finalImageUrl
      };

      if (editingId) {
        const { error } = await supabase.from('prompts').update(payload).eq('id', editingId);
        if (error) throw error;
        alert("Berhasil diperbarui!");
      } else {
        const { error } = await supabase.from('prompts').insert([payload]);
        if (error) throw error;
        alert("Berhasil ditambahkan!");
      }

      cancelEditing();
      fetchPrompts();
    } catch (error) {
      alert("Gagal: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // --- LOGIKA: DELETE ---
  const handleDelete = async (id) => {
    if (!confirm("Hapus permanen? Tindakan ini tidak dapat dibatalkan.")) return;
    const { error } = await supabase.from('prompts').delete().eq('id', id);
    if (!error) fetchPrompts();
    else alert("Gagal menghapus: " + error.message);
  };

  // --- FILTER PROMPTS ---
  const filteredPrompts = prompts.filter(p => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCat && matchesSearch;
  });

  // --- GUARD: ENV TIDAK ADA ---
  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-200 flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-[#1e293b] p-10 rounded-[2.5rem] border border-slate-700 shadow-2xl">
          <Lock size={48} className="mx-auto text-yellow-500 mb-6" />
          <h2 className="text-2xl font-bold mb-2 text-white">Database Terputus</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Pastikan file <code className="text-cyan-400">.env.local</code> sudah berisi{' '}
            <code className="text-cyan-400">NEXT_PUBLIC_SUPABASE_URL</code> dan{' '}
            <code className="text-cyan-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER UTAMA
  // ============================================================
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-cyan-500/30">

      {/* NAVBAR */}
      <nav className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('gallery')}>
            <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center overflow-hidden border border-slate-700">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-serif text-xl font-bold text-slate-100">
              Prompt<span className="text-cyan-400">Vault</span>
            </span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'gallery' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <LayoutGrid size={16} /> Galeri
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'admin' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {isAdminLoggedIn ? <><Settings size={16} /> Dashboard</> : <><LogIn size={16} /> Admin</>}
            </button>
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/* TAB: GALLERY                                                  */}
      {/* ============================================================ */}
      {activeTab === 'gallery' ? (
        <div className="max-w-screen-2xl mx-auto p-6 md:p-10">
          <header className="mb-10">
            <h1 className="text-4xl md:text-5xl font-serif text-slate-100 mb-2 leading-tight">
              AI Prompt <span className="text-cyan-400 italic">Gallery</span>
            </h1>
            <p className="text-slate-400 text-lg opacity-80">
              Koleksi prompt visual terbaik untuk proyek kreasi AI Anda.
            </p>
          </header>

          {/* SEARCH & FILTER */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-grow relative group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors"
                size={20}
              />
              <input
                type="text"
                placeholder="Cari judul, tag, atau kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e293b] border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-slate-200 outline-none focus:border-cyan-500 transition-all shadow-lg hover:border-slate-600"
              />
            </div>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full md:w-52 bg-[#1e293b] border border-slate-700 rounded-2xl px-6 py-4 outline-none cursor-pointer appearance-none hover:border-cyan-500/50 transition-colors text-slate-200"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Filter size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* STATS */}
          <div className="mb-6 text-xs text-slate-600 font-bold uppercase tracking-widest">
            {isLoading ? 'Memuat...' : `${filteredPrompts.length} prompt ditemukan`}
          </div>

          {/* LOADING */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-12 h-12 border-4 border-slate-700 border-t-cyan-400 rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium animate-pulse tracking-wide">Sinkronisasi data Supabase...</p>
            </div>
          ) : (
            <>
              {/*
                GRID GALERI:
                - Mobile (< sm): 2 kolom
                - Tablet (sm): 3 kolom
                - Desktop (lg): 4 kolom  ← default utama
                - Layar besar (xl): 5 kolom
                - Layar sangat besar (2xl): 6 kolom
                Otomatis menyesuaikan lebar layar.
              */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5">
                {filteredPrompts.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#162032] rounded-[1.25rem] border border-slate-800/80 overflow-hidden group hover:border-cyan-500/40 transition-all duration-500 shadow-lg hover:shadow-cyan-500/10 flex flex-col"
                  >
                    {/* GAMBAR */}
                    <div className="relative aspect-[3/4] bg-slate-900 overflow-hidden flex-shrink-0">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />

                      {/* BADGE KATEGORI */}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[8px] font-black text-cyan-400 border border-cyan-400/20 uppercase tracking-[0.15em]">
                          {item.category}
                        </span>
                      </div>

                      {/* OVERLAY HOVER — TAGS */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/95 via-[#0f172a]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 gap-1.5">
                        <p className="text-[9px] text-slate-300 line-clamp-3 leading-relaxed italic">
                          "{item.description}"
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags?.slice(0, 3).map(t => (
                            <span key={t} className="text-[7px] text-cyan-300/80 bg-cyan-900/60 px-1.5 py-0.5 rounded font-bold">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* INFO CARD */}
                    <div className="p-3.5 flex flex-col flex-grow gap-2.5">
                      <h3 className="font-serif text-xs text-slate-100 leading-tight tracking-tight line-clamp-2 flex-grow">
                        {item.title}
                      </h3>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.description);
                          setCopiedId(item.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black transition-all duration-300 ${
                          copiedId === item.id
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                            : 'bg-slate-100 hover:bg-white text-slate-900 shadow-md'
                        }`}
                      >
                        {copiedId === item.id
                          ? <><Check size={11} /> TERSALIN</>
                          : <><Copy size={11} /> SALIN PROMPT</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* EMPTY STATE */}
              {filteredPrompts.length === 0 && (
                <div className="py-20 text-center bg-[#1e293b]/30 rounded-[3rem] border border-slate-800 border-dashed mt-4">
                  <ImageIcon size={48} className="mx-auto text-slate-700 mb-4 opacity-30" />
                  <p className="text-slate-500 italic font-serif text-lg">
                    {searchQuery || selectedCategory !== 'All'
                      ? 'Tidak ada hasil yang cocok.'
                      : 'Belum ada koleksi yang dipublikasikan.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

      ) : (
        /* ============================================================ */
        /* TAB: ADMIN PANEL                                              */
        /* ============================================================ */
        <div className="max-w-7xl mx-auto p-6">

          {/* LOGIN FORM */}
          {!isAdminLoggedIn ? (
            <div className="max-w-md mx-auto mt-20 bg-[#1e293b] p-10 rounded-[2.5rem] border border-slate-700 shadow-2xl">
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyan-500/20">
                  <Lock className="text-cyan-400" size={36} />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 leading-none">Akses Admin</h2>
                <p className="text-slate-500 text-sm mt-2">Masukkan kunci keamanan dashboard.</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-6">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  className={`w-full bg-[#0f172a] border ${loginError ? 'border-red-500 animate-pulse' : 'border-slate-700'} rounded-2xl py-5 px-6 outline-none focus:border-cyan-500 transition-all text-center text-3xl tracking-[0.3em] font-mono shadow-inner`}
                />
                {loginError && (
                  <p className="text-red-500 text-[10px] text-center font-black uppercase tracking-widest">
                    Akses Ditolak — Password Salah
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-cyan-900/40 transition-all transform active:scale-95"
                >
                  Buka Dashboard
                </button>
              </form>
            </div>

          ) : (
            /* DASHBOARD */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

              {/* KOLOM KIRI */}
              <div className="lg:col-span-1 space-y-6">

                {/* PANEL KEAMANAN */}
                <div className="bg-[#1e293b] p-6 rounded-[2rem] border border-slate-700 shadow-xl">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <KeyRound size={14} /> Keamanan Dashboard
                  </h3>
                  {isChangingPass ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Password baru (min. 6 karakter)..."
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-sm outline-none focus:border-cyan-500 transition-all"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleChangePassword}
                          className="flex-grow bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-xl text-xs font-black text-white transition-all"
                        >
                          Simpan Password
                        </button>
                        <button
                          onClick={() => { setIsChangingPass(false); setNewPassword(''); }}
                          className="bg-slate-700 hover:bg-slate-600 px-4 py-2.5 rounded-xl text-xs font-black transition-all"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsChangingPass(true)}
                      className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3 rounded-xl text-xs font-bold transition-all"
                    >
                      Ganti Password Dashboard
                    </button>
                  )}
                </div>

                {/* FORM EDITOR */}
                <form onSubmit={handleSubmitAdminForm} className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700 space-y-6 sticky top-24 shadow-2xl">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-cyan-400">
                      {editingId ? <><Edit2 size={24} /> Edit Prompt</> : <><Plus size={24} /> New Post</>}
                    </h2>
                    {editingId && (
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="text-[10px] text-slate-500 hover:text-white underline font-black uppercase tracking-widest"
                      >
                        Batal
                      </button>
                    )}
                  </div>

                  {/* JUDUL */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Judul Gambar</label>
                    <input
                      type="text"
                      value={adminForm.title}
                      onChange={e => setAdminForm({ ...adminForm, title: e.target.value })}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-4 text-sm outline-none focus:border-cyan-500 transition-all"
                      placeholder="Contoh: Portrait of a Warrior"
                    />
                  </div>

                  {/* FILE GAMBAR + PREVIEW */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                      File Gambar {editingId && '(Opsional)'}
                      <span className="text-cyan-600 normal-case font-normal ml-1">— auto convert ke WebP</span>
                    </label>
                    <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-slate-700 rounded-[2rem] cursor-pointer hover:bg-slate-800/30 transition-all group overflow-hidden relative">
                      {previewUrl ? (
                        <>
                          <img src={previewUrl} className="absolute inset-0 w-full h-full object-cover" alt="preview" />
                          <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-2">
                            <Check className="text-emerald-400" size={24} />
                            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Siap → Auto WebP ✓</span>
                            <span className="text-[9px] text-slate-300 max-w-[80%] truncate text-center">{selectedFile?.name}</span>
                          </div>
                        </>
                      ) : editingId && currentImageUrl ? (
                        <>
                          <img src={currentImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-25 grayscale" alt="current" />
                          <div className="relative z-10 text-center">
                            <ImageIcon className="mx-auto text-slate-500 mb-1" size={20} />
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Klik untuk ganti gambar</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center pointer-events-none">
                          <Upload className="mx-auto text-slate-600 mb-2 group-hover:text-cyan-500/50 transition-colors" size={28} />
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pilih JPG / PNG / WebP</span>
                          <p className="text-[9px] text-slate-700 mt-1">Otomatis dikonversi ke WebP</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>

                  {/* KATEGORI */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Kategori</label>
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(!isAddingCategory)}
                        className="text-[10px] text-cyan-500 font-black hover:underline uppercase tracking-widest"
                      >
                        {isAddingCategory ? 'Batal' : '+ Kategori Baru'}
                      </button>
                    </div>
                    {isAddingCategory ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCatInput}
                          onChange={e => setNewCatInput(e.target.value)}
                          className="flex-grow bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-sm outline-none focus:border-cyan-500 shadow-inner"
                          placeholder="Nama kategori..."
                        />
                        <button type="button" onClick={handleAddCategory} className="bg-cyan-600 px-4 rounded-xl text-xs font-black text-white">OK</button>
                      </div>
                    ) : (
                      <select
                        value={adminForm.category}
                        onChange={e => setAdminForm({ ...adminForm, category: e.target.value })}
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-4 text-sm outline-none cursor-pointer hover:border-cyan-500/30 transition-colors text-slate-200"
                      >
                        {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                  </div>

                  {/* TAGS */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                      Tags
                      <span className="text-cyan-700 normal-case font-normal ml-1">— auto dari prompt + manual</span>
                    </label>
                    <div className="min-h-[70px] bg-[#0f172a] border border-slate-700 rounded-2xl p-3 flex flex-wrap gap-2 shadow-inner">
                      {adminForm.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 text-[10px] px-3 py-1.5 rounded-lg border border-cyan-500/20 font-black tracking-wide">
                          #{tag}
                          <X size={12} className="cursor-pointer hover:text-white transition-colors" onClick={() => removeTag(tag)} />
                        </span>
                      ))}
                      <input
                        type="text"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={addManualTag}
                        className="bg-transparent border-none outline-none text-xs text-slate-300 flex-grow min-w-[100px]"
                        placeholder="Ketik tag & Enter..."
                      />
                    </div>
                  </div>

                  {/* PROMPT TEXT */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Teks Prompt</label>
                    <textarea
                      rows="5"
                      value={adminForm.description}
                      onChange={handleDescriptionChange}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-sm outline-none focus:border-cyan-500 resize-none leading-relaxed shadow-inner"
                      placeholder="Paste prompt AI — tag akan muncul otomatis..."
                    />
                  </div>

                  {/* SUBMIT */}
                  <button
                    disabled={isUploading}
                    type="submit"
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 disabled:opacity-50 transition-all shadow-xl shadow-cyan-900/30 uppercase tracking-widest text-xs"
                  >
                    {isUploading
                      ? "Mengkonversi & Mengupload..."
                      : editingId
                        ? <><Check size={22} /> Simpan Perubahan</>
                        : <><Upload size={22} /> Publikasikan</>}
                  </button>
                </form>
              </div>

              {/* KOLOM KANAN: Tabel Database */}
              <div className="lg:col-span-2 bg-[#1e293b] rounded-[2.5rem] border border-slate-700 p-10 shadow-2xl overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-8 px-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Katalog Prompts <span className="text-cyan-400">({prompts.length})</span>
                  </h2>
                  <button
                    onClick={() => { setIsAdminLoggedIn(false); cancelEditing(); }}
                    className="text-[10px] text-slate-500 hover:text-red-400 font-black uppercase tracking-[0.3em] bg-slate-800/50 px-5 py-2 rounded-full border border-slate-700/50 transition-all hover:bg-red-500/10"
                  >
                    Keluar
                  </button>
                </div>

                <div className="rounded-[2rem] border border-slate-800 overflow-auto shadow-2xl bg-[#0f172a]/40 flex-grow">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-800/90 text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]">
                      <tr>
                        <th className="p-5">Visual</th>
                        <th className="p-5">Detail Prompt</th>
                        <th className="p-5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {prompts.length > 0 ? prompts.map(p => (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition-all duration-300 group">
                          <td className="p-5">
                            <img
                              src={p.image_url}
                              alt={p.title}
                              className="w-16 h-16 object-cover rounded-2xl border-2 border-slate-800 shadow-xl transition-transform group-hover:scale-105"
                            />
                          </td>
                          <td className="p-5">
                            <p className="font-serif text-base text-slate-100 leading-none mb-2 tracking-tight group-hover:text-cyan-400 transition-colors line-clamp-1">
                              {p.title}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] text-cyan-500 font-black uppercase tracking-[0.2em] bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10">
                                {p.category}
                              </span>
                              {p.tags?.slice(0, 3).map(t => (
                                <span key={t} className="text-[9px] text-slate-600 italic">#{t}</span>
                              ))}
                            </div>
                          </td>
                          <td className="p-5 text-right">
                            <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEditing(p)}
                                className="p-3 bg-slate-800/80 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-xl transition-all"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="p-3 bg-slate-800/80 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                title="Hapus"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="3" className="p-24 text-center text-slate-700 font-serif italic text-xl">
                            Katalog masih kosong. Mulai publikasi data visual Anda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}