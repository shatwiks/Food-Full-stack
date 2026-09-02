import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../api/client';

export interface User {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'RESTAURANT_OWNER' | 'ADMIN';
  firstName?: string | null;
  lastName?: string | null;
}

export type AuthStage = 'IDLE' | 'AWAITING_2FA' | 'AUTHENTICATED';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  authStage: AuthStage;
  preAuthToken: string | null;
  devCode: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  login: (email: string, password: string) => Promise<{ requires2FA: boolean; preAuthToken?: string; devCode?: string }>;
  verify2FA: (code: string) => Promise<void>;
  resend2FA: () => Promise<void>;
  reset2FA: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      authStage: 'IDLE',
      preAuthToken: null,
      devCode: null,

      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          authStage: 'AUTHENTICATED',
          preAuthToken: null,
          devCode: null,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      login: async (email: string, password: string) => {
        const res = await apiClient.post('/auth/login', {
          email: email.trim(),
          password,
        });

        if (res.data.requires2FA) {
          set({
            authStage: 'AWAITING_2FA',
            preAuthToken: res.data.preAuthToken,
            devCode: res.data.devCode || null,
          });
          return { requires2FA: true, preAuthToken: res.data.preAuthToken, devCode: res.data.devCode };
        }

        // Fallback for direct token login (e.g. if 2FA disabled or demo bypass)
        if (res.data.tokens) {
          const { user, tokens } = res.data;
          set({
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            authStage: 'AUTHENTICATED',
            preAuthToken: null,
            devCode: null,
          });
          return { requires2FA: false };
        }

        return { requires2FA: false };
      },

      verify2FA: async (code: string) => {
        const { preAuthToken } = get();
        if (!preAuthToken) {
          throw new Error('Pre-auth session expired. Please log in again.');
        }

        const res = await apiClient.post('/auth/verify-2fa', {
          preAuthToken,
          code: code.trim(),
        });

        const { user, tokens } = res.data;
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          authStage: 'AUTHENTICATED',
          preAuthToken: null,
          devCode: null,
        });
      },

      resend2FA: async () => {
        const { preAuthToken } = get();
        if (!preAuthToken) {
          throw new Error('Pre-auth session expired. Please log in again.');
        }

        const res = await apiClient.post('/auth/resend-2fa', {
          preAuthToken,
        });

        if (res.data.devCode) {
          set({ devCode: res.data.devCode });
        }
      },

      reset2FA: () => {
        set({
          authStage: 'IDLE',
          preAuthToken: null,
          devCode: null,
        });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          authStage: 'IDLE',
          preAuthToken: null,
          devCode: null,
        });
      },
    }),
    {
      name: 'orderflow-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        authStage: state.user && state.accessToken ? 'AUTHENTICATED' : 'IDLE',
      }),
    }
  )
);