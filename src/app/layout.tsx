/*
 * src/app/layout.tsx
 * The root layout surrounds every route. It loads global styles/fonts and nests ThemeProvider, FinanceProvider, and AppShell, so changing pages keeps the same navigation and shared UI state.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// Import Next.js framework types/helpers for server metadata, configuration, or route request handling; these are not backend database connections.
import type { Metadata } from "next";
// Load fonts through Next and expose CSS variables, giving the layout consistent typography across all routes.
import { Inter, Manrope, JetBrains_Mono } from "next/font/google";
// Read shared UI context for the selected month, global transaction dialog, or toast messages. Financial records still come from API hooks.
import { FinanceProvider } from "@/components/finance-provider";
// Import the persistent navigation/header frame that receives the active route as children.
import { AppShell } from "@/components/app-shell";
// Use the common appearance provider so header/settings/device preference changes stay synchronized.
import { ThemeProvider } from "@/components/theme-provider";
// Import the shared appearance contract/startup script so the initial HTML and interactive provider agree on the same storage key and modes.
import { themeScript } from "@/lib/theme";
// Load the app-wide styles once from the root layout. Theme variables and shared classes apply to all route content.
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

// Next.js uses this server export for browser title/description. The template applies consistent branding to nested route titles.
export const metadata: Metadata = {
  title: { default: "FinTrack | Personal Finance", template: "%s | FinTrack" },
  description:
    "Your personal finance workspace. Track spending, budgets, investments and financial goals.",
};

// A Server Component by default: it defines the HTML document and metadata. The nested client providers supply interactivity without turning this whole file into a client module. children is the route content inserted by Next.js.
// The startup script may set data-theme before React hydrates. suppressHydrationWarning tolerates the expected root attribute mismatch; this is not a general error-hiding switch.
export default function RootLayout({ children }: LayoutProps<"/">) {
  // Insert the trusted fixed themeScript from lib/theme.ts before body rendering. dangerouslySetInnerHTML bypasses string escaping for this script; do not replace it with user-provided text.
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${manrope.variable} ${jetbrains.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <FinanceProvider>
            <AppShell>{children}</AppShell>
          </FinanceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
