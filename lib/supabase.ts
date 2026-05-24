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
  id: string;
  nombre_carta: string;
  imagen_claim: string | null;
  precio: number | null;
  tienda: string | null;
  precio_compra: number | null;
  comprada: boolean | null;
};
