export type ThemeMode = "light" | "dark" | "system";
export const THEME_STORAGE_KEY = "fintrack-theme";
/** Apply the saved theme before the first paint. This contains no user-provided script. */
export const themeScript = `(function(){var mode='system';try{var saved=localStorage.getItem('${THEME_STORAGE_KEY}');if(['light','dark','system'].includes(saved))mode=saved;}catch(e){}var dark=mode==='dark'||(mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';})();`;
