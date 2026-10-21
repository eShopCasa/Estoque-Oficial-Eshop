// Configurações gerais do sistema.
window.APP_CONFIG = {
  SUPABASE_URL: 'https://egshhxfjswttnsifmazz.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnc2hoeGZqc3d0dG5zaWZtYXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMDIxOTYsImV4cCI6MjEwNTY3ODE5Nn0.YhXuhXBxcAU2t3CEXovOew5OnTn4KsrjGX0txH_E5KQ',

  // Fuso usado para decidir em que "dia" cada bipagem cai (virada à meia-noite daqui).
  TIMEZONE: 'America/Sao_Paulo',

  // Administrador master (login direto, funciona mesmo com a tabela "usuarios" protegida).
  MASTER_USERNAMES: ["lucas d'", 'lucas d'],
  MASTER_PASSWORD: '2910',

  SESSION_KEY: 'mattress_session_v1',

  // Tabela do histórico e quantidade de registros carregados por vez.
  HISTORY_TABLE: 'historico_bipagens',
  HISTORY_PAGE_SIZE: 1000
};
