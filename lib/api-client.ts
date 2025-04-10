import { appUrl } from '@/config';

// Type for API response (matching your ApiClient)
type ApiResult<T> = {
  data?: T;
  error?: {
    message: string;
    status: number;
  };
};

// Type for request configuration
type RequestConfig = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
};

class FetchClient {
  private baseURL: string;

  constructor() {
    this.baseURL = appUrl;
  }

  private async request<T>(config: RequestConfig): Promise<ApiResult<T>> {
    try {
      const url = new URL(`${this.baseURL}${config.url}`);
      if (config.params) {
        Object.entries(config.params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      const response = await fetch(url.toString(), {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers, // Allow overriding or adding headers (e.g., Authorization)
        },
        body: config.data ? JSON.stringify(config.data) : undefined,
        credentials: 'include', // Include cookies if using NextAuth or sessions
      });

      if (!response.ok) {
        const errorText = await response.text(); // Capture response text for more context
        throw new Error(`HTTP error! status: ${response.status}${errorText ? ` - ${errorText}` : ''}`);
      }

      const data = await response.json();
      return { data };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      return {
        error: {
          message: error.message,
          status: (err as Response)?.status || 500,
        },
      };
    }
  }

  // Matching the exact method signatures of your ApiClient
  async get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResult<T>> {
    return this.request<T>({ method: 'GET', url, params });
  }

  async post<T, D = unknown>(url: string, data?: D): Promise<ApiResult<T>> {
    return this.request<T>({ method: 'POST', url, data });
  }

  async put<T, D = unknown>(url: string, data?: D): Promise<ApiResult<T>> {
    return this.request<T>({ method: 'PUT', url, data });
  }

  async patch<T, D = unknown>(url: string, data?: D): Promise<ApiResult<T>> {
    return this.request<T>({ method: 'PATCH', url, data });
  }

  async delete<T>(url: string): Promise<ApiResult<T>> {
    return this.request<T>({ method: 'DELETE', url });
  }
}

export const fetchClient = new FetchClient();

// Export as `apiClient` to maintain compatibility with your existing code
export { fetchClient as apiClient };