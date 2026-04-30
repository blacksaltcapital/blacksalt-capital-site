const SUPABASE_URL = 'https://hqhomownlrjczlxalkpc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_n-pqJPmUR04xTkI1-TC-rw_9LIFslUm';

// Single shared client — consumed by login.html, dashboard.html, reset-password.html
window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
