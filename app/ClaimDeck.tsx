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

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
  }),
  center: { x: 0 },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
  }),
};

function CardView({ claim }: { claim: Claim }) {
  return (
    <div className="flex h-full w-full flex-col bg-neutral-950">
      <div className="relative flex-1">
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
            <p className="truncate text-sm text-neutral-50">
              {formatPrice(claim.precio)}
            </p>
          </div>
          <div className="px-3 py-3">
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">
              Compra
            </p>
            <p className="truncate text-sm text-neutral-50">
              {formatPrice(claim.precio_compra)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClaimDeck({ claims }: Props) {
  const [[index, direction], setIndexDir] = useState<[number, number]>([0, 0]);

  const total = claims.length;
  const claim = claims[index];

  const paginate = (dir: number) => {
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

  return (
    <main
      className="h-[100dvh] w-screen overflow-hidden bg-neutral-950"
      style={{ touchAction: "none" }}
    >
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
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={handleDragEnd}
        >
          <CardView claim={claim} />
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
