import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] flex flex-col lg:flex-row overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-[260px] min-h-screen transition-all duration-300 min-w-0 w-full overflow-x-hidden">
        <div className="max-w-[1440px] w-full min-w-0 mx-auto pl-16 pr-4 pb-4 pt-20 sm:pl-16 sm:pr-5 sm:pb-5 sm:pt-20 lg:px-8 lg:pb-8 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
