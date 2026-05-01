"use client";

import React, { useState, useMemo } from 'react';
import { 
  Copy, Maximize2, Eye, Check, Search, 
  Filter, Plus, Upload, Trash2, Settings, LogIn, LayoutGrid
} from 'lucide-react';

// --- DATA DUMMY FINAL ---
// Menggunakan gambar lokal dari folder 'public' Next.js
const initialData = [
  {
    id: 1,
    title: 'Woman Golden Hour Photoshoot',
    model: 'GPT Imagen 2',
    date: '2026-05-01',
    category: 'Woman',
    tags: ['woman', 'photoshoot', 'golden hour', 'casual', 'sunlight'],
    description: 'A beautiful young woman in a casual black crop top and dark jeans, smiling naturally at the camera. Golden hour sunlight casting dramatic geometric shadows on a plain white wall behind her. High quality, realistic photoshoot, soft glowing skin.',
    imageUrl: '/woman-photoshoot.webp',
    aspectRatio: 'aspect-[4/5]'
  },
  {
    id: 2,
    title: 'Happy Couple Selfie at Night',
    model: 'Midjourney v6',
    date: '2026-05-01',
    category: 'Couple',
    tags: ['couple', 'night', 'selfie', 'smile', 'outdoor'],
    description: 'A close-up selfie of a happy couple outdoors at night. The man is smiling wearing a black and white striped shirt and a lanyard. The woman has long brown hair and a gentle smile. Warm blurred bokeh lights in the background from a cafe or pavilion.',
    imageUrl: '/couple.webp',
    aspectRatio: 'aspect-[3/4]'
  },
  {
    id: 3,
    title: 'Man with Black SUV',
    model: 'Gemini Nano Banana',
    date: '2026-05-01',
    category: 'Man',
    tags: ['man', 'car', 'outdoors', 'sunglasses', 'cool'],
    description: 'A cool man wearing black sunglasses, a black long-sleeve shirt, a wooden bead necklace, and olive green cargo pants. He is leaning confidently against the front of a shiny black SUV. Cloudy day near a pier or harbor with water in the background. Realistic, sharp focus.',
    imageUrl: '/man-car.webp',
    aspectRatio: 'aspect-[3/4]'
  }
];

// List Kategori Terbaru
const CATEGORIES = ['All', 'Couple', 'Man', 'Woman', 'Vacation', 'Photoshoot', 'Selfie'];
const AUTO_TAG_KEYWORDS = ['neon', 'cyberpunk', 'studio', 'beach', 'sunset', 'minimalist', 'fashion', 'dark', 'bright', 'vintage', 'car', 'night', 'sunlight'];

