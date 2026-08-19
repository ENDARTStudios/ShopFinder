"use client";

/**
 * FadeIn — wrapper de entrada padrão do sistema de motion
 * (docs/eng/MOTION-SYSTEM.md): fade + translateY 12px, ease-out,
 * saída mais curta, respeita prefers-reduced-motion.
 */
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

const EASE_ENTER = [0.05, 0.7, 0.1, 1] as const;
const EASE_EXIT = [0.3, 0, 1, 1] as const;

export function FadeIn({
  children,
  delay = 0,
  y = 12,
  duration = 0.25,
  className,
  style
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15, ease: EASE_EXIT } }}
      transition={{ duration, delay, ease: EASE_ENTER }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger de grade — micro cascade 30ms/item, total < 400ms
 * (regra 1/3 do sistema de motion). Em `itemCount` grande o passo é
 * reduzido para manter o total da cascata sob 400ms.
 */
export function FadeInStagger({
  children,
  className,
  role,
  itemCount
}: {
  children: React.ReactNode;
  className?: string;
  role?: React.AriaRole;
  /** Nº de itens da grade — usado para limitar o stagger total. */
  itemCount?: number;
}) {
  const reduceMotion = useReducedMotion();
  const stagger = itemCount && itemCount > 1 ? Math.min(0.03, 0.4 / itemCount) : 0.03;

  if (reduceMotion) {
    return (
      <div className={className} role={role}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      role={role}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } }
      }}
    >
      {children}
    </motion.div>
  );
}

export function FadeInItem({
  children,
  className,
  role
}: {
  children: React.ReactNode;
  className?: string;
  role?: React.AriaRole;
}) {
  return (
    <motion.div
      className={className}
      role={role}
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_ENTER } }
      }}
    >
      {children}
    </motion.div>
  );
}
