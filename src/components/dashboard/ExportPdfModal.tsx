import { useState } from 'react';
import { Loader2, Download, X, Calendar, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  leads: any[];
  aiProvider: string;
  currentAnalysis: any;
}

export function ExportPdfModal({ isOpen, onClose, productName, leads, aiProvider, currentAnalysis }: ExportPdfModalProps) {
  const [sections, setSections] = useState({
    words: true,
    landing: true,
    prompt: true,
    ads: true
  });

  const [timeframes, setTimeframes] = useState({
    current: true,
    yesterday: false,
    last7: false,
    last30: false,
    custom: false
  });

  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);

  if (!isOpen) return null;

  const normalizeProductName = (name: string) => {
    if (!name) return 'Producto Desconocido';
    let n = name.replace(/\([^)]+\)/g, '');
    n = n.replace(/^(oferta|promo|promoción|descuento|combo|liquidación)\s*[:-]?\s*/i, '');
    n = n.replace(/^[\.,'"]+/, '');
    n = n.trim();
    return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress('Iniciando exportación...');
    setReportData([]); // Clear previous

    const reportsToRender: any[] = [];

    // 1. Current Range
    if (timeframes.current && currentAnalysis?.words?.length > 0) {
      reportsToRender.push({
        title: 'Análisis Actual (Rango en pantalla)',
        data: currentAnalysis
      });
    }

    const fetchForDateRange = async (title: string, startDate: Date, endDate: Date) => {
      setExportProgress(`Analizando: ${title}...`);
      
      const storeIds = [...new Set(leads.map(l => l.store_id))];
      if (storeIds.length === 0) return;

      const { data: rangeLeads } = await supabase
        .from('leads')
        .select('id, product_name')
        .in('store_id', storeIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()) as { data: any[], error: any };

      if (!rangeLeads || rangeLeads.length === 0) return;

      const productLeadIds = rangeLeads
        .filter(l => normalizeProductName(l.product_name) === productName)
        .map(l => l.id);

      if (productLeadIds.length === 0) return;

      const { data: messages } = await supabase
        .from('messages')
        .select('content')
        .in('lead_id', productLeadIds.slice(0, 100))
        .eq('sender_type', 'client')
        .limit(300);

      if (!messages || messages.length === 0) return;

      const response = await fetch('/api/analyze-nlp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          messages,
          modelProvider: aiProvider
        })
      });
      const data = await response.json();
      if (!data.error) {
        reportsToRender.push({
          title,
          data: data.result
        });
      }
    };

    try {
      const today = new Date();
      
      if (timeframes.yesterday) {
        const start = new Date(today); start.setDate(start.getDate() - 1); start.setHours(0,0,0,0);
        const end = new Date(today); end.setDate(end.getDate() - 1); end.setHours(23,59,59,999);
        await fetchForDateRange('Ayer', start, end);
      }
      
      if (timeframes.last7) {
        const start = new Date(today); start.setDate(start.getDate() - 7); start.setHours(0,0,0,0);
        await fetchForDateRange('Últimos 7 Días', start, today);
      }

      if (timeframes.last30) {
        const start = new Date(today); start.setDate(start.getDate() - 30); start.setHours(0,0,0,0);
        await fetchForDateRange('Últimos 30 Días', start, today);
      }

      if (timeframes.custom && customDates.start && customDates.end) {
        const start = new Date(customDates.start + 'T00:00:00');
        const end = new Date(customDates.end + 'T23:59:59');
        await fetchForDateRange(`Personalizado (${customDates.start} a ${customDates.end})`, start, end);
      }

      // We have all reports. Set them to state so the hidden DOM renders them
      setReportData(reportsToRender);
      setExportProgress('Generando Documento PDF...');

      // Wait a bit for React to render the hidden DOM
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress('');
        window.print();
        onClose();
      }, 1000);

    } catch (e) {
      console.error(e);
      setIsExporting(false);
      setExportProgress('Error durante la exportación');
    }
  };

  const toggleSection = (key: keyof typeof sections) => setSections(p => ({ ...p, [key]: !p[key] }));
  const toggleTimeframe = (key: keyof typeof timeframes) => setTimeframes(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white" disabled={isExporting}>
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Download className="w-6 h-6 text-purple-500" />
          Exportar Reporte PDF
        </h2>

        <div className="space-y-6">
          {/* Secciones */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">1. Secciones a incluir</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'words', label: 'Nube de Objeciones' },
                { k: 'landing', label: 'Mejora de Landing' },
                { k: 'prompt', label: 'Mejora del Bot/Chat' },
                { k: 'ads', label: 'Mejora de Ads' }
              ].map(sec => (
                <button key={sec.k} onClick={() => toggleSection(sec.k as any)} className="flex items-center gap-2 text-white hover:text-purple-400">
                  {sections[sec.k as keyof typeof sections] ? <CheckSquare className="w-5 h-5 text-purple-500" /> : <Square className="w-5 h-5 text-gray-500" />}
                  {sec.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fechas */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">2. Comparativa de Fechas</h3>
            <p className="text-xs text-gray-500 mb-3">La IA procesará los chats de estas fechas en segundo plano para el reporte.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'current', label: 'Rango Actual' },
                { k: 'yesterday', label: 'Ayer' },
                { k: 'last7', label: 'Últimos 7 Días' },
                { k: 'last30', label: 'Últimos 30 Días' },
                { k: 'custom', label: 'Personalizado' }
              ].map(tf => (
                <button key={tf.k} onClick={() => toggleTimeframe(tf.k as any)} className="flex items-center gap-2 text-white hover:text-purple-400">
                  {timeframes[tf.k as keyof typeof timeframes] ? <CheckSquare className="w-5 h-5 text-purple-500" /> : <Square className="w-5 h-5 text-gray-500" />}
                  {tf.label}
                </button>
              ))}
            </div>
            
            {timeframes.custom && (
              <div className="mt-3 flex gap-2">
                <input type="date" value={customDates.start} onChange={e => setCustomDates(p => ({...p, start: e.target.value}))} className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm w-full" />
                <input type="date" value={customDates.end} onChange={e => setCustomDates(p => ({...p, end: e.target.value}))} className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-sm w-full" />
              </div>
            )}
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isExporting ? exportProgress : 'Generar y Descargar PDF'}
          </button>
        </div>
      </div>

      {/* HIDDEN REPORT DOM FOR HTML2PDF */}
      <div className="absolute top-0 left-0 w-[800px] bg-white text-gray-900 p-10 z-[-10] opacity-0 pointer-events-none" id="pdf-report-container">
        <div className="mb-8 border-b-4 border-purple-600 pb-4">
          <h1 className="text-3xl font-black text-gray-900">Reporte Ejecutivo NLP & CRO</h1>
          <h2 className="text-xl font-medium text-gray-600 mt-2">Producto: <span className="text-purple-600 font-bold">{productName}</span></h2>
        </div>

        {reportData.map((report, idx) => (
          <div key={idx} className="mb-10 page-break-after-always" style={{ pageBreakAfter: 'always' }}>
            <div className="bg-gray-100 p-3 rounded-lg mb-6 border-l-4 border-blue-500">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-500" />
                Periodo: {report.title}
              </h3>
            </div>

            {sections.words && report.data.words && report.data.words.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-3 border-b pb-1">Nube de Objeciones</h4>
                <div className="flex flex-wrap gap-2">
                  {report.data.words.map((w: any, i: number) => (
                    <span key={i} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold border border-red-200">
                      {w.word} ({w.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {sections.landing && report.data.landing_plan && (
              <div className="mb-6">
                <h4 className="text-lg font-bold text-blue-700 mb-2 border-b pb-1">1. Optimización de Landing Page</h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{report.data.landing_plan}</div>
              </div>
            )}

            {sections.prompt && report.data.prompt_plan && (
              <div className="mb-6">
                <h4 className="text-lg font-bold text-green-700 mb-2 border-b pb-1">2. Optimización del Bot / Cierre</h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{report.data.prompt_plan}</div>
              </div>
            )}

            {sections.ads && report.data.ads_plan && (
              <div className="mb-6">
                <h4 className="text-lg font-bold text-pink-700 mb-2 border-b pb-1">3. Optimización de Anuncios (Ads)</h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{report.data.ads_plan}</div>
              </div>
            )}
          </div>
        ))}
        
        <div className="mt-10 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          Reporte generado automáticamente por Chatify AI
        </div>
      </div>
    </div>
  );
}
