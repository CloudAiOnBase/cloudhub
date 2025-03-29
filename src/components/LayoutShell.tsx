'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden">
          <Sidebar mobile onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Desktop Sidebar */}
     <div className="hidden md:flex w-64 flex-col bg-white border-r flex-shrink-0">
  		<Sidebar />
		 </div>

      <div className="flex flex-col flex-1">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}

