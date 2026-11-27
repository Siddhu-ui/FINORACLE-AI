import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const onAssistant = location.pathname.startsWith('/assistant');

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] flex flex-col lg:flex-row overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-[260px] min-h-screen transition-all duration-300 min-w-0 w-full overflow-x-hidden">
        <div className="max-w-[1440px] w-full min-w-0 mx-auto pl-16 pr-4 pb-4 pt-20 sm:pl-16 sm:pr-5 sm:pb-5 sm:pt-20 lg:px-8 lg:pb-8 lg:pt-8">
          <Outlet />
        </div>
      </main>

      {/* FinOracle AI floating launcher — Emerald Green + White */}
      {!onAssistant && (
        <button
          type="button"
          onClick={() => navigate('/assistant')}
          aria-label="Open AI Copilot & RAG"
          title="Ask FinOracle AI Copilot"
          className="fixed bottom-6 right-20 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-emerald-900/20 ring-4 ring-[var(--bg)] transition-transform hover:scale-105 hover:bg-primary-hover focus:outline-none focus-visible:ring-emerald-300"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
