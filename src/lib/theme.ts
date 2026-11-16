/*
 * src/lib/theme.ts
 * Shared theme type, storage key, and startup script used by RootLayout/ThemeProvider. The script sets appearance before the page paints to reduce a light/dark flash.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
// TypeScript describes ThemeMode here so callers agree on its shape. These declarations help the editor/compiler and do not create values at runtime.
export type ThemeMode = "light" | "dark" | "system";
export const THEME_STORAGE_KEY = "fintrack-theme";
/** Apply the saved theme before the first paint. This contains no user-provided script. */
// A trusted fixed startup script reads only the appearance preference and sets data-theme before first paint. Its literal content stays unchanged in this explanation pass.
export const themeScript = `(function(){var mode='system';try{var saved=localStorage.getItem('${THEME_STORAGE_KEY}');if(['light','dark','system'].includes(saved))mode=saved;}catch(e){}var dark=mode==='dark'||(mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';})();`;
