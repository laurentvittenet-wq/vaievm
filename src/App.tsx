import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  AlertCircle,
  RefreshCcw,
  Info,
  TrendingDown,
  BarChart3,
  Cpu,
  Code,
  Mic,
  MicOff,
  Download,
  Trash2,
  ArrowLeft,
  FileText,
  Square,
  History,
  Copy,
  Check,
  Loader2,
  Settings,
  ChevronRight,
  Activity,
  Edit2,
  Save,
  X,
  ShieldCheck,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  LabelList
} from 'recharts';
import { EVMData, EVMMetrics } from './types';
import { GoogleGenAI } from "@google/genai";
import { cn } from './lib/utils';
import Markdown from 'react-markdown';

// Initialisation de Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Helper to generate S-curve data
const generateSCurveData = (bac: number, currentMonth: number, currentEv: number, customPv?: number[]) => {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  
  // Default S-curve values if no custom PV provided
  const getPvForMonth = (index: number) => {
    if (customPv && customPv[index] !== undefined) return customPv[index];
    const progress = (index + 1) / 12;
    const sCurveFactor = (1 / (1 + Math.exp(-10 * (progress - 0.5))));
    return Math.round(bac * sCurveFactor);
  };

  return months.map((month, index) => {
    const pv = getPvForMonth(index);
    const progress = (index + 1) / 12;
    const sCurveFactor = (1 / (1 + Math.exp(-10 * (progress - 0.5))));
    
    // For EV, we show it up to current month
    let ev: number | null = null;
    if (index < currentMonth - 1) {
      const evFactor = sCurveFactor * (currentEv / (bac * (1 / (1 + Math.exp(-10 * ((currentMonth/12) - 0.5))))));
      ev = Math.round(bac * evFactor);
    } else if (index === currentMonth - 1) {
      ev = currentEv;
    }

    return {
      name: month,
      pv: pv,
      ev: ev,
      spi: ev !== null && pv !== 0 ? parseFloat((ev / pv).toFixed(2)) : null,
    };
  });
};

