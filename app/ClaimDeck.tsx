"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { supabase, type Claim } from "@/lib/supabase";

type Props = { claims: Claim[] };

const SWIPE_VELOCITY = 500;
const SWIPE_RATIO = 0.25;

function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
  }).format(value);
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
  const [filter, setFilter] = useState<string | null>(null);
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

  const visibleClaims = useMemo(
    () => (filter ? allClaims.filter((c) => c.tienda === filter) : allClaims),
    [allClaims, filter]
  );

  const total = visibleClaims.length;
  const safeIndex = total > 0 ? index % total : 0;
  const claim = visibleClaims[safeIndex];
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

  const selectFilter = (cs: string | null) => {
    setFilter(cs);
    setIndexDir([0, 0]);
    setMenuOpen(false);
  };

  const onAccept = async () => {
    if (!claim || marking) return;
    setMarking(true);
    setErrorMsg(null);
    const { error } = await supabase
      .from("claims")
      .update({ comprada: "comprada" })
      .eq("id", claim.id);
    if (error) {
      setErrorMsg(error.message);
      setMarking(false);
      return;
    }
    const newTotal = total - 1;
    setAllClaims((prev) => prev.filter((c) => c.id !== claim.id));
    setIndexDir(([prev]) => {
      if (newTotal <= 0) return [0, 0];
      return [prev % newTotal, 0];
    });
    setConfirmOpen(false);
    setMarking(false);
  };

  if (!claim) {
    return (
      <main className="flex h-[100dvh] w-screen flex-col items-center justify-center gap-3 bg-neutral-950 p-6 text-center">
        <p className="text-base text-neutral-400">
          {filter
            ? `No quedan pendientes en ${filter}.`
            : "No te falta comprar nada."}
        </p>
        {filter && (
          <button
            onClick={() => selectFilter(null)}
            className="text-sm text-neutral-200 underline"
          >
            Quitar filtro
          </button>
        )}
      </main>
    );
  }

  return (
    <main
      className="relative flex h-[100dvh] w-screen flex-col overflow-hidden bg-neutral-950"
      style={{ touchAction: "none" }}
    >
      {filter && (
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-2 text-xs text-neutral-300">
          <span>
            Filtrando por <strong className="text-neutral-100">{filter}</strong>{" "}
            · {total}
          </span>
          <button
            onClick={() => selectFilter(null)}
            className="text-neutral-400 underline"
          >
            Quitar
          </button>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} mode="sync" custom={direction}>
          <motion.div
            key={claim.id}
            className="absolute inset-0"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 320, damping: 34, mass: 0.6 },
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
        <div className="grid grid-cols-[1fr_1fr_1fr_auto]">
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
            <p className="truncate text-sm text-neutral-50">
              {formatPrice(claim.precio)}
            </p>
          </div>
          <div className="border-r border-neutral-800 px-3 py-3">
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">
              Compra
            </p>
            <p className="truncate text-sm text-neutral-50">
              {formatPrice(claim.precio_compra)}
            </p>
          </div>
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Filtrar por cardshop"
            className="flex items-center justify-center px-4 text-neutral-300 active:bg-neutral-900"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-32 left-1/2 z-30 w-[88%] max-w-sm -translate-x-1/2 rounded-xl border border-neutral-700 bg-neutral-900/95 p-4 shadow-2xl backdrop-blur"
          >
            <p className="mb-3 text-sm text-neutral-100">
              Esta carta está comprada, desaparecerá.
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
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 z-20 bg-black/60"
            />
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="absolute inset-x-0 bottom-0 z-30 max-h-[70%] overflow-y-auto rounded-t-2xl border-t border-neutral-700 bg-neutral-950"
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-3">
                <p className="text-sm font-medium text-neutral-100">cardshop:</p>
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
              <ul className="pb-4">
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
                      {allClaims.length}
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
                        <span className="ml-3 text-xs text-neutral-500">
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {cardshops.length === 0 && (
                  <li className="px-4 py-3 text-sm text-neutral-500">
                    No hay tiendas asignadas todavía.
                  </li>
                )}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
