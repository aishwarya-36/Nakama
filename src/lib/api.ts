export type ApiResult<T = unknown> = { ok: true; data: T } | { ok: false; error?: string };

async function request<T>(url: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method,
    ...(body !== undefined
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: (data as { error?: string })?.error };
  return { ok: true, data: data as T };
}

export const apiPost = <T = unknown>(url: string, body?: unknown) => request<T>(url, "POST", body);
export const apiPatch = <T = unknown>(url: string, body?: unknown) => request<T>(url, "PATCH", body);
export const apiDelete = <T = unknown>(url: string, body?: unknown) => request<T>(url, "DELETE", body);
