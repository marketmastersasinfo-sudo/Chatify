import { Bot, Zap, MessageCircle, AlertTriangle } from 'lucide-react';

export function Chats() {
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Chats e IA</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Monitorea el estado del enrutador de Inteligencia Artificial y las conversaciones activas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {/* Router Status */}
        <div className="overflow-hidden rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-yellow-500" />
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Enrutador Activo</h3>
          </div>
          <p className="mt-2 text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Grok (Prioridad 1)</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">Latencia: 45ms (Óptimo)</p>
        </div>

        <div className="overflow-hidden rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-blue-500" />
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Intervenciones IA Hoy</h3>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">1,204</p>
        </div>

        <div className="overflow-hidden rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-900 dark:ring-gray-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Audios Transcritos</h3>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">89</p>
        </div>
      </div>

      {/* Live Chat Table placeholder */}
      <div className="mt-8 overflow-hidden bg-white shadow sm:rounded-lg ring-1 ring-gray-900/5 dark:bg-gray-900 dark:ring-gray-800">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">Conversaciones en Curso</h3>
          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/20 dark:text-green-400">
            Auto-Reply On
          </span>
        </div>
        <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-800">
          <li className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-gray-400" />
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">+57 320 *** 9081</p>
              </div>
              <p className="text-xs text-gray-500">Hace 2 min</p>
            </div>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">Bot:</span> "Parce, el sistema me arroja esta fachada, ¿es esta su casa?"
            </div>
          </li>
          <li className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-gray-400" />
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">+54 9 11 *** 3421</p>
              </div>
              <p className="text-xs text-gray-500">Hace 5 min</p>
            </div>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">Cliente:</span> [Audio 0:12s] "Sí, dale. Anotálo para el martes."
            </div>
            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500 italic">
              Transcripción Whisper: "Sí, dale. Anotálo para el martes cuando me pagan."
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
