"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SectionHeadingProps {
  badge?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  align?: "left" | "center";
}

const SectionHeading = ({ badge, title, subtitle, children, align = "left" }: SectionHeadingProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className={align === "center" ? "text-center" : ""}
  >
    {badge && (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary mb-4 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-glow-pulse" />
        {badge}
      </span>
    )}
    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{title}</h2>
    {subtitle && (
      <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed mx-auto">
        {subtitle}
      </p>
    )}
    {children}
  </motion.div>
);

export default SectionHeading;
