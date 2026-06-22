import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Copy, Save, ArrowUp, ArrowDown, Trash2, ShieldAlert, Image as ImageIcon, Mic, FileText, BarChart3 } from 'lucide-react';

interface Interaction {
  id: string;
  title: string;
  instruction: string;
}

interface FlowTemplate {
  id: string;
  name: string;
  is_base: boolean;
  interactions: Interaction[];
}

export function Funnels() {
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data: orgs } = await (supabase as any).from('organizations').select('id').limit(1);
      if (!orgs || orgs.length === 0) return;
      const orgId = orgs[0].id;

      const { data, error } = await (supabase as any)
        .from('flow_templates')
        .select('*')
        .eq('organization_id', orgId)
        .order('is_base', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
      if (data && data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data[0]);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (templateToCopy: FlowTemplate) => {
    try {
      setSaving(true);
      const { data: orgs } = await (supabase as any).from('organizations').select('id').limit(1);
      const orgId = orgs?.[0]?.id;
      
      const newTemplate = {
        organization_id: orgId,
        name: `${templateToCopy.name} (Copia)`,
        is_base: false,
        interactions: templateToCopy.interactions
      };

      const { data, error } = await (supabase as any).from('flow_templates').insert(newTemplate).select().single();
      if (error) throw error;

      setTemplates([...templates, data]);
      setSelectedTemplate(data);
    } catch (err) {
      console.error('Error duplicando:', err);
      alert('Error duplicando plantilla');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      setSaving(true);
      const { data: orgs } = await (supabase as any).from('organizations').select('id').limit(1);
      const orgId = orgs?.[0]?.id;
      
      const newTemplate = {
        organization_id: orgId,
        name: `Embudo Joggers (ChateaPRO)`,
        is_base: false,
        interactions: [
          {
            "id": "paso-1",
            "title": "Apertura y Filtro",
            "instruction": "Saluda: ¡Hola! Bienvenido. Preséntate usando el nombre y rol que definiste en tus Reglas Base.\\nCrea urgencia: Inventa una excusa realista de alta demanda sobre el producto.\\nPide datos: Regálame por favor tu NOMBRE y cuéntame ¿desde qué CIUDAD nos escribes? para validar cobertura."
          },
          {
            "id": "paso-2",
            "title": "Validación y Descubrimiento",
            "instruction": "Celebra: ¡Qué bacano, [Nombre]!\\nValida la cobertura: Desde [Ciudad], todo en orden: envío gratis y pago contraentrega.\\nDescubre su necesidad: Pregúntale por qué le interesa el producto o qué busca solucionar con él."
          },
          {
            "id": "paso-3",
            "title": "Demostración Visual / Audios",
            "instruction": "Empatiza y muestra opciones.\\nMULTIMEDIA: Si configuraste fotos, videos o audios en tu producto, inyecta OBLIGATORIAMENTE los tags aquí (ejemplo: [MEDIA_1] [MEDIA_2] etc) en el orden que los subiste.\\nPregunta de cierre: ¿Qué te parece? ¿Te gusta alguno en especial?"
          },
          {
            "id": "paso-4",
            "title": "Variantes e Intención",
            "instruction": "Confirma su elección.\\nPregunta: ¿Quieres llevarlo en alguna Talla, Color o Presentación en especial?\\n(Nota: Si tu producto no tiene variantes, cambia este paso para preguntar alguna otra preferencia o pasa directo a cantidades)."
          },
          {
            "id": "paso-5",
            "title": "Cantidades y Combos",
            "instruction": "Confirma su elección anterior.\\nPregunta cantidades: Solo dime cuántos quieres en total para ir armando tu pedido.\\nLa IA automáticamente leerá tus Ofertas/Combos y se los sugerirá sutilmente."
          },
          {
            "id": "paso-6",
            "title": "Datos Faltantes de Envío",
            "instruction": "Pide OBLIGATORIAMENTE los datos faltantes: ¡Excelente! Para generar tu guía de envío, por favor regálame: Dirección exacta, Barrio y tu Número de Teléfono."
          },
          {
            "id": "paso-7",
            "title": "Resumen Final (Tipo Ticket)",
            "instruction": "Muestra un resumen en formato lista con emojis (📝 Resumen del pedido):\\n- Nombre completo\\n- Teléfono\\n- Dirección y Barrio\\n- Ciudad\\n- Productos escogidos\\n- Valor total a pagar en casa (La IA lo calcula con tus ofertas)\\nPregunta de Cierre: ¡Perfecto! ¿Todo en orden? Cuando me confirmes, lo despacho enseguida."
          },
          {
            "id": "paso-8",
            "title": "Despedida Final",
            "instruction": "Una vez el cliente diga 'Sí', despídete amablemente: En breve te hago el envío y te llegará en los próximos días hábiles. ¡Cualquier duda, aquí estaré!"
          }
        ]
      };

      const { data, error } = await (supabase as any).from('flow_templates').insert(newTemplate).select().single();
      if (error) throw error;

      setTemplates([...templates, data]);
      setSelectedTemplate(data);
    } catch (err: any) {
      console.error('Error creando nueva plantilla:', err);
      alert('Error creando plantilla: ' + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    try {
      setSaving(true);
      const { error } = await (supabase as any)
        .from('flow_templates')
        .update({
          name: selectedTemplate.name,
          interactions: selectedTemplate.interactions
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;
      await fetchTemplates();
      alert('Plantilla guardada con éxito');
    } catch (err: any) {
      console.error('Error guardando:', err);
      alert('Error al guardar la plantilla: ' + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate || selectedTemplate.is_base) return;
    if (!confirm('¿Estás seguro de eliminar esta plantilla? Esta acción no se puede deshacer.')) return;
    
    try {
      setSaving(true);
      const { error } = await (supabase as any)
        .from('flow_templates')
        .delete()
        .eq('id', selectedTemplate.id);

      if (error) throw error;
      
      setSelectedTemplate(null);
      await fetchTemplates();
    } catch (err: any) {
      console.error('Error eliminando:', err);
      alert('Error eliminando plantilla: ' + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  const updateInteraction = (index: number, field: keyof Interaction, value: string) => {
    if (!selectedTemplate) return;
    const newInteractions = [...selectedTemplate.interactions];
    newInteractions[index] = { ...newInteractions[index], [field]: value };
    setSelectedTemplate({ ...selectedTemplate, interactions: newInteractions });
  };

  const injectTag = (index: number, tag: string) => {
    if (!selectedTemplate) return;
    const newInteractions = [...selectedTemplate.interactions];
    const currentText = newInteractions[index].instruction || '';
    const separator = currentText.endsWith(' ') || currentText === '' || currentText.endsWith('\n') ? '' : ' ';
    newInteractions[index].instruction = currentText + separator + tag;
    setSelectedTemplate({ ...selectedTemplate, interactions: newInteractions });
  };

  const moveInteraction = (index: number, direction: 'up' | 'down') => {
    if (!selectedTemplate) return;
    const newInteractions = [...selectedTemplate.interactions];
    if (direction === 'up' && index > 0) {
      [newInteractions[index - 1], newInteractions[index]] = [newInteractions[index], newInteractions[index - 1]];
    } else if (direction === 'down' && index < newInteractions.length - 1) {
      [newInteractions[index + 1], newInteractions[index]] = [newInteractions[index], newInteractions[index + 1]];
    }
    setSelectedTemplate({ ...selectedTemplate, interactions: newInteractions });
  };

  const deleteInteraction = (index: number) => {
    if (!selectedTemplate || !confirm('¿Eliminar este paso?')) return;
    const newInteractions = selectedTemplate.interactions.filter((_, i) => i !== index);
    setSelectedTemplate({ ...selectedTemplate, interactions: newInteractions });
  };

  const addInteraction = () => {
    if (!selectedTemplate) return;
    const newInteractions = [
      ...selectedTemplate.interactions,
      { id: `paso-${Date.now()}`, title: 'Nuevo Paso', instruction: '' }
    ];
    setSelectedTemplate({ ...selectedTemplate, interactions: newInteractions });
  };

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Constructor de Embudos</h1>
        <p className="text-slate-500 mt-2">Crea plantillas globales de flujo conversacional y aplícalas a cualquier producto.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Templates */}
        <div className="w-full lg:w-1/4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sticky top-6">
            <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-4 px-2">Mis Plantillas</h2>
            <div className="space-y-2">
              {templates.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${selectedTemplate?.id === tpl.id ? 'bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-600 border border-transparent'}`}
                >
                  <span className="truncate pr-2">{tpl.name}</span>
                  {tpl.is_base && <span title="Plantilla Base Oficial"><ShieldAlert className="w-4 h-4 text-indigo-400 flex-shrink-0" /></span>}
                </button>
              ))}
            </div>
            
            <button 
              onClick={handleCreateNew}
              disabled={saving}
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 hover:border-indigo-400 transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Crear Plantilla Nueva
            </button>

            {/* Panel de Rendimiento */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-4 px-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Rendimiento
              </h2>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                {selectedTemplate ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Leads procesados</span>
                      <span className="font-semibold text-slate-700">
                        {selectedTemplate.is_base ? 'Mil+' : '0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Tasa de Cierre</span>
                      <span className="font-semibold text-emerald-600">
                        {selectedTemplate.is_base ? '15.2%' : '0.0%'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-200 leading-relaxed">
                      💡 Duplica el embudo y cambia la posición de las fotos para medir cuál versión vende más.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-2">Selecciona un embudo</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="w-full lg:w-3/4">
          {selectedTemplate ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  {selectedTemplate.is_base ? (
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{selectedTemplate.name}</h2>
                      <p className="text-sm text-slate-500 mt-1">El embudo base no puede ser editado. Duplícalo para crear tu propia versión.</p>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Nombre de la Plantilla</label>
                      <input
                        type="text"
                        value={selectedTemplate.name}
                        onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                        className="w-full text-xl font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {!selectedTemplate.is_base && (
                    <button 
                      onClick={handleDeleteTemplate}
                      disabled={saving}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Eliminar plantilla"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleDuplicate(selectedTemplate)}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                  >
                    <Copy className="w-4 h-4" /> Duplicar
                  </button>
                  
                  {!selectedTemplate.is_base && (
                    <button 
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-indigo-200"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Guardar
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-4 bg-slate-50">
                {selectedTemplate.interactions.map((interaction, index) => (
                  <div key={interaction.id || index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 transition-all hover:border-indigo-200 group">
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      
                      {/* Controls */}
                      {!selectedTemplate.is_base && (
                        <div className="flex sm:flex-col gap-2 items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveInteraction(index, 'up')} disabled={index === 0} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md disabled:opacity-30">
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-bold text-slate-400">{index + 1}</span>
                          <button onClick={() => moveInteraction(index, 'down')} disabled={index === selectedTemplate.interactions.length - 1} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md disabled:opacity-30">
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {selectedTemplate.is_base && (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold text-sm shrink-0">
                          {index + 1}
                        </div>
                      )}

                      <div className="flex-1 w-full space-y-3">
                        <div className="flex justify-between items-center">
                          <input
                            type="text"
                            value={interaction.title}
                            disabled={selectedTemplate.is_base}
                            placeholder="Ej: Apertura y Saludo"
                            onChange={(e) => updateInteraction(index, 'title', e.target.value)}
                            className="font-semibold text-slate-800 bg-transparent border-none p-0 focus:ring-0 text-lg w-full placeholder-slate-300 disabled:opacity-100 outline-none"
                          />
                          {!selectedTemplate.is_base && (
                            <button onClick={() => deleteInteraction(index)} className="text-slate-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <textarea
                          value={interaction.instruction}
                          disabled={selectedTemplate.is_base}
                          placeholder="Describe exactamente qué debe decir la IA en este paso..."
                          onChange={(e) => updateInteraction(index, 'instruction', e.target.value)}
                          rows={3}
                          className="w-full text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none outline-none disabled:bg-slate-50 disabled:opacity-100 disabled:cursor-not-allowed"
                        />
                        
                        {!selectedTemplate.is_base && (
                          <div className="flex flex-wrap gap-2 items-center mt-2">
                            <span className="text-xs font-semibold text-slate-400 uppercase mr-1">Inyectar:</span>
                            <button onClick={() => injectTag(index, '[MEDIA_1]')} className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-xs font-medium hover:bg-indigo-100 transition-colors">
                              <ImageIcon className="w-3 h-3" /> Foto 1
                            </button>
                            <button onClick={() => injectTag(index, '[MEDIA_2]')} className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-xs font-medium hover:bg-indigo-100 transition-colors">
                              <ImageIcon className="w-3 h-3" /> Foto 2
                            </button>
                            <select 
                              onChange={(e) => {
                                if (e.target.value) {
                                  injectTag(index, `[MEDIA_${e.target.value}]`);
                                  e.target.value = '';
                                }
                              }}
                              className="px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-xs font-medium hover:bg-indigo-100 transition-colors outline-none cursor-pointer appearance-none text-center"
                              title="Inyectar más fotos"
                            >
                              <option value="">+ Más Fotos ▼</option>
                              {[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(n => (
                                <option key={n} value={n}>Foto {n}</option>
                              ))}
                            </select>
                            <button onClick={() => injectTag(index, '[AUDIO_1]')} className="flex items-center gap-1 px-2 py-1 bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100 rounded text-xs font-medium hover:bg-fuchsia-100 transition-colors ml-2">
                              <Mic className="w-3 h-3" /> Audio 1
                            </button>
                            <button onClick={() => injectTag(index, '[FILE_1]')} className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-xs font-medium hover:bg-emerald-100 transition-colors">
                              <FileText className="w-3 h-3" /> PDF 1
                            </button>
                          </div>
                        )}

                        {/* Visual Badges Summary */}
                        {(() => {
                          const text = interaction.instruction || '';
                          const mediaCount = (text.match(/\[MEDIA_\d+\]/g) || []).length;
                          const audioCount = (text.match(/\[AUDIO_\d+\]/g) || []).length;
                          const fileCount = (text.match(/\[FILE_\d+\]/g) || []).length;
                          
                          if (mediaCount === 0 && audioCount === 0 && fileCount === 0) return null;
                          return (
                            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                              <span className="text-xs font-medium text-slate-500">Este paso enviará:</span>
                              {mediaCount > 0 && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                                  <ImageIcon className="w-3 h-3" /> {mediaCount} Foto{mediaCount > 1 ? 's' : ''}
                                </span>
                              )}
                              {audioCount > 0 && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-fuchsia-100 text-fuchsia-700 rounded-full text-xs font-semibold">
                                  <Mic className="w-3 h-3" /> {audioCount} Audio{audioCount > 1 ? 's' : ''}
                                </span>
                              )}
                              {fileCount > 0 && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                                  <FileText className="w-3 h-3" /> {fileCount} Archivo{fileCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}

                {!selectedTemplate.is_base && (
                  <button onClick={addInteraction} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-medium hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> Agregar Siguiente Interacción
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
              <h3 className="text-lg font-medium text-slate-900 mb-2">Selecciona una plantilla</h3>
              <p className="text-slate-500">Elige un embudo de la izquierda para ver sus interacciones o duplicarlo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
