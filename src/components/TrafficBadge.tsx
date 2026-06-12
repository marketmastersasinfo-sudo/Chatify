import { ShoppingCart, MessageSquare, Target, Zap } from 'lucide-react';

export function TrafficBadge({ source }: { source: string }) {
  if (!source) return null;

  const text = source.toLowerCase();
  
  if (text.includes('shopyeasy') || text.includes('webhook')) {
    return (
      <span className="text-[10px] font-bold px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-sm flex items-center gap-1.5 uppercase tracking-wide">
        <ShoppingCart className="w-3 h-3" />
        Tienda Online
      </span>
    );
  }

  if (text.includes('instagram')) {
    return (
      <span className="text-[10px] font-bold px-2.5 py-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full shadow-sm flex items-center gap-1.5 uppercase tracking-wide">
        <Target className="w-3 h-3" />
        Instagram
      </span>
    );
  }

  if (text.includes('messenger') || text.includes('facebook')) {
    return (
      <span className="text-[10px] font-bold px-2.5 py-1 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-full shadow-sm flex items-center gap-1.5 uppercase tracking-wide">
        <MessageSquare className="w-3 h-3" />
        Messenger
      </span>
    );
  }

  return (
    <span className="text-[10px] font-bold px-2.5 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-full flex items-center gap-1.5 uppercase tracking-wide">
      <Zap className="w-3 h-3" />
      {source}
    </span>
  );
}
