// src/lib/api.ts — fetch 래퍼: 토큰 헤더 + {success,data,error} 언래핑 + 409 처리

import type { Alternative } from "./types";

let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

export class ApiError extends Error {
  code: string;
  status: number;
  alternatives?: Alternative[];

  constructor(code: string, message: string, status: number, alternatives?: Alternative[]) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.alternatives = alternatives;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export async function apiFetch<T>(
  path: string,
  options?: { method?: string; body?: unknown; auth?: boolean }
): Promise<T> {
  const { method = "GET", body, auth = true } = options ?? {};
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth && authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(
      json.error?.code ?? "UNKNOWN",
      json.error?.message ?? "요청에 실패했어요",
      res.status,
      json.error?.alternatives,
    );
  }

  return json.data ?? json;
}
