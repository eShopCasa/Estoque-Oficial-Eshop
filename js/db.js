// Cliente do Supabase (usado por todos os módulos).
const db = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_KEY);
