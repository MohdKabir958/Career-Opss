import { useAuth } from "@clerk/clerk-react";
import { useCallback, useMemo } from "react";
import { API_BASE } from "./clerk";

export interface ApiError extends Error {
  status: number;
  details?: unknown;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

export function useApi() {
  const { getToken, isSignedIn } = useAuth();

  const request = useCallback(
    async <T>(path: string, opts: RequestOptions = {}): Promise<T> => {
      const headers: Record<string, string> = {};
      if (isSignedIn) {
        const token = await getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }

      let body: BodyInit | undefined;
      if (opts.formData) {
        body = opts.formData;
      } else if (opts.body !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(opts.body);
      }

      const response = await fetch(buildUrl(path, opts.query), {
        method: opts.method ?? (body ? "POST" : "GET"),
        headers,
        body,
        credentials: "include",
      });

      const text = await response.text();
      let parsed: unknown = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }

      if (!response.ok) {
        const message =
          (parsed && typeof parsed === "object" && "error" in parsed
            ? String((parsed as { error: unknown }).error)
            : `Request failed: ${response.status}`);
        const err: ApiError = Object.assign(new Error(message), {
          status: response.status,
          details: parsed,
        });
        throw err;
      }
      return parsed as T;
    },
    [getToken, isSignedIn],
  );

  return useMemo(
    () => ({
      request,
      get: <T>(path: string, query?: RequestOptions["query"]) =>
        request<T>(path, { method: "GET", query }),
      post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
      put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
      del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
      upload: <T>(path: string, formData: FormData) => request<T>(path, { method: "POST", formData }),
      buildUrl,
    }),
    [request],
  );
}

export type ApiClient = ReturnType<typeof useApi>;
