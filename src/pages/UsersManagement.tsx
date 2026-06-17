import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { Shield, Store, Check, X, Plus, ChevronDown, ChevronUp, User, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CountryFlag } from '../utils/flags';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  storeAccess: { storeId: string }[];
}

export function UsersManagement() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);
  
  const [openAccess, setOpenAccess] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch users
      const usersRes = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
      
      // Fetch stores directly from Supabase for UI (or via API if preferred)
      const { data: storesData } = await supabase.from('stores').select('*').order('name');
      setStores(storesData || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(createForm)
      });
      if (res.ok) {
        setShowCreate(false);
        setCreateForm({ name: '', email: '', password: '' });
        fetchData();
      } else {
        alert('Error creando usuario. Quizás el email ya existe.');
      }
    } catch {
      alert('Error de conexión');
    }
    setCreating(false);
  };

  const toggleAccess = async (userId: string, storeId: string, currentStatus: boolean) => {
    // Optimistic UI
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        if (currentStatus) {
          return { ...u, storeAccess: u.storeAccess.filter(sa => sa.storeId !== storeId) };
        } else {
          return { ...u, storeAccess: [...u.storeAccess, { storeId }] };
        }
      }
      return u;
    }));

    try {
      const res = await fetch('/api/admin/users-access', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId, storeId, hasAccess: !currentStatus })
      });
      if (!res.ok) {
        fetchData(); // Revert
        alert('Error guardando permiso');
      }
    } catch {
      fetchData();
      alert('Error de conexión');
    }
  };

  // Group stores by country
  const storesByCountry = stores.reduce((acc: any, store: any) => {
    const c = store.country || 'CO';
    if (!acc[c]) acc[c] = [];
    acc[c].push(store);
    return acc;
  }, {});

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión de Accesos</h1>
          <p className="text-sm text-slate-500 mt-1">Crea colaboradores y asígnales acceso a tus tiendas</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" /> Crear Usuario
        </button>
      </div>

      <div className="space-y-6">
        {users.map(user => (
          <div key={user.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            
            {/* User Header */}
            <div className={`p-5 sm:p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 ${user.role === 'SUPER_ADMIN' ? 'bg-green-50/30' : 'bg-slate-50/50'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 text-slate-500">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    {user.name}
                    {user.role === 'SUPER_ADMIN' && (
                      <span className="bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border border-green-200">
                        <Shield className="w-3.5 h-3.5" /> Admin
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Store Access Body */}
            {user.role === 'SUPER_ADMIN' ? (
              <div className="p-5 sm:p-6 bg-green-50/20 text-green-700 font-medium text-sm flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                Este usuario tiene acceso total automático a todas las tiendas.
              </div>
            ) : (
              <div className="p-5 sm:p-6">
                <button 
                  onClick={() => setOpenAccess(prev => ({...prev, [user.id]: !prev[user.id]}))}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                >
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                    <Store className="w-5 h-5 text-slate-400" /> 
                    ACCESO A TIENDAS ({user.storeAccess?.length || 0} ASIGNADAS)
                  </div>
                  {openAccess[user.id] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>

                {openAccess[user.id] && (
                  <div className="mt-4 space-y-6">
                    {Object.entries(storesByCountry).map(([country, countryStores]: [string, any]) => (
                      <div key={country} className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <CountryFlag country={country} />
                          <h4 className="font-bold text-slate-800 uppercase tracking-wide text-xs">
                            {country === 'CO' ? 'Colombia' : country === 'MX' ? 'México' : country}
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {countryStores.map((store: any) => {
                            const hasAccess = user.storeAccess?.some(sa => sa.storeId === store.id);
                            return (
                              <div 
                                key={store.id} 
                                className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${hasAccess ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                              >
                                <span className={`font-semibold text-sm ${hasAccess ? 'text-blue-900' : 'text-slate-600'}`}>
                                  {store.name}
                                </span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={hasAccess} 
                                    onChange={() => toggleAccess(user.id, store.id, hasAccess)} 
                                  />
                                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Crear Colaborador</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre Completo</label>
                <input 
                  required 
                  type="text" 
                  value={createForm.name} 
                  onChange={e => setCreateForm({...createForm, name: e.target.value})} 
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-shadow" 
                  placeholder="Ej: Paula López" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Correo Electrónico</label>
                <input 
                  required 
                  type="email" 
                  value={createForm.email} 
                  onChange={e => setCreateForm({...createForm, email: e.target.value})} 
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-shadow" 
                  placeholder="correo@empresa.com" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña</label>
                <input 
                  required 
                  type="text" 
                  value={createForm.password} 
                  onChange={e => setCreateForm({...createForm, password: e.target.value})} 
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-shadow" 
                  placeholder="Escribe una clave segura" 
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowCreate(false)} 
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={creating} 
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
                >
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
