import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
  );
}

export const supabase = createClient(url, anonKey);

export type Claim = {
  id: string | number;
  name: string;
  image_url: string;
  cardshop: string | null;
  sell_price: number | null;
  buy_price: number | null;
  bought: boolean;
};
