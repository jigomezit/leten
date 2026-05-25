import { supabase, type Claim } from "@/lib/supabase";
import ClaimDeck from "./ClaimDeck";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { data, error } = await supabase
    .from("claims")
    .select("id, nombre_carta, imagen_claim, precio, tienda, precio_compra, comprada")
    .or("comprada.is.null,comprada.eq.sin_comprar")
    .neq("estado", "Enviado")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="flex h-[100dvh] w-screen items-center justify-center p-6 text-center">
        <p className="text-sm text-red-400">
          Error cargando claims: {error.message}
        </p>
      </main>
    );
  }

  const claims = (data ?? []) as Claim[];

  if (claims.length === 0) {
    return (
      <main className="flex h-[100dvh] w-screen items-center justify-center p-6 text-center">
        <p className="text-base text-neutral-400">
          No te falta comprar nada.
        </p>
      </main>
    );
  }

  return <ClaimDeck claims={claims} />;
}
