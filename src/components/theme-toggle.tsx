"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const isDark = mounted ? (resolvedTheme === "dark") : true;

    return (
        <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative h-9 w-9 rounded-full border border-border/40 bg-background/40 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-background/60 transition-colors overflow-hidden"
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={isDark ? "moon" : "sun"}
                    initial={{ y: -16, opacity: 0, rotate: -90 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: 16, opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    {isDark ? (
                        <Moon className="h-4 w-4 text-foreground" />
                    ) : (
                        <Sun className="h-4 w-4 text-foreground" />
                    )}
                </motion.span>
            </AnimatePresence>
        </button>
    );
}
