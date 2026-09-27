import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://www.alanya237.com/api';

function snakeToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        snakeToCamel(v),
      ]),
    );
  }
  return obj;
}

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
  transformResponse: [
    ...(axios.defaults.transformResponse as []),
    (data: unknown) => snakeToCamel(data),
  ],
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Refresh du token d'accès en « single-flight » : si plusieurs requêtes
// échouent en 401 simultanément, un seul appel /auth/refresh est émis.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = typeof window !== 'undefined' ? localStorage.getItem('admin_refresh') : null;
  if (!refresh) throw new Error('No refresh token');
  // axios « nu » (sans intercepteurs) → évite la récursion et l'envoi du token expiré
  const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken: refresh });
  const { accessToken, refreshToken } = res.data;
  localStorage.setItem('admin_token', accessToken);
  if (refreshToken) localStorage.setItem('admin_refresh', refreshToken);
  return accessToken;
}

function forceLogout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_refresh');
  localStorage.removeItem('admin_user');
  // basePath /admin : un hard redirect doit inclure le préfixe.
  window.location.href = '/admin/login';
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const status = err.response?.status;
    const code = err.response?.data?.code;

    // Token d'accès expiré → tenter un refresh, une seule fois par requête
    if (
      status === 401 &&
      code === 'TOKEN_EXPIRED' &&
      original &&
      !original._retry &&
      typeof window !== 'undefined' &&
      localStorage.getItem('admin_refresh')
    ) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken().finally(() => { refreshPromise = null; });
        const newToken = await refreshPromise;
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        forceLogout();
        return Promise.reject(err);
      }
    }

    // 401 non récupérable (pas de refresh, refresh échoué, token invalide).
    // Ne pas déconnecter sur l'écran de login : un mauvais mot de passe renvoie
    // aussi 401 (INVALID_CREDENTIALS) et doit laisser afficher l'erreur.
    const url = original?.url ?? '';
    const isAdminLogin = url.includes('/admin/auth/login');
    const hadSession = !!localStorage.getItem('admin_token');
    if (
      status === 401 &&
      typeof window !== 'undefined' &&
      hadSession &&
      !isAdminLogin &&
      code !== 'INVALID_CREDENTIALS'
    ) {
      forceLogout();
    }
    return Promise.reject(err);
  },
);
