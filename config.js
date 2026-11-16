/* =====================================================================
   CONFIGURAÇÃO — Supabase › Project Settings › API Keys (use a "Publishable key")
   A chave "anon" / "publishable" pode ficar aqui: quem protege os dados
   são as regras de segurança (RLS) criadas pelo schema.sql.
   NUNCA coloque aqui a chave "service_role" / "secret".
   ===================================================================== */
window.CONFIG = {
  SUPABASE_URL: 'https://SEU-PROJETO.supabase.co',
  SUPABASE_KEY: 'SUA-CHAVE-ANON-OU-PUBLISHABLE'
};
