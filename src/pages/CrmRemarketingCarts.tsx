import { useState, useEffect } from 'react';
import {
  ShoppingCart, MessageSquare, MessageSquareText, MapPin,
  CheckCircle2, Users, Search, Loader2, Trash2,
  Send, Clock, TrendingUp, DollarSign, Zap, Plus, X, FlaskConical
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CrmFilters } from '../components/CrmFilters';
import type { CrmFilterState } from '../components/CrmFilters';
import { LeadChatPanel } from '../components/LeadChatPanel';
import { CountryFlag } from '../utils/flags';

// ─── Column definitions (Funnel Stages) ───────────────────────────────
const columns = [
  {
    id: 'abandoned',
    title: 'Abandono Detectado',
    emoji: '🛒',
    icon: ShoppingCart,
    accent: '#818CF8',
    filterFn: (l: any) => l.status === 'abandoned',
    dropStatus: 'abandoned',
    dropTouch: 0,
  },
  {
    id: 'touch_1',
    title: '1er Contacto',
    emoji: '📩',
    icon: MessageSquare,
    accent: '#60A5FA',
    filterFn: (l: any) => l.status === 'bot_sent' && (l.recovery_touch === 1 || l.recovery_touch === 0),
    dropStatus: 'bot_sent',
    dropTouch: 1,
  },
  {
    id: 'touch_2',
    title: '2do Contacto',
    emoji: '📩',
    icon: MessageSquare,
    accent: '#FB923C',
    filterFn: (l: any) => l.status === 'bot_sent' && l.recovery_touch === 2,
    dropStatus: 'bot_sent',
    dropTouch: 2,
  },
  {
    id: 'touch_3',
    title: 'Último Intento',
    emoji: '⚠️',
    icon: MessageSquare,
    accent: '#F87171',
    filterFn: (l: any) => l.status === 'bot_sent' && l.recovery_touch === 3,
    dropStatus: 'bot_sent',
    dropTouch: 3,
  },
  {
    id: 'client_replied',
    title: 'En Negociación',
    emoji: '💬',
    icon: MessageSquareText,
    accent: '#FBBF24',
    filterFn: (l: any) => l.status === 'client_replied',
    dropStatus: 'client_replied',
  },
  {
    id: 'verifying_address',
    title: 'Verificando Dir.',
    emoji: '📍',
    icon: MapPin,
    accent: '#A78BFA',
    filterFn: (l: any) => l.status === 'verifying_address',
    dropStatus: 'verifying_address',
  },
  {
    id: 'recovered',
    title: 'Venta Recuperada',
    emoji: '✅',
    icon: CheckCircle2,
    accent: '#34D399',
    filterFn: (l: any) => l.status === 'recovered',
    dropStatus: 'recovered',
  },
  {
    id: 'lost',
    title: 'Remarketing',
    emoji: '📢',
    icon: Users,
    accent: '#94A3B8',
    filterFn: (l: any) => l.status === 'lost',
    dropStatus: 'lost',
  },
];

