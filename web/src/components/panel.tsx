"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { reveal } from "@/lib/motion";

export function Panel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <motion.section variants={reveal} className="border-t border-ink pt-4">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h3 className="label !text-ink">{title}</h3>
        {aside && <div className="label">{aside}</div>}
      </div>
      {children}
    </motion.section>
  );
}
