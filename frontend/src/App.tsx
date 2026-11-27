import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import OnboardingPage from '@/pages/OnboardingPage';
import DashboardPage from '@/pages/DashboardPage';
import TransactionsPage from '@/pages/TransactionsPage';
import BudgetsPage from '@/pages/BudgetsPage';
import GoalsPage from '@/pages/GoalsPage';
import LoansPage from '@/pages/LoansPage';
import ScenariosPage from '@/pages/ScenariosPage';
import AssistantPage from '@/pages/AssistantPage';
import InsightsPage from '@/pages/InsightsPage';
import ReportsPage from '@/pages/ReportsPage';
import EducationPage from '@/pages/EducationPage';
import SettingsPage from '@/pages/SettingsPage';

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password'];

/** Floating theme switch for public pages (landing / auth) that have no sidebar. */
function PublicThemeToggle() {
  const { pathname } = useLocation();
  if (!PUBLIC_PATHS.includes(pathname)) return null;
  return (
    <div className="fixed right-4 top-4 z-50">
      <ThemeToggle variant="icon" />
    </div>
  );
}
export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <PublicThemeToggle />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/loans" element={<LoansPage />} />
            <Route path="/scenarios" element={<ScenariosPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/learn" element={<EducationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}
