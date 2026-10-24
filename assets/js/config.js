/* =====================================================================
   WebKit settings. Fill these in after creating your Supabase project:
   Supabase dashboard > Project Settings > API
   - SUPABASE_URL       the "Project URL"
   - SUPABASE_ANON_KEY  the "anon public" key (safe to publish; never use service_role here)
   - ADMIN_EMAIL        the email of the admin user you create in Supabase Auth
   - API_BASE           address of the Cloudflare Worker that handles online payment and card login
   - CUSTOMER_EMAIL_DOMAIN  label used behind the mobile-number login (leave as it is unless Supabase rejects it)
   - RAZORPAY_KEY       (optional) not needed any more: the Key ID is sent by the create-order edge function.
                      The Key SECRET lives only in Supabase secrets (see README), never in this file.
   ===================================================================== */
   window.WK_CONFIG = {
    SUPABASE_URL: 'https://pfowhfszrguvwgzzbobv.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_icHX2nqUiiw-dtPKS8ROCQ_cPPgS9Cl',
    ADMIN_EMAIL: 'admin@webkit.store',
  RAZORPAY_KEY: 'rzp_live_TrIqwfzeeDGJxn',
  API_BASE: 'https://peedya-api.peedya-in.workers.dev',  // your Cloudflare Worker address, e.g. https://peedya-api.YOUR-NAME.workers.dev (see worker/README.md)
  CUSTOMER_EMAIL_DOMAIN: 'peedya.in'  // customers log in with mobile + password; the number becomes number@this-domain (no email is sent)
};