export default function App() {
  const [prompts, setPrompts] = useState(initialData);
  const [activeTab, setActiveTab] = useState('gallery'); 
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Gallery State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedId, setCopiedId] = useState(null);

  // Admin State
  const [adminForm, setAdminForm] = useState({
    title: '', model: 'Gemini Nano Banana', category: 'Woman', description: '', tags: [], imageUrl: ''
  });
  const [tagInput, setTagInput] = useState('');

  // --- LOGIC GALLERY ---
  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPrompts = useMemo(() => {
    return prompts.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchLower));
      
      return matchesCategory && matchesSearch;
    });
  }, [prompts, searchQuery, selectedCategory]);

  // --- LOGIC ADMIN ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    setIsAdminLoggedIn(true);
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setActiveTab('gallery');
  };

  const handleDescriptionChange = (e) => {
    const text = e.target.value;
    setAdminForm(prev => ({ ...prev, description: text }));
    const textLower = text.toLowerCase();
    const newAutoTags = AUTO_TAG_KEYWORDS.filter(keyword => textLower.includes(keyword));
    const combinedTags = new Set([...adminForm.tags, adminForm.category.toLowerCase(), ...newAutoTags]);
    setAdminForm(prev => ({ ...prev, tags: Array.from(combinedTags) }));
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!adminForm.tags.includes(tagInput.trim().toLowerCase())) {
        setAdminForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim().toLowerCase()] }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setAdminForm(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const handleDeletePrompt = (id) => {
    if(window.confirm("Apakah Anda yakin ingin menghapus prompt ini?")) {
       setPrompts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSubmitAdminForm = (e) => {
    e.preventDefault();
    if (!adminForm.title || !adminForm.description || !adminForm.imageUrl) {
      alert("Judul, Prompt, dan URL Gambar harus diisi!");
      return;
    }
    const newEntry = {
      ...adminForm,
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      aspectRatio: 'aspect-[3/4]', 
      tags: Array.from(new Set([...adminForm.tags, adminForm.category.toLowerCase()])) 
    };
    setPrompts([newEntry, ...prompts]);
    setAdminForm({ title: '', model: 'Gemini Nano Banana', category: 'Woman', description: '', tags: [], imageUrl: '' });
    alert("Prompt berhasil ditambahkan!");
  };

  // ==========================================
  // RENDER BLOCKS
  // ==========================================

  const renderNavbar = () => (
    <nav className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        
        {/* AREA LOGO */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center overflow-hidden border border-slate-700">
             <img src="/logo.png" alt="PromptVault Logo" className="w-full h-full object-cover" />
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
            <LayoutGrid size={16} /> Gallery
          </button>
          
          {isAdminLoggedIn ? (
            <>
              <button 
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'admin' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Settings size={16} /> Admin Panel
              </button>
              <button onClick={handleAdminLogout} className="text-sm font-medium text-red-400 hover:text-red-300 ml-4">
                Logout
              </button>
            </>
          ) : (
             <button 
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200`}
              >
                <LogIn size={16} /> Admin Login
              </button>
          )}
        </div>
      </div>
    </nav>
  );

  const renderGallery = () => (
    <div className="max-w-7xl mx-auto p-6">
      <header className="mb-8 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif text-slate-100 mb-3 tracking-wide">
          Discover <span className="text-cyan-400 italic font-light">Inspirations</span>
        </h1>
        <p className="text-slate-400">Search, filter, and copy high-quality AI image prompts.</p>
      </header>

      {/* Toolbar Pencarian & Filter */}
      <div className="bg-[#1e293b]/50 border border-slate-800 rounded-2xl p-4 mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Cari prompt, tags, atau style..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div className="w-full md:w-64 flex items-center bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3">
             <Filter className="text-slate-500 mr-2" size={18} />
             <select 
               value={selectedCategory}
               onChange={(e) => setSelectedCategory(e.target.value)}
               className="w-full bg-transparent text-slate-200 focus:outline-none appearance-none cursor-pointer"
             >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="bg-slate-800">{cat}</option>
                ))}
             </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {CATEGORIES.filter(c => c !== 'All').map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                selectedCategory === cat 
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              #{cat.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {filteredPrompts.length === 0 && (
         <div className="text-center py-20 text-slate-500">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p>Tidak ada prompt yang cocok dengan pencarian Anda.</p>
         </div>
      )}

      {/* Grid Galeri */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
        {filteredPrompts.map((item) => (
          <div key={item.id} className="break-inside-avoid bg-[#162032] rounded-2xl border border-slate-800 overflow-hidden shadow-lg group flex flex-col hover:border-slate-600 transition-all">
            
            <div className={`relative w-full ${item.aspectRatio} bg-slate-800 overflow-hidden`}>
              <img 
                src={item.imageUrl} 
                alt={item.title} 
                loading="lazy" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
               <div className="absolute top-2 left-2 flex gap-1 flex-wrap max-w-[80%]">
                 {item.tags.slice(0,2).map(tag => (
                    <span key={tag} className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white border border-white/10 uppercase tracking-wider">
                      {tag}
                    </span>
                 ))}
               </div>
            </div>
            
            <div className="p-4 flex flex-col flex-grow">
              <h3 className="font-serif text-lg text-slate-100 font-medium mb-1">{item.title}</h3>
              <p className="text-xs text-slate-500 mb-3">{item.model} • {item.date}</p>
              <p className="text-sm text-slate-400 line-clamp-3 mb-4 flex-grow">{item.description}</p>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleCopy(item.id, item.description)}
                  className={`flex-grow flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    copiedId === item.id 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                    : 'bg-cyan-600/90 hover:bg-cyan-500 text-white'
                  }`}
                >
                  {copiedId === item.id ? <><Check size={16} /> COPIED</> : <><Copy size={16} /> COPY</>}
                </button>
                <button className="flex-none p-2.5 bg-[#0f172a] hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition-colors">
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAdminLogin = () => (
    <div className="flex-grow flex items-center justify-center p-6">
      <form onSubmit={handleAdminLogin} className="bg-[#1e293b] p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <Settings size={48} className="mx-auto text-cyan-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-100">Admin Area</h2>
          <p className="text-slate-400 text-sm">Silakan login untuk mengelola prompt.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
            <input 
              type="password" placeholder="Password apa saja untuk testing" required
              className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3 text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-colors">
            Masuk ke Dashboard
          </button>
        </div>
      </form>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 p-6 sticky top-24">
          <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
            <Plus size={20} className="text-cyan-400" /> Tambah Prompt Baru
          </h2>
          
          <form onSubmit={handleSubmitAdminForm} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Judul Gambar</label>
              <input 
                type="text" required
                value={adminForm.title} onChange={e => setAdminForm({...adminForm, title: e.target.value})}
                className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Kategori</label>
                <select 
                  value={adminForm.category} onChange={e => setAdminForm({...adminForm, category: e.target.value})}
                  className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
                >
                  {CATEGORIES.filter(c=>c!=='All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Model AI</label>
                <select 
                  value={adminForm.model} onChange={e => setAdminForm({...adminForm, model: e.target.value})}
                  className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
                >
                  <option value="Gemini Nano Banana">Gemini Nano Banana</option>
                  <option value="GPT Imagen 2">GPT Imagen 2</option>
                  <option value="Midjourney v6">Midjourney v6</option>
                  <option value="Stable Diffusion 3">Stable Diffusion 3</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Teks Prompt</label>
              <textarea 
                required rows="4"
                value={adminForm.description} onChange={handleDescriptionChange}
                className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2 text-sm text-slate-200 focus:border-cyan-500 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Tags (Tekan Enter)</label>
              <div className="bg-[#0f172a] border border-slate-600 rounded-lg p-2 min-h-[42px] flex flex-wrap gap-2 items-center">
                {adminForm.tags.map(tag => (
                   <span key={tag} className="bg-slate-700 text-slate-200 text-xs px-2 py-1 rounded flex items-center gap-1">
                     {tag} <button type="button" onClick={() => handleRemoveTag(tag)} className="text-slate-400 hover:text-red-400">&times;</button>
                   </span>
                ))}
                <input 
                  type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag}
                  className="bg-transparent border-none outline-none text-sm text-slate-200 flex-grow min-w-[100px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">URL Gambar (Lokal/Web)</label>
              <input 
                type="text" required
                value={adminForm.imageUrl} onChange={e => setAdminForm({...adminForm, imageUrl: e.target.value})}
                className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2 text-sm text-slate-200 focus:border-cyan-500 outline-none"
                placeholder="/nama-file.webp atau https://..."
              />
            </div>

            <button type="submit" className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
              <Upload size={16} /> Simpan Data
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-slate-100 mb-6">Database Prompts ({prompts.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs uppercase bg-slate-800/50 text-slate-300">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Gambar</th>
                  <th className="px-4 py-3">Detail</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {prompts.map(item => (
                  <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="w-16 h-16 rounded overflow-hidden bg-slate-800">
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-200">{item.title}</p>
                      <p className="text-xs">{item.model}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-[200px]">{item.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-1 bg-cyan-900/50 text-cyan-400 text-[10px] rounded mb-1 uppercase">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                       <button onClick={() => handleDeletePrompt(item.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                         <Trash2 size={16} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-slate-200 font-sans">
      {renderNavbar()}
      <main className="flex-grow">
        {activeTab === 'gallery' && renderGallery()}
        {activeTab === 'admin' && !isAdminLoggedIn && renderAdminLogin()}
        {activeTab === 'admin' && isAdminLoggedIn && renderAdminDashboard()}
      </main>
    </div>
  );
}