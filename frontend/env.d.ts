/// <reference path="./.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly OPENAI_API_KEY?: string;
  readonly VITE_API_URL?: string;
  /** Key-free DEMO mode. ON by default; set to 'false' to use the live backend. */
  readonly PUBLIC_DEMO?: string;
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}