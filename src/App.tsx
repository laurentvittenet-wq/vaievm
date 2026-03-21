import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  AlertCircle,
  RefreshCcw,
  Info,
  TrendingDown,
  BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';
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

export default function App() {
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
              <div className="p-2 bg-indigo-600 rounded-xl">
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
