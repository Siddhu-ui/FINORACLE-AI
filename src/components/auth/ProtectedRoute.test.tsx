/** @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const authState = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'person@example.com' },
  loading: false,
  initialized: true,
}));

const onboardingState = vi.hoisted(() => ({
  complete: false,
  get: vi.fn(async () => ({ onboarding_completed: onboardingState.complete })),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/services/supabase', () => ({ profileService: { get: onboardingState.get } }));

afterEach(() => {
  cleanup();
  onboardingState.complete = false;
  onboardingState.get.mockClear();
});

function CompleteOnboarding() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => {
    onboardingState.complete = true;
    navigate('/dashboard');
  }}>Complete setup</button>;
}

describe('ProtectedRoute onboarding gate', () => {
  it('rechecks the profile before redirecting after onboarding completes', async () => {
    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<ProtectedRoute><CompleteOnboarding /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><h1>Dashboard</h1></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Complete setup' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeTruthy();
    await waitFor(() => expect(onboardingState.get).toHaveBeenCalledTimes(2));
  });
});
