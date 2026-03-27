import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, 
  Square, 
  Download, 
  Trash2, 
  History, 
  Search, 
  SortAsc, 
  SortDesc, 
  Calendar, 
  Tag,
  Clock,
  FileText,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Check,
  Plus,
  Save,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import Markdown from 'react-markdown';

// Types
interface Transcription {
  id: string;
  label: string;
  text: string;
  timestamp: number;
  duration: number;
}

type SortField = 'date' | 'label';
type SortOrder = 'asc' | 'desc';

export default function App() {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [history, setHistory] = useState<Transcription[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isSupported, setIsSupported] = useState(true);
  const [currentLabel, setCurrentLabel] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Refs
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setCurrentText(prev => (prev + ' ' + finalTranscript).trim());
      }
      setInterimText(interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Accès au microphone refusé. Veuillez autoriser le microphone dans les paramètres de votre navigateur.');
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      // Auto-restart if still recording (sometimes it stops unexpectedly)
      if (isRecording) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Failed to restart recognition:', e);
        }
      }
    };

    recognitionRef.current = recognition;

    // Load history
    const saved = localStorage.getItem('steno_history_v2');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, [isRecording]);

  // Save history
  useEffect(() => {
    localStorage.setItem('steno_history_v2', JSON.stringify(history));
  }, [history]);

  // Recording Logic
  const startRecording = () => {
    if (!recognitionRef.current) return;
    
    setCurrentText('');
    setInterimText('');
    setRecordingTime(0);
    setCurrentLabel('');
    setSelectedId(null);
    
    try {
      recognitionRef.current.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Failed to start recording:', e);
    }
  };

  const stopRecording = () => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.stop();
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Auto-save if there's text
    if (currentText.trim()) {
      saveToHistory();
    }
  };

  const saveToHistory = () => {
    if (!currentText.trim()) return;

    const newEntry: Transcription = {
      id: Date.now().toString(),
      label: currentLabel.trim() || `Enregistrement ${new Date().toLocaleString('fr-FR')}`,
      text: currentText.trim(),
      timestamp: Date.now(),
      duration: recordingTime
    };

    setHistory(prev => [newEntry, ...prev]);
    setSelectedId(newEntry.id);
  };

  const deleteEntry = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm('Voulez-vous vraiment supprimer cette retranscription ?')) {
      setHistory(prev => prev.filter(h => h.id !== id));
      if (selectedId === id) setSelectedId(null);
    }
  };

  const downloadEntry = (entry: Transcription, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const blob = new Blob([`Libellé: ${entry.label}\nDate: ${new Date(entry.timestamp).toLocaleString()}\nDurée: ${formatDuration(entry.duration)}\n\n${entry.text}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entry.label.replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter and Sort
  const processedHistory = useMemo(() => {
    let result = history.filter(h => 
      h.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.text.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      if (sortField === 'date') {
        return sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
      } else {
        return sortOrder === 'desc' 
          ? b.label.localeCompare(a.label) 
          : a.label.localeCompare(b.label);
      }
    });

    return result;
  }, [history, searchQuery, sortField, sortOrder]);

  const selectedEntry = useMemo(() => 
    history.find(h => h.id === selectedId), 
  [history, selectedId]);

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Navigateur non supporté</h1>
          <p className="text-slate-500 leading-relaxed">
            Désolé, votre navigateur ne supporte pas l'API de reconnaissance vocale. 
            Veuillez utiliser <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong> pour profiter de Sténo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest w-fit">
              <Mic className="w-3 h-3" />
              Enregistrement Vocal
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 uppercase italic">
              Sténo<span className="text-indigo-600">.</span>
            </h1>
            <p className="text-slate-400 font-medium tracking-tight">Retranscription intelligente en temps réel</p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all border",
                showHistory 
                  ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200" 
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              )}
            >
              <History className="w-5 h-5" />
              {showHistory ? "Fermer l'historique" : "Historique"}
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Recording & Current Transcript */}
          <div className={cn("lg:col-span-12 space-y-8 transition-all duration-500", showHistory ? "lg:col-span-7" : "lg:col-span-12")}>
            
            {/* Recording Card */}
            <section className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
              <div className="flex flex-col items-center text-center space-y-8">
                <div className="relative">
                  <AnimatePresence>
                    {isRecording && (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 0.1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 bg-rose-500 rounded-full"
                      />
                    )}
                  </AnimatePresence>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(
                      "relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center transition-all shadow-2xl",
                      isRecording 
                        ? "bg-rose-500 shadow-rose-200 text-white" 
                        : "bg-indigo-600 shadow-indigo-200 text-white"
                    )}
                  >
                    {isRecording ? <Square className="w-10 h-10 md:w-12 md:h-12 fill-current" /> : <Mic className="w-10 h-10 md:w-12 md:h-12" />}
                  </motion.button>
                </div>

                <div className="space-y-2">
                  <div className="text-4xl md:text-6xl font-black font-mono tracking-tighter text-slate-900">
                    {formatDuration(recordingTime)}
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                    {isRecording ? "Enregistrement en cours..." : "Prêt à enregistrer"}
                  </p>
                </div>

                {isRecording && (
                  <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <input 
                      type="text"
                      placeholder="Libellé de l'enregistrement..."
                      value={currentLabel}
                      onChange={(e) => setCurrentLabel(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-center font-bold text-slate-700"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Current Result Area */}
            <AnimatePresence>
              {(isRecording || currentText || selectedEntry) && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl border border-slate-100 space-y-6"
                >
                  <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black uppercase italic tracking-tight text-slate-900">
                          {selectedEntry ? selectedEntry.label : (currentLabel || "Nouvelle Retranscription")}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {selectedEntry ? new Date(selectedEntry.timestamp).toLocaleString() : "En direct"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedEntry && (
                        <>
                          <button 
                            onClick={() => downloadEntry(selectedEntry)}
                            className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900"
                            title="Télécharger"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => deleteEntry(selectedEntry.id)}
                            className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-rose-500"
                            title="Supprimer"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {!isRecording && currentText && !selectedEntry && (
                        <button 
                          onClick={saveToHistory}
                          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
                        >
                          <Save className="w-4 h-4" />
                          Enregistrer
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="min-h-[200px] relative">
                    <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-p:text-slate-700 prose-p:font-medium">
                      {selectedEntry ? (
                        <Markdown>{selectedEntry.text}</Markdown>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap">{currentText}</p>
                          <p className="text-slate-400 italic inline">{interimText}</p>
                          {isRecording && !currentText && !interimText && (
                            <div className="flex items-center gap-2 text-slate-300 animate-pulse">
                              <div className="w-2 h-2 bg-slate-300 rounded-full" />
                              <p>En attente de parole...</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: History */}
          <AnimatePresence>
            {showHistory && (
              <motion.aside
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="lg:col-span-5 space-y-6"
              >
                <div className="bg-white rounded-[40px] p-8 shadow-xl border border-slate-100 h-[calc(100vh-200px)] flex flex-col">
                  <div className="space-y-6 mb-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-black uppercase italic tracking-tight text-slate-900">Historique</h3>
                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl">
                        <button 
                          onClick={() => {
                            if (sortField === 'date') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                            else setSortField('date');
                          }}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            sortField === 'date' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600"
                          )}
                          title="Trier par date"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (sortField === 'label') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                            else setSortField('label');
                          }}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            sortField === 'label' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600"
                          )}
                          title="Trier par libellé"
                        >
                          <Tag className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 mx-1" />
                        <div className="p-2 text-slate-400">
                          {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {processedHistory.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                          <Search className="w-8 h-8" />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Aucun résultat</p>
                      </div>
                    ) : (
                      processedHistory.map((item) => (
                        <motion.div 
                          layout
                          key={item.id}
                          onClick={() => {
                            setSelectedId(item.id);
                            setCurrentText('');
                            setInterimText('');
                          }}
                          className={cn(
                            "group cursor-pointer rounded-3xl p-6 transition-all border",
                            selectedId === item.id 
                              ? "bg-indigo-50 border-indigo-100" 
                              : "bg-slate-50 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 border-transparent hover:border-slate-100"
                          )}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="space-y-1">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {new Date(item.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                              <h4 className="font-bold text-slate-900 line-clamp-1">{item.label}</h4>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={(e) => downloadEntry(item, e)}
                                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => deleteEntry(item.id, e)}
                                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-rose-500 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-slate-500 text-xs font-medium leading-relaxed line-clamp-2">
                            {item.text}
                          </p>
                          <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            {formatDuration(item.duration)}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </main>

        <footer className="mt-20 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Sténo • Retranscription Vocale Native
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">Confidentialité</a>
            <a href="#" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">Conditions</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
