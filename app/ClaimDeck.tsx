"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import type { Claim } from "@/lib/supabase";

type Props = { claims: Claim[] };

const SWIPE_VELOCITY = 500;
const SWIPE_RATIO = 0.25;

function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ClaimDeck({ claims }: Props) {
  const [index, setIndex] = useState(0);

  const total = claims.length;
  const claim = claims[index];

  const next = () => setIndex((i) => (i + 1) % total);
  const prev = () => setIndex((i) => (i - 1 + total) % total);

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const threshold =
      (typeof window !== "undefined" ? window.innerWidth : 360) * SWIPE_RATIO;
    if (info.offset.x < -threshold || info.velocity.x < -SWIPE_VELOCITY) {
      next();
    } else if (info.offset.x > threshold || info.velocity.x > SWIPE_VELOCITY) {
      prev();
    }
  };

  return (
    <main className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-neutral-950">
      <div
        className="relative flex-1 overflow-hidden"
        style={{ touchAction: "none" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={claim.id}
            className="absolute inset-0 flex items-center justify-center p-4"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative h-full w-full">
              <Image
                src={claim.image_url}
                alt={claim.name}
                fill
                sizes="100vw"
                priority
                draggable={false}
                style={{ objectFit: "contain", pointerEvents: "none" }}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`info-${claim.id}`}
          className="shrink-0 border-t border-neutral-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-full border-b border-neutral-800 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">
              Nombre
            </p>
            <p className="truncate text-base font-medium text-neutral-50">
              {claim.name}
            </p>
          </div>
          <div className="grid grid-cols-3">
            <div className="border-r border-neutral-800 px-3 py-3">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                Cardshop
              </p>
              <p className="truncate text-sm text-neutral-50">
                {claim.cardshop ?? "—"}
              </p>
            </div>
            <div className="border-r border-neutral-800 px-3 py-3">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                Venta
              </p>
              <p className="truncate text-sm text-neutral-50">
                {formatPrice(claim.sell_price)}
              </p>
            </div>
            <div className="px-3 py-3">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                Compra
              </p>
              <p className="truncate text-sm text-neutral-50">
                {formatPrice(claim.buy_price)}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
