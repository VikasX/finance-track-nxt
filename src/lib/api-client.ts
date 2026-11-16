/*
 * src/lib/api-client.ts
 * The low-level HTTP layer used by the cache and writes. It builds query strings, parses success/error responses, handles timeouts and empty 204 responses, and can collect every server page.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Carry both a readable message and HTTP status in one Error subclass. Forms display the message; callers/tests can inspect status without parsing text.
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
// Convert an unknown thrown value into safe display text. JavaScript can throw non-Error values, so callers cannot assume a message property exists.
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
// T is the caller supplied response type, not runtime validation. Fetch the same-origin URL, apply a timeout/cancellation signal, and either return parsed success data or throw a readable ApiError.
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // AbortSignal.timeout creates an automatic deadline; AbortSignal.any also respects cancellation requested by a newer cache read. Neither requires a manual timeout cleanup here.
  const timeout = AbortSignal.timeout(30000);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout;
  let response: Response;
  try {
    // Await the response headers; this does not yet parse the body. cache: no-store avoids a second HTTP cache, and credentials: omit sends no browser authentication cookies.
    response = await fetch(path, {
      // Object spread copies caller options (method/body/signal). Properties written later override earlier ones, so this helper consistently applies its timeout/cache/header behavior.
      ...options,
      cache: "no-store",
      credentials: "omit",
      signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  // Network/timeout failures have no HTTP response. Deliberate caller cancellation is rethrown so the cache can silently ignore an obsolete read.
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      timeout.aborted
        ? "The API took too long to respond. Please retry."
        : "Could not reach the finance API. Check your connection and retry.",
    );
  }
  // fetch does not throw for HTTP 4xx/5xx. Inspect ok explicitly and convert FastAPI detail strings or validation-detail arrays into a usable message.
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const data = await response.json();
      if (typeof data.detail === "string") message = data.detail;
      else if (Array.isArray(data.detail))
        message = data.detail
          .map(
            (item: { loc?: (string | number)[]; msg?: string }) =>
              `${item.loc?.filter((part) => part !== "body").join(".") || "Input"}: ${item.msg ?? "Invalid value"}`,
          )
          .join("; ");
    } catch {
      /* The proxy or API may return a non-JSON failure. */
    }
    if (response.status === 503)
      message = "The database is temporarily unavailable. Please retry.";
    throw new ApiError(message, response.status);
  }
  // DELETE success has an empty body: return before response.json(), which would fail on empty text. undefined as T is a TypeScript assertion, not a conversion.
  if (response.status === 204) return undefined as T;
  // Parse successful JSON asynchronously. The generic T helps callers access fields, but the backend contract remains responsible for the actual response shape.
  return response.json() as Promise<T>;
}
// Encode optional query parameters with URLSearchParams rather than string-concatenating user input. Empty/undefined values are omitted so they do not accidentally filter the server result.
export function apiPath(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
) {
  // Build an encoded query string: URLSearchParams escapes values containing spaces,
  // ampersands, and other URL characters so user input stays inside one parameter.
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return `${path}${query.size ? `?${query}` : ""}`;
}
// Keep requesting collection pages until the reported total is reached. Collection envelopes contain items/total/page/page_size; this helper returns just the combined rows to module screens.
export async function fetchAll<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T[]> {
  // Accumulate items from each collection page into one array returned to the caller.
  const rows: T[] = [];
  let page = 1;
  while (true) {
    const result = await request<{
      items: T[];
      total: number;
      page: number;
      page_size: number;
    }>(`${path}${path.includes("?") ? "&" : "?"}page=${page}&page_size=100`, {
      signal,
    });
    if (!Array.isArray(result.items))
      throw new ApiError("The API returned an invalid collection.");
    rows.push(...result.items);
    // Use total from the envelope to know when all pages are collected. The zero-length escape also prevents endless requests if the server returns an unexpectedly empty page.
    if (rows.length >= result.total || result.items.length === 0) break;
    page++;
  }
  return rows;
}
