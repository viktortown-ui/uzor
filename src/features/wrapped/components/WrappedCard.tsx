import { motion, useReducedMotion } from 'framer-motion';
import type { PropsWithChildren } from 'react';

export function WrappedCard({ children, className = '', delay = 0 }: PropsWithChildren<{ className?: string; delay?: number }>) {
  const reduce = useReducedMotion();
  return <motion.section className={`wrapped-card ${className}`} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38, delay }}>{children}</motion.section>;
}
