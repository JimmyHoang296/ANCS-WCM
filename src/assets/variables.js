// Supabase — primary data backend (Postgres via PostgREST)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

// Google Apps Script — kept only for features that need Google services:
//   - createRecord (generates a Word doc from a Google Docs template in Drive)
export const URL = 'https://script.google.com/macros/s/AKfycbwlzlBM8H9urQ4kyIncUdIblH2eOJ_zlMf3y6xLDypis_pSAzVsEu1EsRdpcFo83Q_U/exec'
