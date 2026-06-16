import { useState, useEffect } from 'react';
import {
  ShoppingCart, MessageSquare, MessageSquareText, MapPin,
  CheckCircle2, Users, Search, Loader2,
  Ban, Send, Clock, TrendingUp, DollarSign, Zap, Plus, X, FlaskConical
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CrmFilters } from '../components/CrmFilters';
import type { CrmFilterState } from '../components/CrmFilters';
import { LeadChatPanel } from '../components/LeadChatPanel';
import { CountryFlag } from '../utils/flags';
import { TrafficBadge } from '../components/TrafficBadge';

// ─── Column definitions (Funnel Stages) ───────────────────────────────
const columns = [
  {
    id: 'abandoned',
    title: '🛒 Abandono Detectado',
    icon: ShoppingCart,
    accent: '#6366F1',
    bg: 'bg-indigo-50/40',
    border: 'border-indigo-200',
    headerBg: 'bg-indigo-100',
    headerText: 'text-indigo-800',
    tooltip: 'Acaba de abandonar el carrito — el bot aún no ha contactado.',
    filterFn: (l: any) => l.status === 'abandoned',
    dropStatus: 'abandoned',
    dropTouch: 0,
  },
  {
    id: 'touch_1',
    title: '📩 1er Contacto',
    icon: MessageSquare,
    accent: '#3B82F6',
    bg: 'bg-blue-50/40',
    border: 'border-blue-200',
    headerBg: 'bg-blue-100',
    headerText: 'text-blue-800',
    tooltip: 'Primer mensaje enviado (30min) — esperando respuesta.',
    filterFn: (l: any) => l.status === 'bot_sent' && (l.recovery_touch === 1 || l.recovery_touch === 0),
    dropStatus: 'bot_sent',
    dropTouch: 1,
  },
  {
    id: 'touch_2',
    title: '📩 2do Contacto',
    icon: MessageSquare,
    accent: '#F97316',
    bg: 'bg-orange-50/40',
    border: 'border-orange-200',
    headerBg: 'bg-orange-100',
    headerText: 'text-orange-800',
    tooltip: 'Segundo mensaje enviado (4h) — seguimiento activo.',
    filterFn: (l: any) => l.status === 'bot_sent' && l.recovery_touch === 2,
    dropStatus: 'bot_sent',
    dropTouch: 2,
  },
  {
    id: 'touch_3',
    title: '📩 Último Intento',
    icon: MessageSquare,
    accent: '#EF4444',
    bg: 'bg-red-50/40',
    border: 'border-red-200',
    headerBg: 'bg-red-100',
    headerText: 'text-red-800',
    tooltip: 'Tercer y último mensaje (24h) — si no responde, se pierde.',
    filterFn: (l: any) => l.status === 'bot_sent' && l.recovery_touch === 3,
    dropStatus: 'bot_sent',
    dropTouch: 3,
  },
  {
    id: 'client_replied',
    title: '💬 En Negociación',
    icon: MessageSquareText,
    accent: '#EAB308',
    bg: 'bg-yellow-50/40',
    border: 'border-yellow-200',
    headerBg: 'bg-yellow-100',
    headerText: 'text-yellow-800',
    tooltip: 'El cliente respondió — Sophia está cerrando la venta.',
    filterFn: (l: any) => l.status === 'client_replied',
    dropStatus: 'client_replied',
  },
  {
    id: 'verifying_address',
    title: '📍 Verificando Dirección',
    icon: MapPin,
    accent: '#8B5CF6',
    bg: 'bg-purple-50/40',
    border: 'border-purple-200',
    headerBg: 'bg-purple-100',
    headerText: 'text-purple-800',
    tooltip: 'Street View enviado — esperando que confirme la fachada.',
    filterFn: (l: any) => l.status === 'verifying_address',
    dropStatus: 'verifying_address',
  },
  {
    id: 'recovered',
    title: '✅ Venta Recuperada',
    icon: CheckCircle2,
    accent: '#10B981',
    bg: 'bg-green-50/40',
    border: 'border-green-200',
    headerBg: 'bg-green-100',
    headerText: 'text-green-800',
    tooltip: 'Pedido 100% confirmado — dirección verificada.',
    filterFn: (l: any) => l.status === 'recovered',
    dropStatus: 'recovered',
  },
  {
    id: 'lost',
    title: '📢 Base Remarketing',
    icon: Users,
    accent: '#6B7280',
    bg: 'bg-gray-50/40',
    border: 'border-gray-200',
    headerBg: 'bg-gray-100',
    headerText: 'text-gray-700',
    tooltip: 'No se recuperó — guardado para campañas de difusión masiva.',
    filterFn: (l: any) => l.status === 'lost',
    dropStatus: 'lost',
  },
];

