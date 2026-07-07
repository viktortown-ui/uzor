export type AppMode = 'demo' | 'production';
export const appMode: AppMode = import.meta.env.VITE_APP_MODE === 'production' ? 'production' : 'demo';
export const isDemoMode = appMode === 'demo';
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
};
export const isProductionConfigured = appMode === 'production' && Boolean(supabaseConfig.url && supabaseConfig.key);
