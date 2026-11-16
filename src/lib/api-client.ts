export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const timeout = AbortSignal.timeout(30000);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout;
  let response: Response;
  try {
    response = await fetch(path, {
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
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      timeout.aborted
        ? "The API took too long to respond. Please retry."
        : "Could not reach the finance API. Check your connection and retry.",
    );
  }
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
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export function apiPath(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return `${path}${query.size ? `?${query}` : ""}`;
}
export async function fetchAll<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T[]> {
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
    if (rows.length >= result.total || result.items.length === 0) break;
    page++;
  }
  return rows;
}
