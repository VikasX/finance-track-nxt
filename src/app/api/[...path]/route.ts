/*
 * src/app/api/[...path]/route.ts
 * This server-only route forwards browser /api/... requests to FastAPI. [...path] captures several URL segments. It is a transport proxy, not a database layer: it validates resource paths, forwards query strings and JSON, and preserves upstream status codes.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Import Next.js framework types/helpers for server metadata, configuration, or route request handling; these are not backend database connections.
import type { NextRequest } from "next/server";
// Allowed finance resources or the collection names this operation processes; keeping the list explicit avoids arbitrary endpoint traversal.
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
// All four exported HTTP methods reuse this server function. Next passes request plus context; params is a Promise in this installed Next version and must be awaited.
async function forward(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (
    // Allow only known finance resources and simple path segments. These checks keep a caller from using this proxy as an arbitrary upstream URL fetcher.
    !resources.has(path[0]) ||
    path.some((segment) => !/^[a-zA-Z0-9_-]+$/.test(segment))
  )
    return Response.json({ detail: "Unknown API resource." }, { status: 404 });
  // Choose the non-null schema branch to discover the real input type/format; anyOf expresses a union of allowed shapes.
  // Choose the server-only override first, then the public base setting, then the deployed default. Only a service URL belongs here; database credentials never enter this proxy.
  const base = (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://finance-track-py.vercel.app"
  ).replace(/\/$/, "");
  // The browser stays on the Next origin. Construct /api/<captured segments> on the configured FastAPI origin and preserve filters/page parameters in the next line.
  const url = new URL(`/api/${path.join("/")}`, base);
  url.search = request.nextUrl.search;
  try {
    // Forward JSON text for POST/PATCH only. A DELETE request and ordinary GET need no request body.
    const body = ["POST", "PATCH"].includes(request.method)
      ? await request.text()
      : undefined;
    if (body && new TextEncoder().encode(body).length > 1024 * 1024)
      return Response.json(
        { detail: "Request is too large." },
        { status: 413 },
      );
    // This is the actual server-to-FastAPI request. Explicit headers forward no browser cookies; no-store preserves live financial reads and the signal enforces cancellation/deadline.
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
    // Preserve the no-content contract exactly. Returning JSON here would turn a successful DELETE into a different response shape.
    if (upstream.status === 204) return new Response(null, { status: 204 });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  // Handle connection/timeout/redirect failure as a readable 502. Upstream HTTP errors are forwarded above so the client can show their actual validation/detail messages.
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
// Next calls the export matching the incoming HTTP method. Re-export aliases let one transport implementation handle the four permitted methods.
export { forward as GET, forward as POST, forward as PATCH, forward as DELETE };
