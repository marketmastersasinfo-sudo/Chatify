import { useState } from 'react';
import { Flame, Target, Repeat, AlertTriangle, Map, Brain, Loader2, Search, DollarSign, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdvancedInsightsProps {
  insightsData: any;
  leads: any[]; // Raw leads for NLP fetching
}

export function AdvancedInsights({ insightsData, leads }: AdvancedInsightsProps) {
  const { heatmapData, trafficQuality, retention, productFriction, geoDemographics } = insightsData;
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);

  // Max value for heatmap color intensity
  const maxHeatmap = Math.max(...heatmapData.flat());

  // NLP State
  const [nlpLoading, setNlpLoading] = useState(false);
  const [nlpResults, setNlpResults] = useState<{word: string, count: number}[]>([]);
  const [selectedProductNlp, setSelectedProductNlp] = useState<string | null>(null);

  // AI Analysis State
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{ text?: string, error?: string } | null>(null);
  const [aiProvider, setAiProvider] = useState<'openai' | 'anthropic' | 'google'>('openai');

  // Helper para normalizar (igual que en dashboard-data.ts)
  const normalizeProductName = (name: string) => {
    if (!name) return 'Producto Desconocido';
    let n = name.replace(/\([^)]+\)/g, '');
    n = n.replace(/^(oferta|promo|promoción|descuento|combo|liquidación)\s*[:-]?\s*/i, '');
    n = n.replace(/^[\.,'"]+/, '');
    n = n.trim();
    return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  };

  const runNLPAnalysis = async (productName: string) => {
    setNlpLoading(true);
    setSelectedProductNlp(productName);
    setNlpResults([]);
    setAiAnalysisResult(null); // Reset AI result when changing product
    
    try {
      // Find all leads for this product using normalized names
      const productLeadIds = leads
        .filter(l => normalizeProductName(l.product_name) === productName)
        .map(l => l.id);
      
      if (productLeadIds.length === 0) {
        setNlpResults([{ word: 'Sin datos suficientes', count: 1 }]);
        setNlpLoading(false);
        return;
      }

      // Fetch messages for these leads (limit to 1000 to avoid crash)
      const { data: messages } = await supabase
        .from('messages')
        .select('content')
        .in('lead_id', productLeadIds.slice(0, 100))
        .eq('sender_type', 'client') // Only client messages
        .limit(1000);

      if (!messages || messages.length === 0) {
        setNlpResults([{ word: 'Sin datos suficientes', count: 1 }]);
        setNlpLoading(false);
        return;
      }

      // Basic NLP Algorithm (Stop words and frequency)
      const baseStopWords = ['de','la','que','el','en','y','a','los','del','se','las','por','un','para','con','no','una','su','al','lo','como','más','pero','sus','le','ya','o','este','sí','porque','esta','entre','cuando','muy','sin','sobre','también','me','hasta','hay','donde','quien','desde','todo','nos','durante','todos','uno','les','ni','contra','otros','ese','eso','ante','ellos','e','esto','mí','antes','algunos','qué','unos','yo','otro','otras','otra','él','tanto','esa','estos','mucho','quienes','nada','muchos','cual','poco','ella','estar','estas','algunas','algo','nosotros','mi','mis','tú','te','ti','tu','tus','ellas','nosotras','vosotros','vosotras','os','mío','mía','míos','mías','tuyo','tuya','tuyos','tuyas','suyo','suya','suyos','suyas','nuestro','nuestra','nuestros','nuestras','vuestro','vuestra','vuestros','vuestras','esos','esas','aquel','aquella','aquellos','aquellas','esto','eso','aquello','precio','costo','valor','hola','buenas','tardes','días','noches','cuanto','cuesta','vale','quiero','gracias','info','informacion', 'anuncio', 'facebook', 'tiktok', 'instagram', 'pedir', 'encantaría', 'confirmado', 'correcto', 'pedido', 'enviar', 'envío', 'carrera', 'calle', 'barrio', 'ciudad', 'departamento', 'municipio', 'cliente', 'realizar', 'redes', 'sociales', 'aviso', 'madname', 'andres', 'cristóbal', 'venezuela', 'caracas', 'bolivares', 'bueno', 'fotos', 'dame', 'video', 'azul', 'gris', 'negro', 'blanco', 'bogotá', 'medellin', 'cali', 'barranquilla', 'bucaramanga', 'pereira', 'manizales', 'armenia', 'ibague', 'villavicencio', 'cucuta', 'pasto', 'popayan', 'neiva', 'cartagena', 'santamarta', 'valledupar', 'monteria', 'sincelejo', 'riohacha', 'quibdo', 'puertoasis', 'florencia', 'yopal', 'arauca', 'mocoa', 'leticia', 'mitu', 'inirida', 'sanjose', 'sanandres', 'providencia', 'santacatalina', 'malpelo', 'gorgona', 'tumaco', 'buenaventura', 'turbaco', 'soacha', 'chia', 'zipaquira', 'facatativa', 'madrid', 'mosquera', 'funza', 'cota', 'tocancipa', 'gachancipa', 'sopo', 'cajica', 'tabio', 'tenjo', 'subachoque', 'elrosal', 'bojacá', 'sibate', 'granada', 'silvania', 'fusagasuga', 'arbelaez', 'pasca', 'tibacuy', 'sanbernardo', 'venecia', 'cabrera', 'pandi'];
      
      const productWords = productName.toLowerCase().replace(/[^\w\sáéíóúüñ]/g, '').split(/\s+/);
      const stopWords = [...baseStopWords, ...productWords];
      
      const wordCounts: Record<string, number> = {};
      
      messages.forEach((msg: any) => {
        if (!msg.content) return;
        const words = msg.content.toLowerCase().replace(/[^\w\sáéíóúüñ]/g, '').split(/\s+/);
        words.forEach((w: string) => {
          if (w.length > 3 && !stopWords.includes(w)) {
            wordCounts[w] = (wordCounts[w] || 0) + 1;
          }
        });
      });

      const sortedWords = Object.entries(wordCounts)
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20); // Top 20

      setNlpResults(sortedWords.length > 0 ? sortedWords : [{ word: 'Solo palabras comunes', count: 1 }]);
    } catch (e) {
      console.error(e);
      setNlpResults([{ word: 'Error extrayendo datos', count: 1 }]);
    }
    setNlpLoading(false);
  };

  const generateAIAnalysis = async () => {
    if (!selectedProductNlp || nlpResults.length === 0) return;
    setAiAnalysisLoading(true);
    setAiAnalysisResult(null);

    try {
      const response = await fetch('/api/analyze-nlp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: selectedProductNlp,
          words: nlpResults,
          modelProvider: aiProvider
        })
      });
      const data = await response.json();
      if (data.error) {
        setAiAnalysisResult({ error: data.error });
      } else {
        setAiAnalysisResult({ text: data.result });
      }
    } catch (err: any) {
      setAiAnalysisResult({ error: 'Error de red conectando con la IA. Asegúrate de tener conexión.' });
    }
    setAiAnalysisLoading(false);
  };

  return (
    <div className="mt-12 space-y-8 animate-fade-in">
      <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
        <div className="p-2 bg-gradient-to-br from-gray-800 to-black rounded-lg shadow-md">
          <Brain className="w-6 h-6 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Joyas Ocultas (Data Science)</h2>
          <p className="text-sm font-medium text-gray-500">Inteligencia de negocios avanzada para optimizar tus campañas y ventas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Heatmap de Ventas */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm col-span-1 lg:col-span-2 overflow-x-auto">
          <div className="flex items-center gap-2 mb-6">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-gray-900">Mapa de Calor: ¿A qué hora se cierran las compras?</h3>
          </div>
          <div className="min-w-[800px]">
            <div className="flex mb-1">
              <div className="w-12"></div>
              {hours.map(h => <div key={h} className="flex-1 text-center text-[10px] text-gray-400 font-bold">{h}</div>)}
            </div>
            {days.map((day, dIdx) => (
              <div key={day} className="flex items-center mb-1 gap-1">
                <div className="w-12 text-xs font-bold text-gray-500 text-right pr-2">{day}</div>
                {heatmapData[dIdx].map((val: number, hIdx: number) => {
                  const intensity = maxHeatmap > 0 ? val / maxHeatmap : 0;
                  return (
                    <div 
                      key={hIdx} 
                      className="flex-1 h-8 rounded-sm transition-all hover:ring-2 hover:ring-orange-400 relative group cursor-crosshair"
                      style={{ 
                        backgroundColor: val === 0 ? '#f3f4f6' : `rgba(249, 115, 22, ${0.1 + (intensity * 0.9)})`
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[10px] font-black text-white drop-shadow-md">
                        {val}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4 font-medium border-l-2 border-orange-200 pl-3">
            💡 <strong>Estrategia:</strong> Aumenta el presupuesto de tus campañas (Google/Meta) en las franjas horarias y días más oscuros, y reduce la pauta en las franjas grises para maximizar tu ROAS.
          </p>
        </div>

        {/* 2. Calidad de Tráfico */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold text-gray-900">Calidad Real del Tráfico</h3>
          </div>
          <div className="space-y-4">
            {trafficQuality.map((t: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-blue-50/50 transition-colors">
                <div>
                  <span className="text-sm font-bold text-gray-900 block">{t.source}</span>
                  <span className="text-xs text-gray-500">{t.total} leads • {t.converted} ventas</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-blue-600 block">{t.conversionRate.toFixed(1)}% de Cierre</span>
                  <span className="text-xs font-bold text-green-600">${t.revenue.toLocaleString('es-CO')}</span>
                </div>
              </div>
            ))}
            {trafficQuality.length === 0 && <p className="text-sm text-gray-400 italic">No hay suficientes datos de origen.</p>}
          </div>
        </div>

        {/* 3. Retención / LTV */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="flex items-center gap-2 mb-4">
            <Repeat className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-bold text-gray-900">Tasa de Fidelización (LTV)</h3>
          </div>
          <div className="relative w-40 h-40 mb-6">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#a855f7" strokeWidth="12" 
                strokeDasharray="251.2" 
                strokeDashoffset={251.2 - (251.2 * retention.retentionRate / 100)} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-gray-900">{retention.retentionRate.toFixed(1)}%</span>
            </div>
          </div>
          <div className="w-full grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-xl">
              <span className="block text-xs text-gray-500 font-bold uppercase mb-1">Una Compra</span>
              <span className="text-xl font-black text-gray-800">{retention.totalUniqueCustomers - retention.repeatCustomers}</span>
            </div>
            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
              <span className="block text-xs text-purple-600 font-bold uppercase mb-1">Recompras</span>
              <span className="text-xl font-black text-purple-700">{retention.repeatCustomers} clientes</span>
            </div>
          </div>
        </div>

        {/* 4 y 5. Fricción por Producto y NLP */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm col-span-1 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold text-gray-900">Productos con Fricción Oculta & Analizador NLP</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-4">
                Productos que generan interés pero la gente abandona el carrito o la conversación a último minuto. Selecciona uno para analizar objeciones.
              </p>
              
              {/* Product Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar producto por nombre..." 
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  onChange={(e) => {
                    const term = e.target.value.toLowerCase();
                    const items = document.querySelectorAll('.product-friction-item');
                    items.forEach((item: any) => {
                      const name = item.getAttribute('data-name')?.toLowerCase() || '';
                      if (name.includes(term)) item.style.display = 'block';
                      else item.style.display = 'none';
                    });
                  }}
                />
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {productFriction.map((p: any, idx: number) => (
                  <div key={idx} data-name={p.name} className={`product-friction-item p-3 rounded-xl border transition-all cursor-pointer ${selectedProductNlp === p.name ? 'border-red-400 bg-red-50/30 shadow-sm' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`} onClick={() => runNLPAnalysis(p.name)}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-gray-800 line-clamp-1 flex-1 pr-2" title={p.name}>{p.name}</span>
                      <span className="text-xs font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-md">{p.dropoffRate.toFixed(0)}% Abandono</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{p.total} leads totales</span>
                      <span>{p.abandoned} caídos</span>
                      <button className="ml-auto flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold">
                        <Search className="w-3 h-3" /> Analizar Objeciones
                      </button>
                    </div>
                  </div>
                ))}
                {productFriction.length === 0 && <p className="text-sm text-gray-400 italic">No hay suficientes datos de productos caídos.</p>}
              </div>
            </div>

            {/* NLP Word Cloud Area */}
            <div className="bg-gray-900 rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[300px]">
              <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              
              <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2 relative z-10">
                <Brain className="w-4 h-4 text-purple-400" />
                Nube de Objeciones NLP
              </h4>

              <div className="flex-1 flex items-center justify-center relative z-10">
                {!selectedProductNlp && !nlpLoading && (
                  <p className="text-gray-400 text-sm text-center">
                    Selecciona un producto a la izquierda para que la IA lea el historial de chats y extraiga los miedos, dudas y objeciones reales.
                  </p>
                )}
                
                {nlpLoading && (
                  <div className="flex flex-col items-center justify-center text-blue-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <span className="text-xs font-bold animate-pulse">Escaneando miles de chats...</span>
                  </div>
                )}

                {selectedProductNlp && !nlpLoading && nlpResults.length > 0 && (
                  <div className="w-full">
                    <p className="text-xs text-gray-400 mb-4 text-center">Fricciones encontradas para: <strong className="text-white">{selectedProductNlp}</strong></p>
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                      {nlpResults.map((res, i) => {
                        // Max size 2rem, min size 0.75rem based on count
                        const maxCount = Math.max(...nlpResults.map(r => r.count));
                        const size = 0.75 + ((res.count / maxCount) * 1.5);
                        const colors = ['text-red-400', 'text-yellow-400', 'text-orange-400', 'text-pink-400', 'text-purple-400'];
                        const color = colors[i % colors.length];
                        
                        return (
                          <span key={i} className={`${color} font-black drop-shadow-md transition-transform hover:scale-110 cursor-help`} style={{ fontSize: `${size}rem` }} title={`Mencionado ${res.count} veces`}>
                            {res.word}
                          </span>
                        );
                      })}
                    </div>
                    
                    <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700 mt-4">
                      <p className="text-xs text-gray-400">
                        <strong className="text-yellow-400">💡 ¿Cómo interpretar esto?</strong><br/>
                        La IA extrajo las palabras más repetidas de los clientes que no compraron. 
                        Busca patrones: si resalta <strong>"caro"</strong> o <strong>"precio"</strong>, es una objeción financiera. 
                        Si ves <strong>"talla"</strong>, <strong>"color"</strong> o <strong>"tela"</strong>, faltan fotos o variantes en tu anuncio. 
                        Si ves <strong>"envío"</strong> o <strong>"demora"</strong>, desconfían de la logística.
                      </p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-800">
                      <div className="flex flex-col sm:flex-row items-center gap-3 justify-center mb-4">
                        <select 
                          className="bg-gray-800 text-sm text-gray-300 border border-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500"
                          value={aiProvider}
                          onChange={(e) => setAiProvider(e.target.value as any)}
                        >
                          <option value="openai">OpenAI (GPT-4o)</option>
                          <option value="anthropic">Anthropic (Claude 3.5)</option>
                          <option value="google">Google (Gemini 1.5)</option>
                        </select>
                        <button 
                          onClick={generateAIAnalysis}
                          disabled={aiAnalysisLoading}
                          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
                        >
                          {aiAnalysisLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Generar Plan de Acción con IA
                        </button>
                      </div>

                      {aiAnalysisResult?.error && (
                        <div className="bg-red-900/50 border border-red-700/50 text-red-200 text-sm p-4 rounded-xl text-center">
                          {aiAnalysisResult.error}
                        </div>
                      )}

                      {aiAnalysisResult?.text && (
                        <div className="bg-gray-800/80 border border-purple-500/30 p-5 rounded-xl mt-2 text-left shadow-inner">
                          <h5 className="text-purple-300 font-bold mb-3 flex items-center gap-2">
                            <Brain className="w-4 h-4" /> Diagnóstico de IA para "{selectedProductNlp}"
                          </h5>
                          <div className="text-sm text-gray-300 space-y-2">
                            {aiAnalysisResult.text.split('\n').map((line, idx) => (
                              <p key={idx} className={line.trim().startsWith('-') || line.trim().startsWith('*') ? 'pl-4' : ''}>
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 6. Georeferenciación */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm col-span-1 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Map className="w-5 h-5 text-teal-500" />
            <h3 className="text-lg font-bold text-gray-900">Mapa Demográfico de Interés y Ventas</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {geoDemographics.map((g: any, idx: number) => (
              <div key={idx} className="p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-teal-200 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-black text-gray-800 line-clamp-1" title={g.city}>{g.city}</h4>
                  {g.revenue > 0 && <DollarSign className="w-4 h-4 text-green-500" />}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Leads Generados</span>
                    <span className="font-bold text-gray-900">{g.total}</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${Math.min(g.conversionRate, 100)}%` }}></div>
                  </div>
                  
                  <div className="flex justify-between text-xs pt-1 border-t border-gray-200 mt-2">
                    <span className="text-gray-500 font-medium">Tasa de Compra</span>
                    <span className={`font-black ${g.conversionRate > 20 ? 'text-green-600' : 'text-red-500'}`}>
                      {g.conversionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {geoDemographics.length === 0 && <p className="text-sm text-gray-400 italic">No hay datos de ciudades.</p>}
          </div>
        </div>

      </div>
    </div>
  );
}
