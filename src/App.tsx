import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Camera, 
  Upload, 
  Copy, 
  Check, 
  RefreshCw, 
  Image as ImageIcon,
  ArrowRight,
  Sparkles,
  Info,
  Palette,
  Settings2,
  Layers,
  User,
  Sliders,
  Link,
  Plus,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { generatePromptFromImage } from './services/geminiService';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [prompt, setPrompt] = useState<string | null>(null);
  const [displayedPrompt, setDisplayedPrompt] = useState<string>('');
  const [analysis, setAnalysis] = useState<{
    subject: string;
    environment: string;
    lighting: string;
    composition: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New states for style and detail
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['Original']);
  const [customStyle, setCustomStyle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [complexity, setComplexity] = useState(7);
  const [backgroundDetail, setBackgroundDetail] = useState(5);
  const [subjectDetail, setSubjectDetail] = useState(8);
  const [focusMode, setFocusMode] = useState<'General' | 'UI/UX'>('General');

  const predefinedStyles = [
    { name: 'Original', seed: 'photography', color: 'bg-zinc-500' },
    { name: 'Cyberpunk', seed: 'neon-city', color: 'bg-fuchsia-500' },
    { name: 'Studio Ghibli', seed: 'anime-landscape', color: 'bg-emerald-500' },
    { name: 'Oil Painting', seed: 'oil-painting', color: 'bg-amber-700' },
    { name: 'Minimalist', seed: 'minimal-architecture', color: 'bg-stone-300' },
    { name: 'Vaporwave', seed: 'retro-synth', color: 'bg-pink-400' },
    { name: 'Renaissance', seed: 'classical-art', color: 'bg-orange-800' },
    { name: 'Pixel Art', seed: 'pixel-art', color: 'bg-blue-500' },
    { name: 'Cinematic Noir', seed: 'film-noir', color: 'bg-zinc-900' },
    { name: 'Surrealism', seed: 'surreal-art', color: 'bg-indigo-600' },
    { name: 'Art Nouveau', seed: 'art-nouveau', color: 'bg-lime-700' },
    { name: 'Synthwave', seed: '80s-grid', color: 'bg-purple-600' },
    { name: 'Ukiyo-e', seed: 'japanese-woodblock', color: 'bg-red-700' },
    { name: 'Steampunk', seed: 'clockwork', color: 'bg-yellow-900' },
    { name: 'Bauhaus', seed: 'geometric-design', color: 'bg-red-600' },
    { name: 'Pop Art', seed: 'comic-art', color: 'bg-yellow-400' },
    { name: 'Fauvism', seed: 'vibrant-colors', color: 'bg-orange-500' },
    { name: 'Gothic', seed: 'dark-cathedral', color: 'bg-slate-900' },
    { name: 'Impressionism', seed: 'monet-garden', color: 'bg-blue-300' },
    { name: 'Cubism', seed: 'picasso-style', color: 'bg-stone-600' }
  ];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImage(result);
        const detectedMime = file.type || result.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
        setMimeType(detectedMime);
        setPrompt(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': []
    },
    multiple: false
  } as any);

  const handleUrlLoad = async () => {
    if (!imageUrl) return;
    setIsFetchingUrl(true);
    setError(null);
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setMimeType(blob.type);
        setPrompt(null);
        setError(null);
        setImageUrl('');
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error(err);
      setError("Could not load image from URL. Ensure it's a direct image link and CORS is allowed.");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const toggleStyle = (style: string) => {
    if (style === 'Original') {
      setSelectedStyles(['Original']);
      return;
    }
    
    setSelectedStyles(prev => {
      const filtered = prev.filter(s => s !== 'Original');
      if (filtered.includes(style)) {
        const next = filtered.filter(s => s !== style);
        return next.length === 0 ? ['Original'] : next;
      }
      return [...filtered, style];
    });
  };

  const addCustomStyle = () => {
    if (customStyle && !selectedStyles.includes(customStyle)) {
      setSelectedStyles(prev => {
        const filtered = prev.filter(s => s !== 'Original');
        return [...filtered, customStyle];
      });
      setCustomStyle('');
    }
  };

  const handleGenerate = async () => {
    if (!image) return;
    
    setIsGenerating(true);
    setError(null);
    setPrompt(null);
    setDisplayedPrompt('');
    
    try {
      const base64 = image.split(',')[1];
      const result = await generatePromptFromImage(base64, mimeType, {
        selectedStyles,
        complexity,
        backgroundDetail,
        subjectDetail,
        focusMode
      });
      
      const fullPrompt = result.prompt || "Failed to generate prompt.";
      setPrompt(fullPrompt);
      setAnalysis(result.analysis || null);

      // Typewriter effect
      let i = 0;
      const interval = setInterval(() => {
        setDisplayedPrompt(fullPrompt.slice(0, i));
        i++;
        if (i > fullPrompt.length) {
          clearInterval(interval);
        }
      }, 15);

    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (prompt) {
      navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reset = () => {
    setImage(null);
    setPrompt(null);
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink selection:bg-accent selection:text-bg scanline relative overflow-hidden">
      {/* Cyberpunk Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      
      {/* Header */}
      <header className="h-20 border-b border-accent/20 px-8 flex justify-between items-center backdrop-blur-xl bg-bg/60 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-accent/10 border border-accent flex items-center justify-center rounded-none shadow-[0_0_20px_rgba(0,243,255,0.4)] relative group">
            <div className="absolute -inset-1 bg-accent/20 blur-md group-hover:bg-accent/40 transition-all" />
            <Camera className="text-accent w-6 h-6 relative z-10" />
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-accent" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-accent" />
          </div>
          <div>
            <h1 className="text-lg font-display font-black tracking-[0.3em] uppercase text-accent drop-shadow-[0_0_8px_rgba(0,243,255,0.5)]">
              Prompt<span className="text-magenta">Lens</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[8px] font-mono text-magenta uppercase tracking-[0.2em] animate-pulse">Neural Link Established</span>
              <div className="h-px w-8 bg-magenta/30" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-10">
          <div className="hidden xl:flex items-center gap-8 text-[9px] font-mono uppercase tracking-[0.2em]">
            <div className="flex flex-col items-end">
              <span className="text-accent/60">Engine Status</span>
              <span className="text-accent">Operational</span>
            </div>
            <div className="w-px h-6 bg-line" />
            <div className="flex flex-col items-end">
              <span className="text-magenta/60">Core Version</span>
              <span className="text-magenta">3.1-PRO_EXT</span>
            </div>
          </div>
          <button className="p-3 border border-accent/20 hover:border-accent hover:bg-accent/10 transition-all group">
            <Settings2 className="w-4 h-4 text-accent opacity-60 group-hover:opacity-100" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
        {/* Left Sidebar: Controls */}
        <aside className="w-full lg:w-[420px] border-r border-accent/20 flex flex-col bg-surface/40 backdrop-blur-md overflow-y-auto custom-scrollbar">
          <div className="p-8 space-y-10">
            {/* Section 01: Input */}
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-4 bg-accent shadow-[0_0_10px_rgba(0,243,255,1)]" />
                  <h2 className="text-[11px] font-display font-bold uppercase tracking-[0.4em] text-accent">01_Source_Input</h2>
                </div>
                {image && (
                  <button onClick={reset} className="text-[9px] font-mono uppercase text-magenta hover:text-magenta/80 transition-colors flex items-center gap-2">
                    <X className="w-3 h-3" /> Purge
                  </button>
                )}
              </div>

              {!image ? (
                <div className="space-y-6">
                  <div 
                    {...getRootProps()} 
                    className={cn(
                      "aspect-video border border-accent/20 bg-accent/5 flex flex-col items-center justify-center p-8 transition-all cursor-pointer hover:bg-accent/10 hover:border-accent/50 group relative overflow-hidden",
                      isDragActive && "border-accent bg-accent/20 scale-[0.98]"
                    )}
                  >
                    <input {...getInputProps()} />
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-accent/40" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-accent/40" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-accent/40" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-accent/40" />
                    
                    <Upload className="w-8 h-8 text-accent opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-all mb-4" />
                    <p className="text-[10px] font-display font-bold uppercase tracking-widest mb-2 group-hover:text-accent transition-colors text-center">Inject Image Data</p>
                    <p className="text-[9px] text-ink-dim font-mono uppercase tracking-tighter">Drag_Drop // File_System</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-accent/10" />
                    <span className="text-[9px] font-mono uppercase text-accent/40 tracking-widest">OR_LINK</span>
                    <div className="h-px flex-1 bg-accent/10" />
                  </div>

                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-accent/40" />
                      <input 
                        type="text"
                        placeholder="DATA_STREAM_URL..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-accent/5 border border-accent/20 text-[10px] font-mono focus:outline-none focus:border-accent focus:bg-accent/10 transition-all text-accent placeholder:text-accent/20"
                      />
                    </div>
                    <button 
                      onClick={handleUrlLoad}
                      disabled={!imageUrl || isFetchingUrl}
                      className="px-6 bg-accent/10 border border-accent text-accent text-[10px] font-display font-bold uppercase tracking-widest disabled:opacity-20 hover:bg-accent hover:text-bg transition-all shadow-[0_0_15px_rgba(0,243,255,0.2)]"
                    >
                      {isFetchingUrl ? '...' : 'LOAD'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative group border border-accent/30 bg-accent/5 aspect-video flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,243,255,0.1)_0%,transparent_70%)]" />
                  <img src={image} alt="Preview" className="max-w-full max-h-full object-contain p-4 relative z-10" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-bg/80 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-md z-20">
                    <button {...getRootProps()} className="border border-magenta bg-magenta/10 text-magenta px-6 py-3 font-display font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-magenta hover:text-bg transition-all shadow-[0_0_20px_rgba(255,0,255,0.3)]">
                      <input {...getInputProps()} />
                      Re-Sync Data
                    </button>
                  </div>
                  <div className="absolute top-2 left-2 text-[8px] font-mono text-accent bg-accent/10 px-2 py-0.5 border border-accent/20">IMG_LOCKED</div>
                </div>
              )}
            </section>

            {/* Section 02: Focus */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-4 bg-magenta shadow-[0_0_10px_rgba(255,0,255,1)]" />
                <h2 className="text-[11px] font-display font-bold uppercase tracking-[0.4em] text-magenta">02_Analysis_Focus</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['General', 'UI/UX'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setFocusMode(mode)}
                    className={cn(
                      "py-4 px-4 text-[10px] font-display font-bold uppercase tracking-widest border transition-all flex flex-col items-center gap-3 relative overflow-hidden",
                      focusMode === mode 
                        ? "bg-magenta/10 border-magenta text-magenta shadow-[0_0_20px_rgba(255,0,255,0.2)]" 
                        : "border-accent/20 bg-accent/5 text-accent/40 hover:border-accent/50 hover:text-accent"
                    )}
                  >
                    {mode === 'General' ? <ImageIcon className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                    {mode}
                    {focusMode === mode && <div className="absolute top-0 right-0 w-2 h-2 bg-magenta" />}
                  </button>
                ))}
              </div>
            </section>

            {/* Section 03: Styles */}
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-4 bg-yellow shadow-[0_0_10px_rgba(243,255,0,1)]" />
                  <h2 className="text-[11px] font-display font-bold uppercase tracking-[0.4em] text-yellow">03_Style_Matrix</h2>
                </div>
                <span className="text-[9px] font-mono text-yellow/60 uppercase">[{selectedStyles.length}_ACTIVE]</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                {predefinedStyles.map(style => (
                  <button
                    key={style.name}
                    onClick={() => toggleStyle(style.name)}
                    className={cn(
                      "group relative flex flex-col items-start p-2 border transition-all duration-300 overflow-hidden",
                      selectedStyles.includes(style.name) 
                        ? "bg-yellow/10 border-yellow text-yellow shadow-[0_0_15px_rgba(243,255,0,0.2)] scale-[1.02]" 
                        : "border-accent/10 bg-accent/5 text-accent/40 hover:border-yellow hover:scale-[1.02] hover:text-yellow hover:shadow-[0_0_15px_rgba(243,255,0,0.2)]"
                    )}
                  >
                    <div className="w-full aspect-[4/3] overflow-hidden mb-3 relative border border-accent/10">
                      <div className={cn("absolute inset-0 opacity-10", style.color)} />
                      <img 
                        src={`https://picsum.photos/seed/${style.seed}/300/225`} 
                        alt={style.name}
                        className={cn(
                          "w-full h-full object-cover transition-transform duration-700 group-hover:scale-125", 
                          selectedStyles.includes(style.name) ? "opacity-70 grayscale-0" : "opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-80"
                        )}
                        referrerPolicy="no-referrer"
                      />
                      {selectedStyles.includes(style.name) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-yellow/20 backdrop-blur-[1px]">
                          <Check className="w-6 h-6 text-yellow drop-shadow-[0_0_10px_rgba(243,255,0,1)]" />
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-display font-black uppercase tracking-widest truncate w-full px-1">
                      {style.name}
                    </span>
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-accent/20" />
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <input 
                  type="text"
                  placeholder="CUSTOM_TAG..."
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomStyle()}
                  className="flex-1 px-4 py-3 bg-accent/5 border border-accent/20 text-[10px] font-mono focus:outline-none focus:border-yellow/50 transition-all text-yellow placeholder:text-yellow/20"
                />
                <button onClick={addCustomStyle} className="p-3 bg-yellow/10 border border-yellow/30 text-yellow hover:bg-yellow hover:text-bg transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {selectedStyles.filter(s => !predefinedStyles.some(ps => ps.name === s)).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedStyles.filter(s => !predefinedStyles.some(ps => ps.name === s)).map(tag => (
                    <span key={tag} className="flex items-center gap-2 px-3 py-1.5 bg-yellow/10 border border-yellow/30 text-[9px] font-mono uppercase text-yellow">
                      {tag}
                      <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => toggleStyle(tag)} />
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Section 04: Detail */}
            <section className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-1 h-4 bg-accent shadow-[0_0_10px_rgba(0,243,255,1)]" />
                <h2 className="text-[11px] font-display font-bold uppercase tracking-[0.4em] text-accent">04_Neural_Parameters</h2>
              </div>
              <div className="space-y-8">
                {[
                  { label: 'Complexity', value: complexity, setter: setComplexity, color: 'accent' },
                  { label: 'Background', value: backgroundDetail, setter: setBackgroundDetail, color: 'magenta' },
                  { label: 'Subject', value: subjectDetail, setter: setSubjectDetail, color: 'yellow' }
                ].map(param => (
                  <div key={param.label} className="space-y-3">
                    <div className="flex justify-between text-[9px] font-mono uppercase tracking-[0.2em]">
                      <span className="text-ink-dim">{param.label}_LEVEL</span>
                      <span className={`text-${param.color}`}>{param.value} // 10</span>
                    </div>
                    <div className="relative h-1.5 bg-white/5 overflow-hidden">
                      <input 
                        type="range" min="1" max="10" 
                        value={param.value} 
                        onChange={(e) => param.setter(parseInt(e.target.value))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                      />
                      <motion.div 
                        className={`h-full bg-${param.color} shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                        initial={false}
                        animate={{ width: `${(param.value / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="p-8 mt-auto border-t border-accent/20 bg-surface/60">
            <button
              disabled={!image || isGenerating}
              onClick={handleGenerate}
              className={cn(
                "w-full py-5 bg-accent text-bg font-display font-black text-xs uppercase tracking-[0.4em] transition-all relative group overflow-hidden",
                (!image || isGenerating) ? "opacity-20 cursor-not-allowed" : "hover:shadow-[0_0_30px_rgba(0,243,255,0.6)] active:scale-[0.98]"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {isGenerating ? (
                <div className="flex items-center justify-center gap-4">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>DECODING...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <Sparkles className="w-5 h-5" />
                  <span>SYNTHESIZE_PROMPT</span>
                </div>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content: Results */}
        <main className="flex-1 flex flex-col bg-bg relative overflow-hidden">
          {/* HUD Elements */}
          <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-accent/10 pointer-events-none" />
          <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-accent/10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-accent/10 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-accent/10 pointer-events-none" />

          <div className="flex-1 flex flex-col p-10 lg:p-16 relative z-10">
            <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col gap-12">
              {/* Analysis Dashboard */}
              <div className="space-y-8">
                <div className="flex items-center gap-6">
                  <h2 className="font-display font-black text-2xl lg:text-3xl uppercase tracking-tighter text-accent drop-shadow-[0_0_10px_rgba(0,243,255,0.3)]">
                    Neural_Analysis
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-accent/30 to-transparent" />
                  <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className="w-1 h-4 bg-accent/20" />)}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {analysis ? (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                    >
                      {[
                        { label: focusMode === 'UI/UX' ? 'Components' : 'Subject', value: analysis.subject, icon: User, color: 'accent' },
                        { label: focusMode === 'UI/UX' ? 'Layout' : 'Environment', value: analysis.environment, icon: ImageIcon, color: 'magenta' },
                        { label: focusMode === 'UI/UX' ? 'Design Style' : 'Lighting', value: analysis.lighting, icon: Palette, color: 'yellow' },
                        { label: focusMode === 'UI/UX' ? 'Hierarchy' : 'Composition', icon: Sliders, value: analysis.composition, color: 'accent' }
                      ].map((item, idx) => (
                        <div key={idx} className={`p-6 bg-surface/60 border border-${item.color}/20 relative group hover:border-${item.color} transition-all overflow-hidden hover:shadow-[0_0_20px_rgba(0,243,255,0.1)] active:skew-x-1`}>
                          <div className={`absolute top-0 left-0 w-1 h-full bg-${item.color}/40 group-hover:bg-${item.color} transition-colors`} />
                          <div className="flex items-center gap-3 mb-4">
                            <item.icon className={`w-4 h-4 text-${item.color} group-hover:animate-pulse`} />
                            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-ink-dim group-hover:text-ink transition-colors">{item.label}</p>
                          </div>
                          <p className="text-[11px] leading-relaxed font-bold tracking-wide group-hover:text-accent transition-colors">{item.value}</p>
                        </div>
                      ))}
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 opacity-10">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="h-32 border border-accent/20 border-dashed" />
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Prompt Output */}
              <div className="flex-1 flex flex-col gap-8">
                <div className="flex items-center gap-6">
                  <h2 className="font-display font-black text-2xl lg:text-3xl uppercase tracking-tighter text-magenta drop-shadow-[0_0_10px_rgba(255,0,255,0.3)]">
                    Synthesized_Prompt
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-magenta/30 to-transparent" />
                </div>

                <div className="flex-1 relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-magenta/30 via-accent/30 to-yellow/30 blur opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
                  <div className="relative h-full border border-accent/20 bg-surface/60 backdrop-blur-2xl p-10 lg:p-14 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    {/* HUD Corner Accents */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-magenta/40" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-magenta/40" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-magenta/40" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-magenta/40" />

                    <AnimatePresence mode="wait">
                      {prompt ? (
                        <motion.div
                          key="prompt"
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="h-full flex flex-col"
                        >
                          <div className="flex-1 font-mono text-sm lg:text-base leading-relaxed text-accent/90 overflow-y-auto pr-8 custom-scrollbar selection:bg-magenta selection:text-white">
                            <span className="text-magenta mr-2 font-black tracking-widest">{">"} DATA_START:</span>
                            {displayedPrompt}
                            <span className="text-magenta ml-2 font-black tracking-widest animate-pulse">_</span>
                          </div>
                          
                          <div className="mt-12 pt-10 border-t border-accent/10 flex flex-col sm:flex-row justify-between items-center gap-8">
                            <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.3em] text-accent/40">
                              <div className="w-2 h-2 bg-magenta shadow-[0_0_10px_rgba(255,0,255,1)]" />
                              OPTIMIZED_FOR_STABLE_DIFFUSION_v4.2
                            </div>
                            <button
                              onClick={copyToClipboard}
                              className={cn(
                                "flex items-center gap-4 px-10 py-4 transition-all text-[10px] font-display font-black uppercase tracking-[0.3em] border",
                                copied 
                                  ? "bg-magenta border-magenta text-white shadow-[0_0_20px_rgba(255,0,255,0.5)]" 
                                  : "bg-accent/5 border-accent/40 text-accent hover:bg-accent hover:text-bg hover:shadow-[0_0_20px_rgba(0,243,255,0.4)]"
                              )}
                            >
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              {copied ? 'COPIED_TO_CLIP' : 'COPY_DATA_STREAM'}
                            </button>
                          </div>
                        </motion.div>
                      ) : isGenerating ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-10">
                          <div className="relative w-32 h-32">
                            <div className="absolute inset-0 border-2 border-accent/10 rounded-full" />
                            <motion.div 
                              className="absolute inset-0 border-t-4 border-accent rounded-full shadow-[0_0_20px_rgba(0,243,255,0.5)]"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            />
                            <motion.div 
                              className="absolute inset-4 border-b-4 border-magenta rounded-full shadow-[0_0_20px_rgba(255,0,255,0.5)]"
                              animate={{ rotate: -360 }}
                              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                            />
                          </div>
                          <div className="text-center space-y-4">
                            <p className="text-[11px] font-display font-black uppercase tracking-[0.6em] text-accent animate-pulse">Deconstructing_Visual_Matrix</p>
                            <div className="flex justify-center gap-1">
                              {[1,2,3,4,5].map(i => (
                                <motion.div 
                                  key={i} 
                                  className="w-1 h-3 bg-magenta/40"
                                  animate={{ height: [12, 24, 12] }}
                                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-accent/10">
                          <Sparkles className="w-24 h-24 mb-8" />
                          <p className="text-sm font-display font-black uppercase tracking-[0.5em]">Awaiting_Neural_Input</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-magenta/10 border border-magenta/30 text-magenta text-[10px] font-mono uppercase tracking-[0.3em] text-center"
                  >
                    ERROR_STREAM: {error}
                  </motion.div>
                )}
              </div>

              {/* Stats Footer */}
              <div className="grid grid-cols-3 gap-8 pt-8 border-t border-accent/10">
                {[
                  { label: 'Neural_Engine', value: 'Gemini-3.1-PRO', color: 'accent' },
                  { label: 'Data_Fidelity', value: 'Ultra-High', color: 'magenta' },
                  { label: 'Sync_Latency', value: '2.4ms', color: 'yellow' }
                ].map((stat, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-ink-dim">{stat.label}</p>
                    <p className={`text-[11px] font-display font-black tracking-widest text-${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Global Footer */}
      <footer className="h-12 border-t border-accent/20 px-8 flex justify-between items-center text-[9px] font-mono uppercase tracking-[0.4em] text-accent/40 bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <span className="text-magenta font-black">PROMPTLENS_SYS</span>
          <div className="w-1 h-1 rounded-full bg-accent/40" />
          <span>© 2026 // NEURAL_LINK_ACTIVE</span>
        </div>
        <div className="flex gap-10">
          <span className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_rgba(0,243,255,1)] animate-pulse" /> 
            CORE_STATUS: STABLE
          </span>
          <span className="text-magenta">ENCRYPTED_DATA_STREAM</span>
        </div>
      </footer>
    </div>
  );
}