const TOUCH_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Nuevo', color: 'bg-gray-100 text-gray-500' },
  1: { label: 'T1 · 30min', color: 'bg-blue-100 text-blue-700' },
  2: { label: 'T2 · 4h', color: 'bg-orange-100 text-orange-700' },
  3: { label: 'T3 · 24h', color: 'bg-red-100 text-red-700' },
};

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
    setLeads(prev => prev.map(l => l.id === draggedLeadId ? { ...l, ...updates } : l));
    await (supabase as any).from('leads').update(updates).eq('id', draggedLeadId);
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
              <p className="text-xl font-bold text-gray-900">{recoveryRate}%</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">En Proceso</p>
              <p className="text-xl font-bold text-gray-900">{inProgress}</p>
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
      <div className="flex-1 flex gap-3 overflow-x-auto pb-4 snap-x relative mt-4">
        {columns.map((col) => {
          const colLeads = filteredLeads.filter(col.filterFn);
          return (
            <div
              key={col.id}
              className="flex-shrink-0 w-[240px] flex flex-col snap-center h-full"
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, col)}
            >
              {/* Column header */}
              <div
                className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border-x border-t ${col.border} ${col.bg}`}
                title={col.tooltip}
                style={{ borderTopColor: col.accent, borderTopWidth: 3 }}
              >
                <div className="flex items-center gap-2">
                  <col.icon className="w-4 h-4" style={{ color: col.accent }} />
                  <h3 className="text-xs font-bold text-gray-700">{col.title}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.headerBg} ${col.headerText}`}>
                  {colLeads.length}
                </span>
              </div>

              {/* Column body */}
              <div className={`flex-1 p-2 border-x border-b rounded-b-xl ${col.border} ${col.bg} flex flex-col gap-2 overflow-y-auto pb-12`}>
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
                  <div className="h-20 border-2 border-dashed border-gray-200/70 rounded-xl flex items-center justify-center text-xs font-semibold text-gray-300">
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
              El lead aparecerá en "Carrito Abandonado". Usa "Enviar mensaje ahora" para disparar el Touch 1.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lead Card ────────────────────────────────────────────────────────
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
  const touch = lead.recovery_touch ?? 0;
  const touchMeta = TOUCH_LABELS[touch] || TOUCH_LABELS[0];

  const timeSince = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-all relative overflow-hidden"
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 w-1 h-full rounded-l-xl" style={{ backgroundColor: accent }} />

      <div className="pl-3 pr-3 pt-2.5 pb-2.5">
        {/* Row 1: Name + Store */}
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-900 text-sm leading-tight truncate max-w-[160px]">{lead.name || 'Sin nombre'}</h4>
          {lead.stores?.name && (
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-0.5">
              {lead.stores?.country && <CountryFlag country={lead.stores.country} />}
              {lead.stores.name}
            </span>
          )}
        </div>

        {/* Row 2: SEND BUTTON — right after name, impossible to miss */}
        {lead.status !== 'recovered' && lead.status !== 'lost' && lead.status !== 'client_replied' && lead.status !== 'verifying_address' && (
          <div className="mt-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onForceSend(lead)}
              disabled={isForcingSend}
              className="w-full text-[11px] font-bold bg-purple-600 text-white py-2 rounded-lg flex items-center justify-center gap-1.5 hover:bg-purple-700 transition-colors shadow-sm"
            >
              {isForcingSend
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
                : <><Send className="w-3.5 h-3.5" /> 📩 Enviar mensaje ahora</>}
            </button>
          </div>
        )}

        {/* Row 3: Product (truncated) */}
        {lead.product_name && (
          <p className="text-[11px] text-purple-600 font-medium mt-1.5 truncate" title={lead.product_name}>
            🛍️ {lead.product_name.length > 35 ? lead.product_name.substring(0, 35) + '...' : lead.product_name}
          </p>
        )}

        {/* Row 4: Phone + Price inline */}
        <div className="flex items-center justify-between mt-1">
          <p className="text-[11px] text-gray-400 font-mono">{lead.phone}</p>
          {lead.total_price && (
            <p className="text-xs font-bold text-green-600">${Number(lead.total_price).toLocaleString('es-CO')}</p>
          )}
        </div>

        {/* Row 5: Badges */}
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          <TrafficBadge source={lead.traffic_source} />
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${touchMeta.color}`}>
            {touchMeta.label}
          </span>
          {lead.recovery_last_sent_at && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> hace {timeSince(lead.recovery_last_sent_at)}
            </span>
          )}
          {lead.is_banned && (
            <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5">
              <Ban className="w-2.5 h-2.5" /> Ban
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
