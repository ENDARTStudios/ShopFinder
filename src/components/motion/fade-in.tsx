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
 * (regra 1/3 do sistema de motion).
 */
export function FadeInStagger({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.03 } }
      }}
    >
      {children}
    </motion.div>
  );
}

export function FadeInItem({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_ENTER } }
      }}
    >
      {children}
    </motion.div>
  );
}
