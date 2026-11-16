import type { NextRequest } from "next/server";
const resources = new Set([
  "transactions",
  "categories",
  "budgets",
  "loans",
  "investments",
  "fixed-deposits",
  "ppf",
  "savings-goals",
  "reminders",
  "settings",
  "dashboard",
  "reports",
]);
async function forward(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (
    !resources.has(path[0]) ||
    path.some((segment) => !/^[a-zA-Z0-9_-]+$/.test(segment))
  )
    return Response.json({ detail: "Unknown API resource." }, { status: 404 });
  const base = (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://finance-track-py.vercel.app"
  ).replace(/\/$/, "");
  const url = new URL(`/api/${path.join("/")}`, base);
  url.search = request.nextUrl.search;
  try {
    const body = ["POST", "PATCH"].includes(request.method)
      ? await request.text()
      : undefined;
    if (body && new TextEncoder().encode(body).length > 1024 * 1024)
      return Response.json(
        { detail: "Request is too large." },
        { status: 413 },
      );
    const upstream = await fetch(url, {
      method: request.method,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(25000)]),
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body,
    });
    if (upstream.status === 204) return new Response(null, { status: 204 });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      {
        detail:
          "The finance service is unavailable or timed out. Please retry.",
      },
      { status: 502 },
    );
  }
}
export { forward as GET, forward as POST, forward as PATCH, forward as DELETE };
