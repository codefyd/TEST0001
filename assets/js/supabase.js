(function () {
  if (!window.supabase) {
    console.error('مكتبة Supabase غير محملة');
    return;
  }

  const { createClient } = window.supabase;

  const supabaseClient = createClient(
    window.APP_CONFIG.SUPABASE_URL,
    window.APP_CONFIG.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  window.sb = supabaseClient;
})();
