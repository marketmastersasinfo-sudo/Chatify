import { useState } from 'react';
import { Download, X, Calendar, CheckSquare, Square } from 'lucide-react';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  currentAnalysis: any;
}

export function ExportPdfModal({ isOpen, onClose, productName, currentAnalysis }: ExportPdfModalProps) {
  const [sections, setSections] = useState({
    words: true,
    landing: true,
    prompt: true,
    ads: true
  });

  if (!isOpen) return null;

  const handleExport = () => {
    // Es instantáneo, no necesitamos estados de carga.
    window.print();
    onClose();
  };

  const toggleSection = (key: keyof typeof sections) => setSections(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
      <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Download className="w-6 h-6 text-purple-500" />
          Exportar Reporte PDF
        </h2>

        <div className="space-y-6">
          <p className="text-sm text-gray-400">
            Se generará un PDF con el análisis y plan de acción de <strong>{productName}</strong> que tienes actualmente en pantalla.
          </p>

          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Secciones a incluir</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { k: 'words', label: 'Nube de Objeciones' },
                { k: 'landing', label: '1. Mejora de Landing Page' },
                { k: 'prompt', label: '2. Mejora del Bot / Chat' },
                { k: 'ads', label: '3. Mejora de Anuncios (Ads)' }
              ].map(sec => (
                <button key={sec.k} onClick={() => toggleSection(sec.k as any)} className="flex items-center gap-3 text-white hover:text-purple-400 transition-colors w-full text-left p-2 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500/50">
                  {sections[sec.k as keyof typeof sections] ? <CheckSquare className="w-5 h-5 text-purple-500" /> : <Square className="w-5 h-5 text-gray-500" />}
                  {sec.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleExport}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all"
          >
            <Download className="w-5 h-5" />
            Descargar Documento
          </button>
        </div>
      </div>

      {/* HIDDEN REPORT DOM FOR PRINTING */}
      <div className="hidden print:block absolute top-0 left-0 w-full bg-white text-black p-10 z-[9999]" id="pdf-report-container">
        <div className="mb-8 border-b-4 border-purple-600 pb-4">
          <h1 className="text-3xl font-black text-gray-900">Reporte Ejecutivo NLP & CRO</h1>
          <h2 className="text-xl font-medium text-gray-600 mt-2">Producto: <span className="text-purple-600 font-bold">{productName}</span></h2>
        </div>

        {currentAnalysis && (
          <div className="mb-10">
            <div className="bg-gray-100 p-3 rounded-lg mb-6 border-l-4 border-blue-500">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-500" />
                Análisis Actual
              </h3>
            </div>

            {sections.words && currentAnalysis.words && currentAnalysis.words.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-800 mb-3 border-b pb-1">Nube de Objeciones</h4>
                <div className="flex flex-wrap gap-2">
                  {currentAnalysis.words.map((w: any, i: number) => (
                    <span key={i} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold border border-red-200">
                      {w.word} ({w.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {sections.landing && currentAnalysis.landing_plan && (
              <div className="mb-8">
                <h4 className="text-xl font-bold text-blue-700 mb-2 border-b pb-1">1. Optimización de Landing Page</h4>
                <div className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">{currentAnalysis.landing_plan}</div>
              </div>
            )}

            {sections.prompt && currentAnalysis.prompt_plan && (
              <div className="mb-8">
                <h4 className="text-xl font-bold text-green-700 mb-2 border-b pb-1">2. Optimización del Bot / Cierre</h4>
                <div className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">{currentAnalysis.prompt_plan}</div>
              </div>
            )}

            {sections.ads && currentAnalysis.ads_plan && (
              <div className="mb-8">
                <h4 className="text-xl font-bold text-pink-700 mb-2 border-b pb-1">3. Optimización de Anuncios (Ads)</h4>
                <div className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">{currentAnalysis.ads_plan}</div>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-10 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          Reporte generado automáticamente por Chatify AI
        </div>
      </div>
    </div>
  );
}
