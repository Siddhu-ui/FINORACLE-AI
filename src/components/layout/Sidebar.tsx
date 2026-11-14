import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Target,
  FlaskConical,
  Calculator,
  MessageSquareText,
  FileText,
  GraduationCap,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/utils';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
  { label: 'Budgets', path: '/budgets', icon: PiggyBank },
  { label: 'Goal Guardian', path: '/goals', icon: Target },
  { label: 'What-If Simulator', path: '/scenarios', icon: FlaskConical },
  { label: 'Loan Analyzer', path: '/loans', icon: Calculator },
  { label: 'AI Assistant', path: '/assistant', icon: MessageSquareText, badge: 'AI' },
  { label: 'Reports', path: '/reports', icon: FileText },
  { label: 'Learn Finance', path: '/learn', icon: GraduationCap },
];

const bottomItems: NavItem[] = [
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut, user } = useAuth();
  const location = useLocation();

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
              ? 'bg-[var(--primary-muted)] text-[var(--primary)] border border-[var(--primary)] border-opacity-20'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card)]'
        )}
      >
          <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]')} />
        {!collapsed && (
          <span className="truncate">{item.label}</span>
        )}
        {!collapsed && item.badge && (
            <span className="ml-auto text-[10px] font-bold bg-[var(--primary-muted)] text-[var(--primary)] px-1.5 py-0.5 rounded-md">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--card-border)] bg-[var(--card)]/60">
        <div className="w-9 h-9 bg-[var(--primary)] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-base font-bold text-[var(--text-primary)] truncate">FinOracle</h1>
            <p className="text-[10px] text-[var(--primary)] font-medium">AI POWERED</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex ml-auto p-1.5 rounded-lg hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map(renderNavItem)}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-3 border-t border-[var(--card-border)] space-y-1">
        {bottomItems.map(renderNavItem)}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--negative)] hover:bg-[var(--negative-muted)] transition-all duration-200"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* User */}
      {!collapsed && user && (
        <div className="px-4 py-3 border-t border-[var(--card-border)] bg-[var(--card)]/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--primary-muted)] flex items-center justify-center text-[var(--primary)] font-semibold text-sm flex-shrink-0">
              {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {user.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-card-border bg-card text-text-secondary shadow-sm transition-colors hover:text-primary"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-[rgba(23,43,77,0.28)] backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] bg-[var(--bg-secondary)] border-r border-[var(--card-border)] z-50"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[var(--card)] text-[var(--text-muted)]"
              >
                <X className="w-5 h-5" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed left-0 top-0 bottom-0 bg-[var(--bg-secondary)] border-r border-[var(--card-border)] z-30 transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
