'use client';
import { Home, Wallet, Clock, Layers, Gavel, FileText } from 'lucide-react';
import Link from 'next/link';

const navItems = [
  { name: 'Dashboard', href: '/', icon: <Home size={18} />, enabled: true },
  { name: 'Wallet', href: '/wallet', icon: <Wallet size={18} />, enabled: false },
  { name: 'History', href: '/history', icon: <Clock size={18} />, enabled: false },
  { name: 'Staking', href: '/staking', icon: <Layers size={18} />, enabled: true },
  { name: 'Governance', href: '/governance', icon: <Gavel size={18} />, enabled: false },
  { name: 'Contracts', href: '/contracts', icon: <FileText size={18} />, enabled: false },
];

export default function Sidebar({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  return (
    <aside
      className={`${
        mobile ? 'w-64 h-full bg-blue-900 text-white flex flex-col p-6' : 'h-full flex flex-col bg-blue-900 text-white px-4 py-6'
      }`}
    >

      <div className="text-xl font-bold flex items-center gap-2 mb-8">
        CloudHub
        <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded uppercase tracking-wide">
          Beta
        </span>
      </div>


      <nav className="flex flex-col space-y-4">
        {navItems.map((item) => (
        <Link
          key={item.name}
          href={item.enabled ? item.href : '#'}
          onClick={(e) => {
            if (!item.enabled) e.preventDefault();
            if (item.enabled && onClose) onClose();
          }}
          className={`flex items-center space-x-3 ${
            item.enabled
              ? 'hover:text-blue-300'
              : 'text-blue-400 opacity-50 cursor-not-allowed'
          }`}
          title={item.enabled ? undefined : 'Coming soon'}
        >
          {item.icon}
          <span>{item.name}</span>
        </Link>
      ))}

      </nav>

      <div className="mt-auto pt-6 text-sm opacity-70">
        <div>🌐 English / USD</div>
      </div>

      {mobile && (
        <button className="mt-6 text-sm text-blue-300 underline" onClick={onClose}>
          Close
        </button>
      )}
    </aside>
  );
}
