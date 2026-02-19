"use client";

import { motion } from "framer-motion";

const GridBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Grid */}
    <div className="absolute inset-0 grid-pattern opacity-30" />

    {/* Radial gradient overlays */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
    <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />

    {/* Animated orbs */}
    <motion.div
      animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-20 left-[15%] w-2 h-2 rounded-full bg-primary/40 blur-[1px]"
    />
    <motion.div
      animate={{ y: [0, 15, 0], x: [0, -8, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      className="absolute top-40 right-[20%] w-1.5 h-1.5 rounded-full bg-accent/40 blur-[1px]"
    />
    <motion.div
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      className="absolute top-60 left-[40%] w-1 h-1 rounded-full bg-primary/30"
    />
  </div>
);

export default GridBackground;
