"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Copy, Maximize2, Check, Search, 
  Filter, Plus, Upload, Trash2, Settings, LogIn, LayoutGrid, Image as ImageIcon, X, Lock, Edit2
} from 'lucide-react';

/**
 * PENTING: Untuk keperluan pratinjau di sini, saya menggunakan import dari CDN.
 * Di proyek lokal VS Code Anda, Anda tetap bisa menggunakan:
 * import { createClient } from '@supabase/supabase-js';
 */
import { createClient } from '@supabase/supabase-js';

// --- KONFIGURASI ---
const ADMIN_PASSWORD = "admin123"; 
const DEFAULT_CATEGORIES = ['All', 'Couple', 'Man', 'Woman', 'Vacation', 'Photoshoot', 'Selfie'];
const AUTO_TAG_KEYWORDS = ['neon', 'cyberpunk', 'studio', 'beach', 'sunset', 'minimalist', 'fashion', 'dark', 'bright', 'vintage', 'car', 'night', 'sunlight', 'cinematic', 'portrait', 'realistic', 'anime', '3d'];

// Inisialisasi Supabase menggunakan variabel lingkungan dari .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [prompts, setPrompts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeTab, setActiveTab] = useState('gallery'); 
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Status Login
  const [passInput, setPassInput] = useState('');
  const [loginError, setLoginError] = useState(false);

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
  const [isUploading, setIsUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // 1. MENGAMBIL DATA DARI SUPABASE
  useEffect(() => {
    if (supabaseUrl && supabaseAnonKey) {
      fetchPrompts();
    }
  }, []);

  // Sinkronisasi kategori secara dinamis
  useEffect(() => {
    if (prompts.length > 0) {
      const dbCategories = [...new Set(prompts.map(p => p.category))];
      const merged = [...new Set([...DEFAULT_CATEGORIES, ...dbCategories])];
      setCategories(merged);
    }
  }, [prompts]);

  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Gagal mengambil data:', error);
      } else {
        setPrompts(data || []);
      }
    } catch (err) {
      console.error('Kesalahan koneksi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- LOGIKA: LOGIN ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (passInput === ADMIN_PASSWORD) {
      setIsAdminLoggedIn(true);
      setLoginError(false);
    } else {
      setLoginError(true);
      setPassInput('');
    }
  };

  // --- LOGIKA: TAGS & AUTO-TAGGING ---
  const handleDescriptionChange = (e) => {
    const text = e.target.value;
    setAdminForm(prev => {
      const textLower = text.toLowerCase();
      const foundAutoTags = AUTO_TAG_KEYWORDS.filter(kw => textLower.includes(kw));
      const currentTags = prev.tags || [];
      const updatedTags = Array.from(new Set([...currentTags, ...foundAutoTags]));
      
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

  // --- LOGIKA: KATEGORI BARU ---
  const handleAddCategory = () => {
    if (newCatInput.trim()) {
      const cat = newCatInput.trim();
      if (!categories.includes(cat)) {
        setCategories([...categories, cat]);
      }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setAdminForm({ title: '', model: 'Gemini Nano Banana', category: 'Woman', description: '', tags: [] });
    setCurrentImageUrl('');
    setSelectedFile(null);
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
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('prompt-images')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('prompt-images')
          .getPublicUrl(filePath);
        
        finalImageUrl = publicUrl;
      }

      if (editingId) {
        const { error: dbError } = await supabase
          .from('prompts')
          .update({
            title: adminForm.title,
            description: adminForm.description,
            model: adminForm.model,
            category: adminForm.category,
            tags: adminForm.tags,
            image_url: finalImageUrl
          })
          .eq('id', editingId);

        if (dbError) throw dbError;
        alert("Berhasil diperbarui!");
      } else {
        const { error: dbError } = await supabase
          .from('prompts')
          .insert([{
            title: adminForm.title,
            description: adminForm.description,
            model: adminForm.model,
            category: adminForm.category,
            tags: adminForm.tags,
            image_url: finalImageUrl
          }]);

        if (dbError) throw dbError;
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

  const handleDelete = async (id) => {
    if (!confirm("Hapus permanen?")) return;
    const { error } = await supabase.from('prompts').delete().eq('id', id);
    if (!error) fetchPrompts();
  };

  const renderNavbar = () => (
    <nav className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center overflow-hidden border border-slate-700">
             <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-serif text-xl font-bold text-slate-100">
            Prompt<span className="text-cyan-400">Vault</span>
          </span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('gallery')} className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'gallery' ? 'text-cyan-400' : 'text-slate-400'}`}>
            <LayoutGrid size={16} /> Galeri
          </button>
          <button onClick={() => setActiveTab('admin')} className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'admin' ? 'text-cyan-400' : 'text-slate-400'}`}>
            {isAdminLoggedIn ? <><Settings size={16} /> Dashboard</> : <><LogIn size={16} /> Admin</>}
          </button>
        </div>
      </div>
    </nav>
  );

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-200 flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-[#1e293b] p-10 rounded-[2.5rem] border border-slate-700 shadow-2xl">
          <Lock size={48} className="mx-auto text-yellow-500 mb-6" />
          <h2 className="text-2xl font-bold mb-2 text-white">Database Terputus</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">Harap pastikan file <code className="text-cyan-400">.env.local</code> Anda sudah berisi URL dan API Key yang benar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-cyan-500/30">
      {renderNavbar()}

      {activeTab === 'gallery' ? (
        <div className="max-w-7xl mx-auto p-6">
          <header className="mb-10 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-serif text-slate-100 mb-2 leading-tight">AI Prompt <span className="text-cyan-400 italic">Gallery</span></h1>
            <p className="text-slate-400 text-lg opacity-80 leading-relaxed">Koleksi prompt visual terbaik untuk proyek kreasi AI Anda.</p>
          </header>

          <div className="flex flex-col md:flex-row gap-4 mb-12">
            <div className="flex-grow relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
              <input 
                type="text" placeholder="Cari judul, tag, atau kategori..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e293b] border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-slate-200 outline-none focus:border-cyan-500 transition-all shadow-lg hover:border-slate-600"
              />
            </div>
            <div className="relative">
              <select 
                value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full md:w-48 bg-[#1e293b] border border-slate-700 rounded-2xl px-6 py-4 outline-none cursor-pointer appearance-none hover:border-cyan-500/50 transition-colors"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Filter size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-12 h-12 border-4 border-slate-700 border-t-cyan-400 rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium animate-pulse tracking-wide">Sinkronisasi data Supabase...</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8">
              {prompts.filter(p => {
                const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
                const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                     p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                     (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
                return matchesCat && matchesSearch;
              }).map((item) => (
                <div key={item.id} className="break-inside-avoid bg-[#162032] rounded-[2.5rem] border border-slate-800 overflow-hidden group hover:border-cyan-500/40 transition-all duration-500 shadow-xl hover:shadow-cyan-500/10">
                  <div className="relative aspect-[3/4] bg-slate-900 overflow-hidden">
                    <img src={item.image_url} alt={item.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute top-5 left-5">
                      <span className="bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-cyan-400 border border-cyan-400/20 uppercase tracking-[0.2em]">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="font-serif text-2xl text-slate-100 mb-2 leading-tight tracking-tight">{item.title}</h3>
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {item.tags?.map(t => (
                        <span key={t} className="text-[10px] text-slate-500 bg-slate-800/50 px-2.5 py-1 rounded-md border border-slate-700/30 font-bold">#{t}</span>
                      ))}
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-3 mb-8 leading-relaxed italic opacity-80">"{item.description}"</p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(item.description);
                        setCopiedId(item.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className={`w-full flex items-center justify-center gap-3 py-4 rounded-[1.25rem] text-sm font-bold transition-all duration-300 ${
                        copiedId === item.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-slate-100 hover:bg-white text-slate-900 shadow-lg shadow-white/5'
                      }`}
                    >
                      {copiedId === item.id ? <><Check size={18} /> TERSALIN</> : <><Copy size={18} /> SALIN PROMPT</>}
                    </button>
                  </div>
                </div>
              ))}
              {!isLoading && prompts.length === 0 && (
                 <div className="col-span-full py-20 text-center bg-[#1e293b]/30 rounded-[3rem] border border-slate-800 border-dashed">
                    <ImageIcon size={48} className="mx-auto text-slate-700 mb-4 opacity-30" />
                    <p className="text-slate-500 italic font-serif text-lg">Belum ada koleksi yang dipublikasikan.</p>
                 </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* PANEL ADMIN */
        <div className="max-w-7xl mx-auto p-6">
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
                   className={`w-full bg-[#0f172a] border ${loginError ? 'border-red-500 animate-shake' : 'border-slate-700'} rounded-2xl py-5 px-6 outline-none focus:border-cyan-500 transition-all text-center text-3xl tracking-[0.3em] font-mono shadow-inner`}
                 />
                 {loginError && <p className="text-red-500 text-[10px] text-center font-black uppercase tracking-widest animate-bounce">Akses Ditolak</p>}
                 <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-cyan-900/40 transition-all transform active:scale-95">
                   Buka Dashboard
                 </button>
               </form>
             </div>
           ) : (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Form Editor */}
                <div className="lg:col-span-1">
                  <form onSubmit={handleSubmitAdminForm} className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700 space-y-6 sticky top-24 shadow-2xl">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                       <h2 className="text-2xl font-bold flex items-center gap-2 text-cyan-400">
                         {editingId ? <><Edit2 size={24} /> Edit Prompt</> : <><Plus size={24} /> New Post</>}
                       </h2>
                       {editingId && (
                         <button type="button" onClick={cancelEditing} className="text-[10px] text-slate-500 hover:text-white underline font-black uppercase tracking-widest">Batal</button>
                       )}
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Judul Gambar</label>
                      <input type="text" value={adminForm.title} onChange={e => setAdminForm({...adminForm, title: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-4 text-sm outline-none focus:border-cyan-500 transition-all" placeholder="Contoh: Portrait of a Warrior" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">File Gambar {editingId && '(Opsional)'}</label>
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-700 rounded-[2rem] cursor-pointer hover:bg-slate-800/50 transition-all group">
                        {selectedFile ? (
                          <div className="text-center px-4">
                            <Check className="mx-auto text-emerald-400 mb-2" />
                            <span className="text-cyan-400 text-[10px] font-black truncate block uppercase">{selectedFile.name}</span>
                          </div>
                        ) : editingId ? (
                          <div className="text-center">
                            <img src={currentImageUrl} className="w-12 h-12 object-cover mx-auto rounded-lg mb-2 opacity-40 border border-slate-700 grayscale" />
                            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Ganti Gambar...</span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="mx-auto text-slate-600 mb-2 group-hover:text-cyan-500/50 transition-colors" />
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pilih WebP/PNG...</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={e => setSelectedFile(e.target.files[0])} />
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Kategori</label>
                        <button type="button" onClick={() => setIsAddingCategory(!isAddingCategory)} className="text-[10px] text-cyan-500 font-black hover:underline uppercase tracking-widest">
                          {isAddingCategory ? 'Batal' : '+ Kategori Baru'}
                        </button>
                      </div>
                      
                      {isAddingCategory ? (
                        <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                           <input type="text" value={newCatInput} onChange={e => setNewCatInput(e.target.value)} className="flex-grow bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-sm outline-none focus:border-cyan-500 shadow-inner" placeholder="Nama..." />
                           <button type="button" onClick={handleAddCategory} className="bg-cyan-600 px-4 rounded-xl text-xs font-black text-white">OK</button>
                        </div>
                      ) : (
                        <select value={adminForm.category} onChange={e => setAdminForm({...adminForm, category: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-4 text-sm outline-none cursor-pointer hover:border-cyan-500/30 transition-colors">
                          {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Tags (Auto & Manual)</label>
                      <div className="min-h-[70px] bg-[#0f172a] border border-slate-700 rounded-2xl p-3 flex flex-wrap gap-2 shadow-inner">
                        {adminForm.tags.map(tag => (
                          <span key={tag} className="flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 text-[10px] px-3 py-1.5 rounded-lg border border-cyan-500/20 font-black tracking-wide">
                            #{tag}
                            <X size={12} className="cursor-pointer hover:text-white transition-colors" onClick={() => removeTag(tag)} />
                          </span>
                        ))}
                        <input 
                          type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addManualTag}
                          className="bg-transparent border-none outline-none text-xs text-slate-300 flex-grow min-w-[100px]" 
                          placeholder="Type & Enter..."
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Teks Prompt</label>
                      <textarea rows="5" value={adminForm.description} onChange={handleDescriptionChange} className="w-full bg-[#0f172a] border border-slate-700 rounded-2xl p-4 text-sm outline-none focus:border-cyan-500 resize-none leading-relaxed shadow-inner" placeholder="Paste prompt AI..." />
                    </div>

                    <button disabled={isUploading} type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 disabled:opacity-50 transition-all shadow-xl shadow-cyan-900/30 uppercase tracking-widest text-xs">
                      {isUploading ? "Memproses..." : editingId ? <><Check size={22} /> Simpan Perubahan</> : <><Upload size={22} /> Publikasikan</>}
                    </button>
                  </form>
                </div>

                {/* Database Table */}
                <div className="lg:col-span-2 bg-[#1e293b] rounded-[2.5rem] border border-slate-700 p-10 shadow-2xl overflow-hidden flex flex-col">
                   <div className="flex justify-between items-center mb-8 px-2">
                      <h2 className="text-2xl font-bold text-white tracking-tight">Katalog Prompts ({prompts.length})</h2>
                      <button onClick={() => setIsAdminLoggedIn(false)} className="text-[10px] text-slate-500 hover:text-red-400 font-black uppercase tracking-[0.3em] bg-slate-800/50 px-5 py-2 rounded-full border border-slate-700/50 transition-all hover:bg-red-500/10">Keluar</button>
                   </div>
                   
                   <div className="rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl bg-[#0f172a]/40 flex-grow">
                     <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-800/90 text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]">
                          <tr>
                            <th className="p-6">Visual</th>
                            <th className="p-6">Detail Prompt</th>
                            <th className="p-6 text-right">Manajemen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {prompts.length > 0 ? prompts.map(p => (
                            <tr key={p.id} className="hover:bg-slate-800/30 transition-all duration-300 group">
                              <td className="p-6">
                                <img src={p.image_url} className="w-20 h-20 object-cover rounded-3xl border-2 border-slate-800 shadow-xl transition-transform group-hover:scale-105" />
                              </td>
                              <td className="p-6">
                                <p className="font-serif text-xl text-slate-100 leading-none mb-2 tracking-tight group-hover:text-cyan-400 transition-colors">{p.title}</p>
                                <div className="flex items-center gap-3">
                                   <span className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.2em] bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10">{p.category}</span>
                                   <div className="flex gap-1.5">
                                      {p.tags?.slice(0, 3).map(t => <span key={t} className="text-[9px] text-slate-600 italic">#{t}</span>)}
                                   </div>
                                </div>
                              </td>
                              <td className="p-6 text-right">
                                <div className="flex justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => startEditing(p)} className="p-3.5 bg-slate-800/80 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-2xl transition-all shadow-md">
                                    <Edit2 size={20} />
                                  </button>
                                  <button onClick={() => handleDelete(p.id)} className="p-3.5 bg-slate-800/80 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all shadow-md">
                                    <Trash2 size={20} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )) : (
                            <tr><td colSpan="3" className="p-24 text-center text-slate-700 font-serif italic text-xl">Katalog masih kosong. Mulai publikasi data visual Anda.</td></tr>
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