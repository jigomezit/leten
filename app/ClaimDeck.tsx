"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { supabase, type Claim } from "@/lib/supabase";

type Props = { claims: Claim[] };
type ViewMode = "card" | "gallery";
type FilterValue = string | null | "__none__";

type Stack = {
  key: string;
  items: Claim[];
  representative: Claim;
  count: number;
};

const SWIPE_VELOCITY = 500;
const SWIPE_RATIO = 0.25;
const USD_TO_YEN = 155;

const yenFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const usdFmt = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function groupByName(claims: Claim[]): Stack[] {
  const map = new Map<string, Claim[]>();
  for (const c of claims) {
    const arr = map.get(c.nombre_carta);
    if (arr) arr.push(c);
    else map.set(c.nombre_carta, [c]);
  }
  const out: Stack[] = [];
  for (const [key, items] of map) {
    const representative = items.find((c) => c.imagen_claim) ?? items[0];
    out.push({ key, items, representative, count: items.length });
  }
  return out;
}

function PriceCell({ usd }: { usd: number | null }): ReactNode {
  if (usd === null || usd === undefined) {
    return <span className="text-sm text-neutral-50">—</span>;
  }
  const yen = Math.round(usd * USD_TO_YEN);
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-sm text-neutral-50">¥{yenFmt.format(yen)}</span>
      <span className="text-[10px] text-neutral-400">
        (${usdFmt.format(usd)})
      </span>
    </span>
  );
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
  }),
  center: { x: 0 },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
  }),
};

