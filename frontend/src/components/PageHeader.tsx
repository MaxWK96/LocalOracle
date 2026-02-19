"use client";

import { motion } from "framer-motion";
import GridBackground from "./GridBackground";

interface PageHeaderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  badge?: string;
}

export function PageHeader({ title, description, icon, badge }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden pt-10 pb-12">
      <GridBackground />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          {badge && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary mb-4 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-glow-pulse" />
              {badge}
            </span>
          )}
          <div className="flex items-center gap-3 mb-3">
            {icon && <span className="text-3xl leading-none">{icon}</span>}
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight gradient-text">{title}</h1>
          </div>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl leading-relaxed">
            {description}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
