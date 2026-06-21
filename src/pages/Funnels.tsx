import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Copy, Save, ArrowUp, ArrowDown, Trash2, ShieldAlert } from 'lucide-react';

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
            "instruction": "Saluda: ¡Hola! Bienvenido a ComprasYa. Mi nombre es Sebas y soy el encargado de asesorarte hoy.\\nCrea urgencia: Te pido un toque de paciencia, parcero, que acabamos de lanzar la promo y esta vaina está FULL.\\nPide datos iniciales: Regálame por favor tu NOMBRE y cuéntame ¿desde qué CIUDAD nos escribes? para validar cobertura."
          },
          {
            "id": "paso-2",
            "title": "Validación y Descubrimiento",
            "instruction": "Celebra: ¡Qué bacano, [Nombre]!\\nValida la cobertura: Desde [Ciudad], todo en orden: envío gratis, pago contraentrega y llega en 2-6 días hábiles.\\nDescubre su necesidad: Contame, bro… ¿qué querés mejorar en tu pinta? ¿Comodidad, estilo o renovar closet?"
          },
          {
            "id": "paso-3",
            "title": "Demostración Visual (Fotos)",
            "instruction": "Empatiza: Mira estos colores disponibles, bro:\\nInyecta OBLIGATORIAMENTE todas las imágenes juntas enviando los tags uno tras otro (ejemplo: [MEDIA_1] [MEDIA_2] [MEDIA_3] etc).\\nPregunta de cierre: ¿Te gusta alguno en especial?"
          },
          {
            "id": "paso-4",
            "title": "Tallas e Intención",
            "instruction": "Confirma: Perfecto, bro. Aquí tienes los colores que elegiste.\\nPregunta: ¿Quieres llevarlos en talla M, L o XL?\\n(Nota: Si preguntan, asesora. Ej: Talla 38 es como M o L, recomendar subir una talla si quieren más espacio)."
          },
          {
            "id": "paso-5",
            "title": "Cantidades y Combos",
            "instruction": "Confirma la talla elegida.\\nPregunta cantidades: Solo dime cuántos quieres en total para ir armando tu pedido.\\nRecuerda sutilmente que tenemos promos (ej: lleva 1 o lleva el combo de 3)."
          },
          {
            "id": "paso-6",
            "title": "Datos Faltantes de Envío",
            "instruction": "Pide los datos faltantes que el cliente no haya dado aún: ¡Excelente! Para generar tu guía de envío, por favor regálame: Dirección completa, Barrio y tu Número de Teléfono."
          },
          {
            "id": "paso-7",
            "title": "Resumen Final (Tipo Ticket)",
            "instruction": "Muestra un resumen en formato lista con emojis (📝 Resumen del pedido):\\n- Nombre completo\\n- Teléfono\\n- Dirección y Barrio\\n- Ciudad\\n- Productos escogidos y Talla\\n- Valor total a pagar en casa\\nPregunta: ¡Perfecto, bro! Ya tengo todos los datos listos para despachar. ¿Todo en orden? Cuando me confirmes, lo despacho enseguida."
          },
          {
            "id": "paso-8",
            "title": "Despedida Final",
            "instruction": "Despídete: ¡Gracias, bro! En breve te hago el envío y te llegará en 2-6 días hábiles. Cualquier duda, aquí estaré. ¡Gracias por confiar en UrbanFit!"
          }
        ]
      };

      const { data, error } = await (supabase as any).from('flow_templates').insert(newTemplate).select().single();
      if (error) throw error;

      setTemplates([...templates, data]);
      setSelectedTemplate(data);
    } catch (err) {
      console.error('Error creando nueva plantilla:', err);
      alert('Error creando plantilla');
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
    } catch (err) {
      console.error('Error guardando:', err);
      alert('Error al guardar la plantilla');
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
