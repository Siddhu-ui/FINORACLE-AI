import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-[260px] min-h-screen transition-all duration-300 min-w-0 w-full overflow-x-hidden">
        <div className="max-w-[1400px] w-full min-w-0 mx-auto p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