// ─── Component ────────────────────────────────────────────────────────
export function CrmRemarketingCarts() {
  const [filters, setFilters] = useState<CrmFilterState | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [forcingSend, setForcingSend] = useState<string | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testLead, setTestLead] = useState({ name: '', phone: '', productName: '', totalPrice: '' });
  const [creatingTest, setCreatingTest] = useState(false);

  useEffect(() => {
    if (filters) loadLeads(filters);
    else setLeads([]);
  }, [filters]);

  async function loadLeads(f: CrmFilterState) {
    setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*, stores(name, country)')
        .eq('board_type', 'remarketing_carts')
        .order('created_at', { ascending: false });

      if (f.storeIds && f.storeIds.length > 0) query = query.in('store_id', f.storeIds);
      else if (f.storeIds && f.storeIds.length === 0)
        query = query.eq('store_id', '00000000-0000-0000-0000-000000000000');
      if (f.dateStart) query = query.gte('created_at', f.dateStart);
      if (f.dateEnd) query = query.lte('created_at', f.dateEnd);

      const { data } = await query;
      setLeads(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  // ── Force send now (manual trigger for one lead) ─────────────────────
  async function handleForceSend(lead: any) {
    if (!lead.store_id) return;
    setForcingSend(lead.id);
    try {
      const res = await fetch(`/api/cart-recovery?leadId=${lead.id}`);
      const result = await res.json();
      if (res.ok) {
        // Refresh this lead's status
        const { data } = await supabase.from('leads').select('*, stores(name, country)').eq('id', lead.id).single();
        if (data) setLeads(prev => prev.map(l => l.id === lead.id ? data : l));
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ Error: ${result.error || 'Error desconocido'}\n${result.log?.join('\n') || ''}`);
      }
    } catch (e) { console.error(e); }
    setForcingSend(null);
  }

  // ── Create test lead ──────────────────────────────────────────────────
  async function handleCreateTestLead() {
    if (!filters?.storeIds?.length) {
      alert('Selecciona una tienda primero en los filtros');
      return;
    }
    setCreatingTest(true);
    try {
      const res = await fetch('/api/cart-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: filters.storeIds[0],
          name: testLead.name,
          phone: testLead.phone,
          productName: testLead.productName || 'Creatina Monohidrato',
          totalPrice: testLead.totalPrice || '85000'
        })
      });
      const result = await res.json();
      if (res.ok) {
        setShowTestModal(false);
        setTestLead({ name: '', phone: '', productName: '', totalPrice: '' });
        // Reload leads
        if (filters) loadLeads(filters);
        alert('✅ Lead de prueba creado. Usa "Enviar mensaje ahora" para enviar el Touch 1.');
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (e) { console.error(e); }
    setCreatingTest(false);
  }

  // ── Drag and Drop ─────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, col: typeof columns[0]) => {
    e.preventDefault();
    if (!draggedLeadId) return;
    const updates: any = { status: col.dropStatus };
    if (col.dropTouch !== undefined) updates.recovery_touch = col.dropTouch;
    const lead = leads.find(l => l.id === draggedLeadId);
    
    setLeads(prev => prev.map(l => l.id === draggedLeadId ? { ...l, ...updates } : l));
    await (supabase as any).from('leads').update(updates).eq('id', draggedLeadId);
    
    // Disparar evento de Tracking a FB CAPI, TikTok y Google si es recuperado
    if (col.dropStatus === 'recovered' && lead) {
      fetch('/api/tracking/fire-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: draggedLeadId,
          eventName: 'Purchase',
          value: lead.total_price ? Number(lead.total_price) : 85000,
          currency: lead.stores?.country === 'MX' ? 'MXN' : 'COP',
          phone: lead.phone
        })
      }).catch(err => console.error('Error firing pixel event', err));
    }
    
    setDraggedLeadId(null);
  };

  // ── Filtered leads ─────────────────────────────────────────────────────
  const filteredLeads = searchQuery.trim()
    ? leads.filter(l => {
      const q = searchQuery.toLowerCase();
      return (
        l.name?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.product_name?.toLowerCase().includes(q) ||
        l.tracking_id?.toLowerCase().includes(q)
      );
    })
    : leads;

  // ── Stats ────────────────────────────────────────────────────────────
  const totalLeads = leads.length;
  const recovered = leads.filter(l => l.status === 'recovered').length;
  const inProgress = leads.filter(l => ['bot_sent', 'client_replied', 'verifying_address'].includes(l.status)).length;
  const recoveryRate = totalLeads > 0 ? Math.round((recovered / totalLeads) * 100) : 0;
  const estimatedRevenue = leads
    .filter(l => l.status === 'recovered')
    .reduce((acc, l) => acc + (Number(l.total_price) || 0), 0);

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col pb-8 relative">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
              CRM — Recuperación de Carritos
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Bot automático · Street View · Base Remarketing
              <span className="ml-2 text-orange-600 font-semibold">Regla Meta: Plantilla obligatoria</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTestModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
            >
              <FlaskConical className="w-3.5 h-3.5" /> Lead de Prueba
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar nombre, celular, producto..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 w-72"
              />
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Total Leads</p>
              <p className="text-xl font-bold text-gray-900">{totalLeads}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Tasa de Recuperación</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-xl font-bold text-gray-900">{recoveryRate}%</p>
                <span className="text-[10px] text-gray-400 font-medium">({recovered} de {totalLeads} carritos)</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium" title="Clientes con los que Sophia está chateando actualmente">En Proceso (Chats Activos)</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-xl font-bold text-gray-900">{inProgress}</p>
                <span className="text-[10px] text-gray-400 font-medium">clientes conversando</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Ingresos Recuperados</p>
              <p className="text-xl font-bold text-gray-900">${estimatedRevenue.toLocaleString('es-CO')}</p>
            </div>
          </div>
        </div>
      </div>

      <CrmFilters onFilterChange={setFilters} />

      {/* ── Kanban Board ─────────────────────────────────────────────── */}
      <div className="flex-1 flex gap-2.5 overflow-x-auto pb-4 snap-x relative mt-4">
        {columns.map((col) => {
          const colLeads = filteredLeads.filter(col.filterFn);
          return (
            <div
              key={col.id}
              className="flex-shrink-0 w-[220px] flex flex-col snap-center h-full"
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, col)}
            >
              {/* Column header - minimal & elegant */}
              <div
                className="flex items-center justify-between px-3 py-2 rounded-t-lg bg-slate-50 border border-slate-200/80"
                title={col.title}
                style={{ borderTopColor: col.accent, borderTopWidth: 3 }}
              >
                <h3 className="text-[11px] font-bold text-slate-600 tracking-wide">
                  {col.emoji} {col.title}
                </h3>
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: col.accent }}
                >
                  {colLeads.length}
                </span>
              </div>

              {/* Column body */}
              <div className="flex-1 p-1.5 border-x border-b rounded-b-lg border-slate-200/80 bg-slate-50/50 flex flex-col gap-1.5 overflow-y-auto pb-10">
                {loading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : colLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    accent={col.accent}
                    onDragStart={handleDragStart}
                    onClick={() => setSelectedLead(lead)}
                    onForceSend={handleForceSend}
                    isForcingSend={forcingSend === lead.id}
                  />
                ))}
                {!loading && colLeads.length === 0 && (
                  <div className="h-16 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-medium text-slate-300">
                    Vacío
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Chat Panel ────────────────────────────────────────────────── */}
      {selectedLead && (
        <LeadChatPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onDelete={() => {}}
          onBan={() => {}}
          onUpdateLead={updatedLead => {
            if (updatedLead.board_type !== 'remarketing_carts') {
              setLeads(leads.filter(l => l.id !== updatedLead.id));
              setSelectedLead(null);
            } else {
              setLeads(leads.map(l => l.id === updatedLead.id ? updatedLead : l));
            }
          }}
        />
      )}

      {/* ── Test Lead Modal ──────────────────────────────────────────── */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-900">Crear Lead de Prueba</h3>
              </div>
              <button onClick={() => setShowTestModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Nombre del cliente *</label>
                <input
                  type="text"
                  placeholder="Ej: Felipe Ríos"
                  value={testLead.name}
                  onChange={e => setTestLead({...testLead, name: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Teléfono WhatsApp *</label>
                <input
                  type="text"
                  placeholder="Ej: 3001234567"
                  value={testLead.phone}
                  onChange={e => setTestLead({...testLead, phone: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Producto</label>
                <input
                  type="text"
                  placeholder="Ej: Creatina Monohidrato"
                  value={testLead.productName}
                  onChange={e => setTestLead({...testLead, productName: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Precio Total</label>
                <input
                  type="text"
                  placeholder="Ej: 85000"
                  value={testLead.totalPrice}
                  onChange={e => setTestLead({...testLead, totalPrice: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowTestModal(false)} className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleCreateTestLead}
                disabled={!testLead.name || !testLead.phone || creatingTest}
                className="flex-1 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creatingTest ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : <><Plus className="w-4 h-4" /> Crear Lead</>}
              </button>
            </div>

            <p className="text-[10px] text-gray-400 text-center mt-3">
              El lead aparecerá en "Abandono Detectado". Usa "Enviar mensaje" para disparar el Touch 1.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lead Card (Compact Premium) ──────────────────────────────────────
function LeadCard({
  lead, accent, onDragStart, onClick, onForceSend, isForcingSend
}: {
  lead: any;
  accent: string;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: () => void;
  onForceSend: (lead: any) => void;
  isForcingSend: boolean;
}) {
  const [deleting, setDeleting] = useState(false);

  const timeSince = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar a ${lead.name}?`)) return;
    setDeleting(true);
    try {
      await supabase.from('leads').delete().eq('id', lead.id);
      window.location.reload();
    } catch { setDeleting(false); }
  };

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      onClick={onClick}
      className={`bg-white rounded-lg border border-slate-100 cursor-grab active:cursor-grabbing hover:border-slate-300 hover:shadow-sm transition-all relative group ${deleting ? 'opacity-40' : ''}`}
    >
      {/* Accent line */}
      <div className="absolute left-0 top-0 w-[3px] h-full rounded-l-lg" style={{ backgroundColor: accent, opacity: 0.7 }} />

      <div className="pl-2.5 pr-2 py-2">
        {/* Row 1: Name + delete */}
        <div className="flex items-center justify-between gap-1">
          <h4 className="font-semibold text-slate-800 text-[12px] leading-tight truncate flex-1">{lead.name || 'Sin nombre'}</h4>
          <div className="flex items-center gap-1 flex-shrink-0">
            {lead.stores?.country && <CountryFlag country={lead.stores.country} />}
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 transition-all"
              title="Eliminar"
            >
              <Trash2 className="w-3 h-3 text-slate-300 hover:text-red-500" />
            </button>
          </div>
        </div>

        {/* Row 2: Product + Price compact */}
        {(lead.product_name || lead.total_price) && (
          <div className="flex items-center justify-between mt-1 gap-1">
            {lead.product_name && (
              <p className="text-[10px] text-slate-500 truncate flex-1" title={lead.product_name}>
                {lead.product_name.length > 25 ? lead.product_name.substring(0, 25) + '...' : lead.product_name}
              </p>
            )}
            {lead.total_price && (
              <span className="text-[10px] font-bold text-emerald-600 flex-shrink-0">${Number(lead.total_price).toLocaleString('es-CO')}</span>
            )}
          </div>
        )}

        {/* Row 3: Meta badges (compact) */}
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          <span className="text-[9px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
            {lead.phone?.slice(-4)}
          </span>
          {lead.stores?.name && (
            <span className="text-[9px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded truncate max-w-[60px]">
              {lead.stores.name}
            </span>
          )}
          {lead.recovery_last_sent_at && (
            <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{timeSince(lead.recovery_last_sent_at)}
            </span>
          )}
        </div>

        {/* Row 4: Send button - compact, only for actionable */}
        {lead.status !== 'recovered' && lead.status !== 'lost' && lead.status !== 'client_replied' && lead.status !== 'verifying_address' && (
          <div className="mt-1.5" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onForceSend(lead)}
              disabled={isForcingSend}
              className="w-full text-[10px] font-semibold text-white py-1.5 rounded-md flex items-center justify-center gap-1 transition-colors shadow-sm"
              style={{ backgroundColor: accent }}
            >
              {isForcingSend
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Enviando...</>
                : <><Send className="w-3 h-3" /> Enviar mensaje</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
