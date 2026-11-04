import type {
  ApiResponse,
  ApplicationStatus,
  AuthUser,
  CandidateProfile,
  Job,
  JobMatch,
  MatchResult,
  Paginated,
} from '@job-hunter/shared';

/**
 * Browser-side API client. Requests go to the same origin under `/api` and are
 * proxied to the backend by Next.js, so the session cookie stays first-party.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Json = Record<string, unknown>;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection.', 0, 'NETWORK_ERROR');
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.error?.message ?? `Request failed with status ${response.status}.`,
      response.status,
      payload?.error?.code ?? 'REQUEST_FAILED',
    );
  }

  return payload.data as T;
}

function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const result = search.toString();
  return result ? `?${result}` : '';
}

export interface JobFilters {
  search?: string;
  company?: string;
  location?: string;
  workMode?: string;
  status?: string;
  source?: string;
  minLpa?: number;
  maxLpa?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export const api = {
  auth: {
    me: () => request<AuthUser>('/auth/me'),
    login: (username: string, password: string) =>
      request<AuthUser>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    logout: () => request<{ loggedOut: boolean }>('/auth/logout', { method: 'POST' }),
  },

  candidate: {
    get: () => request<CandidateProfile | null>('/candidate/profile'),
    save: (payload: Json) =>
      request<CandidateProfile>('/candidate/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    uploadResume: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/candidate/resume', {
        method: 'POST',
        credentials: 'same-origin',
        body: form,
      });
      const payload = (await response.json()) as ApiResponse<CandidateProfile>;
      if (!response.ok || !payload.success) {
        throw new ApiError(
          payload.error?.message ?? 'Resume upload failed.',
          response.status,
          payload.error?.code ?? 'UPLOAD_FAILED',
        );
      }
      return payload.data as CandidateProfile;
    },
    removeResume: () => request<CandidateProfile>('/candidate/resume', { method: 'DELETE' }),
  },

  jobs: {
    list: (filters: JobFilters = {}) =>
      request<Paginated<Job>>(
        `/jobs${query({ ...filters } as Record<string, string | number>)}`,
      ),
    get: (id: string) => request<Job>(`/jobs/${id}`),
    create: (payload: Json) =>
      request<Job>('/jobs', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: Json) =>
      request<Job>(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    updateStatus: (id: string, status: ApplicationStatus) =>
      request<Job>(`/jobs/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    remove: (id: string) => request<{ id: string }>(`/jobs/${id}`, { method: 'DELETE' }),
    stats: () => request<Record<string, number>>('/jobs/stats'),
    match: (id: string) => request<MatchResult>(`/jobs/${id}/match`),
  },

  matches: {
    rankAll: () => request<{ matches: JobMatch[]; profileReady: boolean }>('/jobs/matches'),
  },
};
