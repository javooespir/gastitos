import { useState, useRef, useEffect, FormEvent } from 'react';
import { Brain, Send, RefreshCw, AlertTriangle, Lightbulb, TrendingUp, Star } from 'lucide-react';
import Header from '../components/Layout/Header';
import { useApp } from '../context/AppContext';
import { advisorApi } from '../api/client';
import { AdvisorAnalysis, Insight } from '../types';
import { formatARS, formatUSD, formatRelative } from '../utils/formatters';

interface ChatMessage {
  role: 'user' | 'advisor';
  content: string;
  timestamp: Date;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? '#22c55e' : value >= 5 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span className="font-mono font-medium text-white">{value}/10</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value * 10}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const colors = {
    alerta: 'bg-red-500/10 border-red-500/20 text-red-400',
    oportunidad: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    recomendacion: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
  };
  const icons = {
    alerta: AlertTriangle,
    oportunidad: Lightbulb,
    recomendacion: TrendingUp
  };
  const Icon = icons[insight.tipo] ?? AlertTriangle;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${colors[insight.tipo]}`}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
            {insight.categoria}
          </span>
          <span className="text-xs opacity-50 whitespace-nowrap">{formatRelative(insight.createdAt)}</span>
        </div>
        <p className="text-sm text-white">{insight.mensaje}</p>
        <p className="text-xs opacity-70 mt-1">{insight.accion}</p>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border self-start ${
        insight.impacto === 'alto' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
        insight.impacto === 'medio' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
        'bg-slate-500/20 text-slate-300 border-slate-500/30'
      }`}>
        {insight.impacto}
      </span>
    </div>
  );
}

export default function Advisor() {
  const { insights, refreshInsights } = useApp();
  const [analysis, setAnalysis] = useState<AdvisorAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'advisor',
    content: '¡Hola Javier! Soy tu asesor financiero. Puedo analizar tus gastos, comparar con meses anteriores, y darte recomendaciones de inversión específicas para Argentina. ¿En qué te puedo ayudar?',
    timestamp: new Date()
  }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const runAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const res = await advisorApi.analysis();
      setAnalysis(res.data);
      refreshInsights();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error al generar análisis';
      setMessages(m => [...m, {
        role: 'advisor',
        content: `Error: ${msg}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: userMsg, timestamp: new Date() }]);
    setSending(true);
    try {
      const res = await advisorApi.chat(userMsg);
      setMessages(m => [...m, { role: 'advisor', content: res.data.reply, timestamp: new Date() }]);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Error al conectar con el asesor';
      setMessages(m => [...m, { role: 'advisor', content: `Error: ${errMsg}`, timestamp: new Date() }]);
    } finally {
      setSending(false);
    }
  };

  const recentInsights = insights.slice(0, 6);

  const quickQuestions = [
    '¿Puedo gastar $50.000 en salidas este fin de semana?',
    '¿Cuánto debería ahorrar por mes para mis metas?',
    '¿Dónde invierto mis ahorros en pesos?',
    '¿En qué categoría gasté más este mes?'
  ];

  return (
    <>
      <Header title="Asesor IA" subtitle="Análisis inteligente de tus finanzas" />

      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Panel izquierdo: Chat + Análisis */}
        <div className="space-y-6">
          {/* Chat */}
          <div className="bg-surface-850 border border-white/5 rounded-2xl flex flex-col" style={{ height: '480px' }}>
            <div className="flex items-center gap-3 p-4 border-b border-white/5">
              <div className="w-8 h-8 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-center">
                <Brain className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Asesor Financiero</p>
                <p className="text-xs text-emerald-400">Online · Claude Sonnet</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-brand-500 text-white rounded-br-sm'
                      : 'bg-white/5 border border-white/5 text-slate-200 rounded-bl-sm'
                  }`}>
                    <p className="leading-relaxed">{msg.content}</p>
                    <p className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-brand-200' : 'text-slate-500'}`}>
                      {msg.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-white/5 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Preguntá algo sobre tus finanzas..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500/50 placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="p-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Quick questions */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Preguntas frecuentes</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="text-xs bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Análisis completo */}
          <div className="bg-surface-850 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-300">Análisis completo del mes</h2>
              <button
                onClick={runAnalysis}
                disabled={loadingAnalysis}
                className="flex items-center gap-2 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 text-brand-400 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAnalysis ? 'animate-spin' : ''}`} />
                {loadingAnalysis ? 'Analizando...' : 'Analizar ahora'}
              </button>
            </div>

            {!analysis ? (
              <div className="text-center py-8">
                <Brain className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Presioná "Analizar ahora" para obtener un análisis completo</p>
                <p className="text-xs text-slate-600 mt-1">Requiere clave API de Claude configurada</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Resumen */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">Gastos</p>
                    <p className="text-sm font-bold text-red-400 font-mono">{formatARS(analysis.resumenMes.gastadoARS)}</p>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">Ingresos</p>
                    <p className="text-sm font-bold text-emerald-400 font-mono">{formatARS(analysis.resumenMes.ingresadoARS)}</p>
                  </div>
                  <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">Ahorro</p>
                    <p className="text-sm font-bold text-blue-400 font-mono">{formatARS(analysis.resumenMes.ahorroARS)}</p>
                  </div>
                </div>

                {/* Scoring */}
                <div className="bg-white/3 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-amber-400" />
                    <p className="text-sm font-medium text-white">Scoring financiero</p>
                  </div>
                  <ScoreBar label="Disciplina" value={analysis.scoring.disciplina} />
                  <ScoreBar label="Consistencia" value={analysis.scoring.consistencia} />
                  <ScoreBar label="Eficiencia de ahorro" value={analysis.scoring.eficienciaAhorro} />
                  <p className="text-xs text-slate-400 pt-1 border-t border-white/5">{analysis.scoring.recomendacion}</p>
                </div>

                {/* Inversiones */}
                {Object.entries(analysis.recomendacionesInversion).length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Recomendaciones de inversión</p>
                    <div className="space-y-2">
                      {Object.entries(analysis.recomendacionesInversion).map(([nombre, rec]) => (
                        <div key={nombre} className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-white">{nombre}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${rec.onTrack ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {rec.onTrack ? 'En ritmo' : 'Necesita acelerar'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mb-1">{rec.estrategia}</p>
                          <p className="text-xs text-slate-500">{rec.razonamiento}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho: Insights */}
        <div className="space-y-6">
          <div className="bg-surface-850 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-300">Alertas y oportunidades</h2>
              <span className="text-xs text-slate-500">{recentInsights.length} recientes</span>
            </div>

            {recentInsights.length === 0 ? (
              <div className="text-center py-12">
                <Lightbulb className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Ejecutá un análisis para ver alertas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentInsights.map(insight => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