export default function ClaimDeck({ claims: initialClaims }: Props) {
  const [allClaims, setAllClaims] = useState(initialClaims);
  const [filter, setFilter] = useState<FilterValue>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [cameFromGallery, setCameFromGallery] = useState(false);
  const [[index, direction], setIndexDir] = useState<[number, number]>([0, 0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cardshops = useMemo(
    () =>
      Array.from(
        new Set(
          allClaims
            .map((c) => c.tienda)
            .filter((t): t is string => t !== null && t.trim() !== "")
        )
      ).sort((a, b) => a.localeCompare(b, "es")),
    [allClaims]
  );

  const noneCount = useMemo(
    () => allClaims.filter((c) => c.tienda === null || c.tienda === "").length,
    [allClaims]
  );

  const visibleClaims = useMemo(() => {
    if (filter === null) return allClaims;
    if (filter === "__none__") {
      return allClaims.filter((c) => c.tienda === null || c.tienda === "");
    }
    return allClaims.filter((c) => c.tienda === filter);
  }, [allClaims, filter]);

  const stacks = useMemo(() => groupByName(visibleClaims), [visibleClaims]);

  const total = stacks.length;
  const safeIndex = total > 0 ? index % total : 0;
  const stack = stacks[safeIndex];
  const claim = stack?.representative;
  const dialogOpen = confirmOpen || menuOpen;

  const paginate = (dir: number) => {
    if (total <= 1) return;
    setIndexDir(([prev]) => [(prev + dir + total) % total, dir]);
  };

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const w = typeof window !== "undefined" ? window.innerWidth : 360;
    const threshold = w * SWIPE_RATIO;
    if (info.offset.x < -threshold || info.velocity.x < -SWIPE_VELOCITY) {
      paginate(1);
    } else if (info.offset.x > threshold || info.velocity.x > SWIPE_VELOCITY) {
      paginate(-1);
    }
  };

  const selectFilter = (cs: FilterValue) => {
    setFilter(cs);
    setIndexDir([0, 0]);
    setCameFromGallery(false);
    setMenuOpen(false);
  };

  const toggleMode = () => {
    if (viewMode === "card") {
      setViewMode("gallery");
      setCameFromGallery(false);
    } else {
      setViewMode("card");
      setCameFromGallery(false);
      setIndexDir([0, 0]);
    }
    setMenuOpen(false);
  };

  const openCardFromGallery = (i: number) => {
    setIndexDir([i, 0]);
    setCameFromGallery(true);
    setViewMode("card");
  };

  const backToGallery = () => {
    setViewMode("gallery");
    setCameFromGallery(false);
  };

  const onAccept = async () => {
    if (!stack || marking) return;
    setMarking(true);
    setErrorMsg(null);
    const ids = stack.items.map((c) => c.id);
    const { error } = await supabase
      .from("claims")
      .update({ comprada: "comprada" })
      .in("id", ids);
    if (error) {
      setErrorMsg(error.message);
      setMarking(false);
      return;
    }
    const idSet = new Set(ids);
    setAllClaims((prev) => prev.filter((c) => !idSet.has(c.id)));
    setIndexDir(([prev]) => {
      const newTotal = total - 1;
      if (newTotal <= 0) return [0, 0];
      return [prev % newTotal, 0];
    });
    setConfirmOpen(false);
    setMarking(false);
  };

  const toolbar = (
    <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-950/90 px-4 py-2 backdrop-blur">
      <p className="text-xs text-neutral-300">
        {filter === null ? (
          <>
            <span className="text-neutral-100">{stacks.length}</span> pendientes
          </>
        ) : (
          <>
            Filtrando por{" "}
            <strong className="text-neutral-100">
              {filter === "__none__" ? "Sin especificar" : filter}
            </strong>{" "}
            · {stacks.length}
          </>
        )}
      </p>
      <button
        onClick={() => setMenuOpen(true)}
        aria-label="Abrir menú"
        className="text-neutral-300 active:text-neutral-50"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 6h16M4 12h16M4 18h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );

  const drawer = (
    <AnimatePresence>
      {menuOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-30 bg-black/60"
          />
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            className="fixed inset-y-0 right-0 z-40 flex w-[80%] max-w-xs flex-col overflow-y-auto border-l border-neutral-800 bg-neutral-950"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-3">
              <p className="text-sm font-medium text-neutral-100">Menú</p>
              <button
                onClick={() => setMenuOpen(false)}
                className="text-neutral-400 active:text-neutral-100"
                aria-label="Cerrar"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <button
              onClick={toggleMode}
              className="flex items-center justify-between border-b border-neutral-800 px-4 py-4 text-left text-sm font-medium text-neutral-100 active:bg-neutral-900"
            >
              <span>
                {viewMode === "card" ? "Modo galería" : "Modo carta"}
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="px-4 pb-2 pt-4 text-[11px] uppercase tracking-wider text-neutral-500">
              Cardshops
            </div>
            <ul className="pb-6">
              <li>
                <button
                  onClick={() => selectFilter(null)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm ${
                    filter === null
                      ? "bg-neutral-800 text-neutral-50"
                      : "text-neutral-200 active:bg-neutral-900"
                  }`}
                >
                  <span>Todos</span>
                  <span className="ml-3 text-xs text-neutral-500">
                    ({allClaims.length})
                  </span>
                </button>
              </li>
              {cardshops.map((cs) => {
                const count = allClaims.filter((c) => c.tienda === cs).length;
                return (
                  <li key={cs}>
                    <button
                      onClick={() => selectFilter(cs)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm ${
                        filter === cs
                          ? "bg-neutral-800 text-neutral-50"
                          : "text-neutral-200 active:bg-neutral-900"
                      }`}
                    >
                      <span className="truncate">{cs}</span>
                      <span className="ml-3 shrink-0 text-xs text-neutral-500">
                        ({count})
                      </span>
                    </button>
                  </li>
                );
              })}
              {noneCount > 0 && (
                <li>
                  <button
                    onClick={() => selectFilter("__none__")}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm italic ${
                      filter === "__none__"
                        ? "bg-neutral-800 text-neutral-50"
                        : "text-neutral-400 active:bg-neutral-900"
                    }`}
                  >
                    <span>Sin especificar</span>
                    <span className="ml-3 shrink-0 text-xs text-neutral-500">
                      ({noneCount})
                    </span>
                  </button>
                </li>
              )}
            </ul>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  if (!stack || !claim) {
    return (
      <main className="flex h-[100dvh] w-screen flex-col bg-neutral-950">
        {toolbar}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-base text-neutral-400">
            {filter === null
              ? "No te falta comprar nada."
              : filter === "__none__"
                ? "No quedan pendientes sin tienda asignada."
                : `No quedan pendientes en ${filter}.`}
          </p>
          {filter !== null && (
            <button
              onClick={() => selectFilter(null)}
              className="text-sm text-neutral-200 underline"
            >
              Quitar filtro
            </button>
          )}
        </div>
        {drawer}
      </main>
    );
  }

  return (
    <main
      className="relative flex h-[100dvh] w-screen flex-col overflow-hidden bg-neutral-950"
      style={{ touchAction: viewMode === "card" ? "none" : "auto" }}
    >
      {toolbar}

      {viewMode === "card" && stack.count > 1 && (
        <div className="shrink-0 border-b border-emerald-900/50 bg-emerald-900/30 px-4 py-2 text-center text-sm font-medium text-emerald-200">
          Comprar {stack.count} unidades
        </div>
      )}

      {viewMode === "gallery" ? (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-4 gap-1 p-1">
            {stacks.map((s, i) => (
              <button
                key={s.key}
                onClick={() => openCardFromGallery(i)}
                className="relative aspect-[5/7] overflow-hidden rounded bg-neutral-900 active:opacity-80"
              >
                {s.representative.imagen_claim ? (
                  <Image
                    src={s.representative.imagen_claim}
                    alt={s.representative.nombre_carta}
                    fill
                    sizes="25vw"
                    style={{ objectFit: "cover" }}
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-1 text-center">
                    <span className="text-[10px] leading-tight text-neutral-300">
                      {s.representative.nombre_carta}
                    </span>
                  </div>
                )}
                {s.count > 1 && (
                  <span className="absolute right-1 top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow">
                    x{s.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative flex-1 overflow-hidden">
            <AnimatePresence initial={false} mode="sync" custom={direction}>
              <motion.div
                key={stack.key}
                className="absolute inset-0"
                custom={direction}
                variants={slideVariants}
                initial={cameFromGallery ? false : "enter"}
                animate="center"
                exit="exit"
                transition={{
                  x: {
                    type: "spring",
                    stiffness: 320,
                    damping: 34,
                    mass: 0.6,
                  },
                }}
                drag={dialogOpen ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={handleDragEnd}
              >
                {claim.imagen_claim ? (
                  <Image
                    src={claim.imagen_claim}
                    alt={claim.nombre_carta}
                    fill
                    sizes="100vw"
                    draggable={false}
                    style={{ objectFit: "contain", pointerEvents: "none" }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-8">
                    <p className="text-center text-2xl font-medium text-neutral-200">
                      {claim.nombre_carta}
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {cameFromGallery && (
              <button
                onClick={backToGallery}
                aria-label="Volver a galería"
                className="absolute left-3 top-3 z-10 rounded-full bg-black/40 p-2 text-neutral-100 shadow-lg backdrop-blur-sm active:scale-90 active:bg-neutral-700/80"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}

            <button
              onClick={() => setConfirmOpen(true)}
              aria-label="Marcar como comprada"
              className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/40 p-3 text-emerald-300 shadow-lg backdrop-blur-sm transition active:scale-90 active:bg-emerald-500/80 active:text-white"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M5 12l5 5L20 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="shrink-0 border-t border-neutral-800">
            <div className="w-full border-b border-neutral-800 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                Nombre
              </p>
              <p className="truncate text-base font-medium text-neutral-50">
                {claim.nombre_carta}
              </p>
            </div>
            <div className="grid grid-cols-3">
              <div className="border-r border-neutral-800 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                  Tienda
                </p>
                <p className="truncate text-sm text-neutral-50">
                  {claim.tienda ?? "—"}
                </p>
              </div>
              <div className="border-r border-neutral-800 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                  Venta
                </p>
                <PriceCell usd={claim.precio} />
              </div>
              <div className="px-3 py-3">
                <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                  Compra
                </p>
                <PriceCell usd={claim.precio_compra} />
              </div>
            </div>
          </div>
        </>
      )}

      <AnimatePresence>
        {confirmOpen && (
          <div
            key="confirm-wrap"
            className="pointer-events-none fixed inset-x-0 bottom-32 z-40 flex justify-center px-4"
          >
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-auto w-full max-w-sm rounded-xl border border-neutral-700 bg-neutral-900/95 p-4 shadow-2xl backdrop-blur"
            >
              <p className="mb-3 text-sm text-neutral-100">
                {stack.count > 1
                  ? `¿Compraste ${stack.count}? Se marcarán las ${stack.count} unidades como compradas.`
                  : "Esta carta está comprada, desaparecerá."}
              </p>
              {errorMsg && (
                <p className="mb-2 text-xs text-red-400">{errorMsg}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setConfirmOpen(false);
                    setErrorMsg(null);
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm text-neutral-300 active:bg-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={onAccept}
                  disabled={marking}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {marking ? "Marcando…" : "Aceptar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {drawer}
    </main>
  );
}