function EVMSimulator({ onBack }: { onBack: () => void }) {
  // Current month index (1-12)
  const [currentMonth, setCurrentMonth] = useState(6);
  
  // Visibility toggles for chart lines
  const [showPv, setShowPv] = useState(true);
  const [showEv, setShowEv] = useState(true);
  const [showSpi, setShowSpi] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  
  // Initial state for project values
  const [data, setData] = useState<EVMData>({
    plannedValue: 5200,
    earnedValue: 4800,
    actualCost: 5100,
    budgetAtCompletion: 10000,
    monthlyPlannedValues: [
      100, 300, 700, 1500, 3000, 5200, 7500, 8800, 9500, 9800, 9950, 10000
    ]
  });

  // Update plannedValue when currentMonth or monthlyPlannedValues change
  useMemo(() => {
    if (data.monthlyPlannedValues) {
      const newPv = data.monthlyPlannedValues[currentMonth - 1];
      if (newPv !== data.plannedValue) {
        setData(prev => ({ ...prev, plannedValue: newPv }));
      }
    }
  }, [currentMonth, data.monthlyPlannedValues]);

  // Calculate metrics
  const metrics = useMemo((): EVMMetrics => {
    const { plannedValue, earnedValue, actualCost } = data;
    return {
      spi: plannedValue === 0 ? 0 : earnedValue / plannedValue,
      cpi: actualCost === 0 ? 0 : earnedValue / actualCost,
      sv: earnedValue - plannedValue,
      cv: earnedValue - actualCost,
    };
  }, [data]);

  const sCurveData = useMemo(() => 
    generateSCurveData(data.budgetAtCompletion, currentMonth, data.earnedValue, data.monthlyPlannedValues),
  [data.budgetAtCompletion, currentMonth, data.earnedValue, data.monthlyPlannedValues]);

  const getStatusColor = (value: number, threshold: number = 1) => {
    if (value >= threshold) return 'text-emerald-500';
    if (value >= threshold - 0.1) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getStatusBg = (value: number, threshold: number = 1) => {
    if (value >= threshold) return 'bg-emerald-500/10 border-emerald-500/20';
    if (value >= threshold - 0.1) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-rose-500/10 border-rose-500/20';
  };

  const handleReset = () => {
    setData({
      plannedValue: 5200,
      earnedValue: 4800,
      actualCost: 5100,
      budgetAtCompletion: 10000,
      monthlyPlannedValues: [
        100, 300, 700, 1500, 3000, 5200, 7500, 8800, 9500, 9800, 9950, 10000
      ]
    });
    setCurrentMonth(6);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl cursor-pointer hover:bg-indigo-700 transition-colors" onClick={onBack}>
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              Dashboard Performance Projet
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Analyse de la Valeur Acquise & Courbe en S</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Mois Actuel:</span>
              <span className="font-bold text-indigo-600">{sCurveData[currentMonth-1].name}</span>
            </div>
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              <RefreshCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </header>

        {/* Schedule Editor Modal */}
        {isEditingSchedule && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Paramétrage de l'échéancier</h2>
                  <p className="text-sm text-slate-500">Définissez les valeurs cumulées (PV) pour chaque mois</p>
                </div>
                <button 
                  onClick={() => setIsEditingSchedule(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <RefreshCcw className="w-5 h-5 rotate-45" />
                </button>
              </div>
              <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'].map((month, idx) => (
                  <div key={month} className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">{month}</label>
                    <div className="relative">
                      <input 
                        type="number"
                        value={data.monthlyPlannedValues ? data.monthlyPlannedValues[idx] : 0}
                        onChange={(e) => {
                          const newVal = parseInt(e.target.value) || 0;
                          const newMonthly = [...(data.monthlyPlannedValues || [])];
                          newMonthly[idx] = newVal;
                          setData({ ...data, monthlyPlannedValues: newMonthly });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">€</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="text-sm text-slate-500">
                  Total (BAC): <span className="font-bold text-slate-800">{(data.monthlyPlannedValues?.[11] || 0).toLocaleString()} €</span>
                </div>
                <button 
                  onClick={() => {
                    // Update BAC to match the last month's cumulative value if desired
                    const lastVal = data.monthlyPlannedValues?.[11] || 0;
                    setData({ ...data, budgetAtCompletion: lastVal });
                    setIsEditingSchedule(false);
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Top Row: KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valeur Acquise (EV)</span>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold">{(data.earnedValue / 1000).toFixed(1)} K€</div>
            <div className="mt-2 text-xs text-slate-500">Travail réellement accompli</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valeur Planifiée (PV)</span>
              <Clock className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold">{(data.plannedValue / 1000).toFixed(1)} K€</div>
            <div className="mt-2 text-xs text-slate-500">Travail qui aurait dû être fait</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`p-5 border rounded-2xl shadow-sm ${getStatusBg(metrics.spi)}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold opacity-70 uppercase tracking-wider">SPI (Délais)</span>
              <BarChart3 className={`w-5 h-5 ${getStatusColor(metrics.spi)}`} />
            </div>
            <div className={`text-2xl font-bold ${getStatusColor(metrics.spi)}`}>{metrics.spi.toFixed(2)}</div>
            <div className="mt-2 text-xs opacity-70 font-medium">
              {metrics.spi >= 1 ? "En avance" : "En retard"}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`p-5 border rounded-2xl shadow-sm ${getStatusBg(metrics.cpi)}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold opacity-70 uppercase tracking-wider">CPI (Coût)</span>
              <DollarSign className={`w-5 h-5 ${getStatusColor(metrics.cpi)}`} />
            </div>
            <div className={`text-2xl font-bold ${getStatusColor(metrics.cpi)}`}>{metrics.cpi.toFixed(2)}</div>
            <div className="mt-2 text-xs opacity-70 font-medium">
              {metrics.cpi >= 1 ? "Sous budget" : "Surcoût"}
            </div>
          </motion.div>
        </div>

        {/* Main Content: S-Curve and Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* S-Curve Chart */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    Courbe en S du Projet
                  </h3>
                  <p className="text-sm text-slate-400 font-medium">Comparaison cumulative PV vs EV sur 12 mois</p>
                </div>
                <div className="flex gap-4 text-xs font-bold uppercase">
                  <button 
                    onClick={() => setShowPv(!showPv)}
                    className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all ${showPv ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400 opacity-50'}`}
                  >
                    <div className={`w-3 h-3 rounded-full ${showPv ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                    <span>Planifié</span>
                  </button>
                  <button 
                    onClick={() => setShowEv(!showEv)}
                    className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all ${showEv ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400 opacity-50'}`}
                  >
                    <div className={`w-3 h-3 rounded-full ${showEv ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span>Acquis</span>
                  </button>
                  <button 
                    onClick={() => setShowSpi(!showSpi)}
                    className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all ${showSpi ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400 opacity-50'}`}
                  >
                    <div className={`w-3 h-3 rounded-full ${showSpi ? 'bg-amber-500' : 'bg-slate-300'}`} />
                    <span>SPI</span>
                  </button>
                </div>
              </div>

              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={sCurveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      yAxisId="left"
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                      tickFormatter={(value) => `${value/1000} K€`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 2]}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#f59e0b', fontSize: 12, fontWeight: 600 }}
                      hide={!showSpi}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'spi') return [value.toFixed(2), 'SPI'];
                        return [`${(value / 1000).toFixed(1)} K€`, name === 'pv' ? 'Planifié' : 'Acquis'];
                      }}
                    />
                    {showPv && (
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="pv" 
                        stroke="#6366f1" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorPv)" 
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      >
                        <LabelList 
                          dataKey="pv" 
                          position="top" 
                          offset={10} 
                          style={{ fill: '#6366f1', fontSize: 10, fontWeight: 700 }}
                          formatter={(value: number) => `${(value / 1000).toFixed(1)} K€`}
                        />
                      </Area>
                    )}
                    {showEv && (
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="ev" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorEv)" 
                        dot={(props: any) => {
                          const { cx, cy, index } = props;
                          if (index === currentMonth - 1) {
                            return <circle key={`dot-${index}`} cx={cx} cy={cy} r={6} fill="#10b981" stroke="white" strokeWidth={2} />;
                          }
                          return null;
                        }}
                      >
                        <LabelList 
                          dataKey="ev" 
                          position="top" 
                          offset={10} 
                          style={{ fill: '#10b981', fontSize: 10, fontWeight: 700 }}
                          formatter={(value: number) => value ? `${(value / 1000).toFixed(1)} K€` : ''}
                        />
                      </Area>
                    )}
                    {showSpi && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="spi"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      >
                        <LabelList 
                          dataKey="spi" 
                          position="top" 
                          offset={10} 
                          style={{ fill: '#f59e0b', fontSize: 10, fontWeight: 700 }}
                          formatter={(value: number) => value ? value.toFixed(2) : ''}
                        />
                      </Line>
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Variances */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Écart de Délai (SV)</span>
                  <div className={`text-2xl font-bold mt-1 ${metrics.sv >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {metrics.sv >= 0 ? '+' : ''}{(metrics.sv / 1000).toFixed(1)} K€
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${metrics.sv >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  {metrics.sv >= 0 ? <TrendingUp className="text-emerald-500" /> : <TrendingDown className="text-rose-500" />}
                </div>
              </div>
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Écart de Coût (CV)</span>
                  <div className={`text-2xl font-bold mt-1 ${metrics.cv >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {metrics.cv >= 0 ? '+' : ''}{(metrics.cv / 1000).toFixed(1)} K€
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${metrics.cv >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  {metrics.cv >= 0 ? <TrendingUp className="text-emerald-500" /> : <TrendingDown className="text-rose-500" />}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="space-y-6">
            <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl">
              <div className="flex items-center gap-2 mb-8">
                <div className="p-2 bg-indigo-500 rounded-lg">
                  <RefreshCcw className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-bold">Simulateur de Projet</h2>
              </div>
              
              <div className="space-y-8">
                {/* Month Selector */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <label className="text-slate-400 font-medium tracking-wide">Mois d'avancement</label>
                    <span className="font-bold text-indigo-400">{sCurveData[currentMonth-1].name}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="12" 
                    step="1"
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Planned Value Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <label className="text-slate-400 font-medium tracking-wide">Valeur Planifiée (PV)</label>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsEditingSchedule(true)}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase underline underline-offset-2"
                      >
                        Échéancier
                      </button>
                      <span className="font-bold text-indigo-400">{(data.plannedValue / 1000).toFixed(1)} K€</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={data.budgetAtCompletion} 
                    step="100"
                    value={data.plannedValue}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value);
                      const newMonthly = [...(data.monthlyPlannedValues || [])];
                      newMonthly[currentMonth - 1] = newVal;
                      setData({...data, plannedValue: newVal, monthlyPlannedValues: newMonthly});
                    }}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Earned Value Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <label className="text-slate-400 font-medium tracking-wide">Valeur Acquise (EV)</label>
                    <span className="font-bold text-emerald-400">{(data.earnedValue / 1000).toFixed(1)} K€</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={data.budgetAtCompletion} 
                    step="100"
                    value={data.earnedValue}
                    onChange={(e) => setData({...data, earnedValue: parseInt(e.target.value)})}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Actual Cost Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <label className="text-slate-400 font-medium tracking-wide">Coût Réel (AC)</label>
                    <span className="font-bold text-rose-400">{(data.actualCost / 1000).toFixed(1)} K€</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={data.budgetAtCompletion * 1.5} 
                    step="100"
                    value={data.actualCost}
                    onChange={(e) => setData({...data, actualCost: parseInt(e.target.value)})}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>

                {/* Budget At Completion (BAC) Control */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="flex justify-between items-center text-sm">
                    <label className="text-slate-400 font-medium tracking-wide">Budget Total (BAC)</label>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{(data.budgetAtCompletion / 1000).toFixed(1)} K€</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="1000" 
                    max="100000" 
                    step="1000"
                    value={data.budgetAtCompletion}
                    onChange={(e) => setData({...data, budgetAtCompletion: parseInt(e.target.value)})}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-400"
                  />
                </div>
              </div>

              <div className="mt-10 p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Utilisez les curseurs pour simuler différents scénarios. La courbe en S s'ajustera automatiquement pour refléter vos modifications.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Actions Rapides</h4>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => setData(prev => ({ ...prev, earnedValue: Math.min(prev.budgetAtCompletion, prev.earnedValue + 1000) }))}
                  className="w-full py-3 px-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all active:scale-95 flex items-center justify-between"
                >
                  Booster l'Avancement (+1k)
                  <TrendingUp className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setData(prev => ({ ...prev, actualCost: Math.min(prev.budgetAtCompletion * 1.5, prev.actualCost + 1000) }))}
                  className="w-full py-3 px-4 bg-rose-50 text-rose-700 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all active:scale-95 flex items-center justify-between"
                >
                  Augmenter les Coûts (+1k)
                  <DollarSign className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Legend / Info */}
        <footer className="pt-12 pb-12 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-slate-500 text-sm">
            <div>
              <h5 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Valeur Planifiée (PV)
              </h5>
              <p className="leading-relaxed">Budget cumulé du travail qui était prévu d'être achevé à une date donnée selon le planning initial.</p>
            </div>
            <div>
              <h5 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Valeur Acquise (EV)
              </h5>
              <p className="leading-relaxed">Budget cumulé du travail réellement accompli à une date donnée. C'est la mesure de l'avancement physique.</p>
            </div>
            <div>
              <h5 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Coût Réel (AC)
              </h5>
              <p className="leading-relaxed">Dépenses réelles engagées pour accomplir le travail correspondant à la Valeur Acquise.</p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

function LandingPage({ onSelectApp }: { onSelectApp: (app: string) => void }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-hidden relative">
      {/* Background Decorative Elements - Subtler for light mode */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-50 blur-[120px] rounded-full" />
      
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-24 flex flex-col items-center justify-center min-h-screen relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center space-y-12 w-full"
        >
          {/* EDF Inspired Banner Section */}
          <div className="relative w-full overflow-hidden rounded-3xl shadow-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="relative z-10 w-full h-[300px] md:h-[400px] bg-gradient-to-br from-[#005BBB] via-[#004a99] to-[#003366] flex items-center justify-center overflow-hidden"
            >
              {/* Abstract Code & Circuit Drawings */}
              <div className="absolute inset-0 opacity-20 select-none pointer-events-none overflow-hidden">
                {/* SVG Circuit Lines */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 400" preserveAspectRatio="none">
                  <path d="M0,100 L200,100 L250,150 L400,150" fill="none" stroke="white" strokeWidth="1" strokeDasharray="5,5" />
                  <path d="M1000,300 L800,300 L750,250 L600,250" fill="none" stroke="white" strokeWidth="1" strokeDasharray="5,5" />
                  <circle cx="200" cy="100" r="3" fill="#FF6321" />
                  <circle cx="800" cy="300" r="3" fill="#FF6321" />
                  <circle cx="400" cy="150" r="4" fill="white" />
                  <circle cx="600" cy="250" r="4" fill="white" />
                </svg>

                {/* Floating Code Blocks */}
                <div className="absolute top-10 left-10 font-mono text-xs text-white/60 space-y-1">
                  <div className="flex items-center gap-2">
                    <Code className="w-3 h-3 text-[#FF6321]" />
                    <span>import {'{'} energy {'}'} from 'edf-core';</span>
                  </div>
                  <div className="pl-5">const grid = new SmartGrid();</div>
                  <div className="pl-5">grid.optimize();</div>
                </div>

                <div className="absolute bottom-10 right-10 font-mono text-xs text-white/60 text-right space-y-1">
                  <div className="flex items-center justify-end gap-2">
                    <span>function monitor() {'{'} ... {'}'}</span>
                    <Code className="w-3 h-3 text-[#FF6321]" />
                  </div>
                  <div>system.status = 'OPTIMAL';</div>
                  <div className="text-blue-300">// 100% Efficiency</div>
                </div>
              </div>

              {/* Central Iconography */}
              <div className="relative z-20 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="w-24 h-24 md:w-36 md:h-36 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                      <Cpu className="w-8 h-8 md:w-12 md:h-12 text-white" />
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="flex gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#FF6321] animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-white/50" />
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                  </div>
                  <h2 className="text-white text-3xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
                    Digital <span className="text-[#FF6321]">Energy</span>
                  </h2>
                  <p className="text-white/40 text-[10px] md:text-xs font-mono mt-2 tracking-widest uppercase">
                    Smart Infrastructure • Code Driven
                  </p>
                </div>
              </div>

              {/* Decorative side elements */}
              <div className="absolute top-0 right-0 w-1/4 h-full bg-gradient-to-l from-white/5 to-transparent skew-x-[-15deg] translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-1/4 h-full bg-gradient-to-r from-[#FF6321]/5 to-transparent skew-x-[-15deg] -translate-x-1/2" />
            </motion.div>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900">
              Mes Applications
            </h1>
            <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto font-medium">
              Explorez les outils
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-4">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectApp('evm')}
              className="group relative px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg flex items-center gap-3 shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
            >
              <LayoutDashboard className="w-6 h-6" />
              EVM Simulator
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectApp('steno')}
              className="group relative px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg flex items-center gap-3 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
            >
              <Mic className="w-6 h-6" />
              Steno
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="px-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-lg text-slate-400 flex items-center gap-3 hover:bg-slate-100 transition-all cursor-not-allowed opacity-60"
            >
              <Clock className="w-6 h-6" />
              Prochainement...
            </motion.button>
          </div>
        </motion.div>

        <footer className="absolute bottom-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
          © 2026 • Laurent Vittenet
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'home' | 'evm' | 'steno'>('home');

  return (
    <>
      {view === 'home' && (
        <LandingPage onSelectApp={(app) => setView(app as any)} />
      )}
      {view === 'evm' && (
        <EVMSimulator onBack={() => setView('home')} />
      )}
      {view === 'steno' && (
        <StenoApp onBack={() => setView('home')} />
      )}
    </>
  );
}

interface Transcription {
  id: string;
  text: string;
  timestamp: number;
  duration: number;
}

function StenoApp({ onBack }: { onBack: () => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [editableText, setEditableText] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [history, setHistory] = useState<Transcription[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setPermissionStatus(result.state as 'prompt' | 'granted' | 'denied');
          result.onchange = () => setPermissionStatus(result.state as 'prompt' | 'granted' | 'denied');
        }
      } catch (err) {
        setPermissionStatus('denied');
      } finally {
        setIsCheckingPermission(false);
      }
    };
    checkPermission();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('steno_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('steno_history', JSON.stringify(history));
  }, [history]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionStatus('granted');
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err) {
      setPermissionStatus('denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ parts: [{ text: "Transcrivez cet audio en français. Soyez précis et conservez la ponctuation. Utilisez un formatage markdown si nécessaire pour la clarté." }, { inlineData: { data: base64, mimeType: "audio/webm" } }] }]
        });
        const text = response.text || "Désolé, je n'ai pas pu transcrire cet audio.";
        const newEntry = { id: Date.now().toString(), text, timestamp: Date.now(), duration: recordingTime };
        setHistory(prev => [newEntry, ...prev]);
        setCurrentTranscript(text);
        setEditableText(text);
        setCurrentEntryId(newEntry.id);
      } catch (error) {
        console.error("Transcription error:", error);
        alert("Une erreur est survenue lors de la transcription.");
      } finally {
        setIsTranscribing(false);
      }
    };
  };

  const exportTranscription = (text: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `steno-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteEntry = (id: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette transcription ?")) {
      setHistory(prev => prev.filter(h => h.id !== id));
      if (currentTranscript && history.find(h => h.id === id)?.text === currentTranscript) {
        setCurrentTranscript('');
        setEditableText('');
      }
    }
  };

  const saveEdit = () => {
    if (!currentEntryId) return;
    setHistory(prev => prev.map(h => {
      if (h.id === currentEntryId) {
        return { ...h, text: editableText };
      }
      return h;
    }));
    setCurrentTranscript(editableText);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditableText(currentTranscript);
    setIsEditing(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredHistory = history.filter(h => h.text.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button 
                onClick={onBack}
                className="p-2 -ml-2 hover:bg-white rounded-full transition-all text-slate-400 hover:text-slate-900"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                <Activity className="w-3 h-3" />
                Live Transcription
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 uppercase italic">
              Steno<span className="text-indigo-600">.AI</span>
            </h1>
            <p className="text-slate-400 font-medium tracking-tight">Transcription intelligente propulsée par Gemini</p>
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
              <div className="absolute top-0 right-0 p-8">
                {permissionStatus === 'denied' && (
                  <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-4 py-2 rounded-full text-xs font-bold">
                    <AlertCircle className="w-4 h-4" />
                    Microphone bloqué
                  </div>
                )}
                {permissionStatus === 'granted' && (
                  <div className="flex items-center gap-2 text-emerald-500 bg-emerald-50 px-4 py-2 rounded-full text-xs font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    Accès autorisé
                  </div>
                )}
              </div>

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
              </div>
            </section>

            {/* Current Result Area */}
            <AnimatePresence>
              {(isTranscribing || currentTranscript) && (
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
                        <h3 className="font-black uppercase italic tracking-tight text-slate-900">Dernière Transcription</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Généré il y a quelques instants</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isTranscribing ? (
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Gemini réfléchit...
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => setIsEditing(!isEditing)}
                            className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900"
                          >
                            {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                          </button>
                          <button 
                            onClick={() => copyToClipboard(currentTranscript, 'current')}
                            className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900"
                          >
                            {copiedId === 'current' ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                          </button>
                          <button 
                            onClick={() => exportTranscription(currentTranscript)}
                            className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="min-h-[200px] relative">
                    {isEditing ? (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <textarea
                          value={editableText}
                          onChange={(e) => setEditableText(e.target.value)}
                          autoFocus
                          className="w-full min-h-[300px] p-6 bg-slate-50 border-2 border-indigo-100 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium text-slate-700 leading-relaxed resize-none transition-all outline-none"
                        />
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={cancelEdit}
                            className="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                          >
                            Annuler
                          </button>
                          <button 
                            onClick={saveEdit}
                            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                          >
                            <Save className="w-5 h-5" />
                            Enregistrer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          if (currentTranscript && !isTranscribing) {
                            setIsEditing(true);
                          }
                        }}
                        className={cn(
                          "prose prose-slate max-w-none prose-p:leading-relaxed prose-p:text-slate-700 prose-p:font-medium group relative cursor-pointer rounded-3xl p-4 -m-4 hover:bg-slate-50 transition-colors",
                          !currentTranscript && "cursor-default hover:bg-transparent"
                        )}
                      >
                        {currentTranscript && (
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-white px-2 py-1 rounded-full shadow-sm border border-indigo-50">
                              <Edit2 className="w-3 h-3" />
                              Cliquer pour éditer
                            </div>
                          </div>
                        )}
                        <Markdown>{currentTranscript}</Markdown>
                      </div>
                    )}
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
                <div className="bg-white rounded-[40px] p-8 shadow-xl border border-slate-100 min-h-[600px] flex flex-col">
                  <div className="space-y-6 mb-8">
                    <h3 className="text-2xl font-black uppercase italic tracking-tight text-slate-900">Historique</h3>
                    
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Rechercher dans vos notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {filteredHistory.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                          <Search className="w-8 h-8" />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Aucun résultat trouvé</p>
                      </div>
                    ) : (
                      filteredHistory.map((item) => (
                        <motion.div 
                          layout
                          key={item.id}
                          className="group bg-slate-50 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 rounded-3xl p-6 transition-all border border-transparent hover:border-slate-100"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {new Date(item.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                                <Clock className="w-3 h-3" />
                                {formatDuration(item.duration)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => copyToClipboard(item.text, item.id)}
                                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-900 transition-all"
                              >
                                {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                              </button>
                              <button 
                                onClick={() => deleteEntry(item.id)}
                                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-rose-500 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-slate-600 text-sm font-medium leading-relaxed line-clamp-3">
                            {item.text}
                          </p>
                          <button 
                            onClick={() => {
                              setCurrentTranscript(item.text);
                              setEditableText(item.text);
                              setCurrentEntryId(item.id);
                              setShowHistory(false);
                            }}
                            className="mt-4 flex items-center gap-2 text-indigo-600 font-bold text-xs hover:underline"
                          >
                            Ouvrir et éditer
                            <ChevronRight className="w-3 h-3" />
                          </button>
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
            Steno v2.0 • Powered by Gemini 3 Flash
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">Privacy Policy</a>
            <a href="#" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">Terms of Service</a>
          </div>
        </footer>
      </div>
    </div>
  );
}

