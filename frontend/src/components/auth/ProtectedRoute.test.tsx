/** @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const authState = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'person@example.com', onboarding_completed: false },
  loading: false,
  initialized: true,
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));

afterEach(() => {
  cleanup();
  authState.user = { id: 'user-1', email: 'person@example.com', onboarding_completed: false };
});

function CompleteOnboarding() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        authState.user = { ...authState.user, onboarding_completed: true };
        navigate('/dashboard');
      }}
    >
      Complete setup
    </button>
  );
}

describe('ProtectedRoute onboarding gate', () => {
  it('routes to dashboard cleanly once onboarding_completed is persisted in auth context', async () => {
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <CompleteOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <h1>Dashboard</h1>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Complete setup' }));
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy();
  });
});
