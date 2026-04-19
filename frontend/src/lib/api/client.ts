import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig
} from 'axios';

import { auth } from '@/lib/firebase/config';
import { isDemoSearch } from '@/lib/routing/demo';

const requestCache = new Map<string, { data: unknown; expires: number }>();

function buildCacheKey(url: string, params?: Record<string, unknown>): string {
  const sortedParams = Object.entries(params ?? {}).sort(([left], [right]) =>
    left.localeCompare(right)
  );
  return `${url}::${JSON.stringify(sortedParams)}`;
}

function normalizeRequestPath(
  baseURL: string | undefined,
  requestPath: string | undefined
): string | undefined {
  if (!baseURL || !requestPath || !requestPath.startsWith('/')) {
    return requestPath;
  }

  const normalizedBasePath = new URL(baseURL, window.location.origin).pathname.replace(/\/+$/, '');

  if (normalizedBasePath.endsWith('/api/v1')) {
    if (requestPath === '/v1' || requestPath === '/api/v1') {
      return '/';
    }
    if (requestPath.startsWith('/v1/')) {
      return requestPath.slice('/v1'.length);
    }
    if (requestPath.startsWith('/api/v1/')) {
      return requestPath.slice('/api/v1'.length);
    }
  }

  return requestPath;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    config.url = normalizeRequestPath(
      config.baseURL ?? apiClient.defaults.baseURL,
      config.url
    );

    const token = await auth.currentUser?.getIdToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  async (error: AxiosError) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const pathname = window.location.pathname;
    const isDemoSession =
      auth.currentUser?.isAnonymous === true || isDemoSearch(window.location.search);
    if (
      error.response?.status === 401 &&
      pathname !== '/login' &&
      pathname !== '/register' &&
      !isDemoSession
    ) {
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export default apiClient;

export async function cachedGet<T>(
  url: string,
  params?: Record<string, unknown>,
  ttlMs = 30_000
): Promise<T> {
  const key = buildCacheKey(url, params);
  const cached = requestCache.get(key);

  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }

  const response = await apiClient.get<T>(url, { params });
  requestCache.set(key, {
    data: response.data,
    expires: Date.now() + ttlMs,
  });
  return response.data;
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; detail?: string } | undefined;
    return data?.message ?? data?.detail ?? 'An unexpected error occurred.';
  }
  return 'An unexpected error occurred.';
}
