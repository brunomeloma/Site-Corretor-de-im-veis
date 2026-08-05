import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://munoyhdwslkimizfcqks.supabase.co";
const supabaseAnonKey = "sb_publishable_qQGht7BFkqAbdZw_wc8wnQ_IX2__E4M";

export const lavaJatoSupabase = createClient(supabaseUrl, supabaseAnonKey);
