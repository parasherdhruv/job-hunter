import { api, ApiError } from '@/lib/api';

/**
 * These tests exercise the real API client against a stubbed `fetch`, so the
 * envelope unwrapping, error mapping and query building are all covered.
 */
describe('api client', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  function jsonResponse(body: unknown, status = 200): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  }

  it('unwraps the success envelope', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: true, data: { username: 'admin' }, error: null }),
    );

    await expect(api.auth.me()).resolves.toEqual({ username: 'admin' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('throws an ApiError carrying the server message and code', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          success: false,
          data: null,
          error: { code: 'CONFLICT', message: 'A job with this source URL already exists.' },
        },
        409,
      ),
    );

    await expect(api.jobs.create({ title: 'x' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      code: 'CONFLICT',
      message: 'A job with this source URL already exists.',
    });
  });

  it('reports a network failure as a typed error', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    const error = await api.jobs.stats().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('NETWORK_ERROR');
  });

  it('serialises filters and drops empty values', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        success: true,
        data: { items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 },
        error: null,
      }),
    );

    await api.jobs.list({ search: 'react', workMode: 'REMOTE', location: '', page: 2 });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('/api/jobs?');
    expect(url).toContain('search=react');
    expect(url).toContain('workMode=REMOTE');
    expect(url).toContain('page=2');
    expect(url).not.toContain('location=');
  });
});
