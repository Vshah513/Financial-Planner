"use client";

import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Quote = { symbol: string; price: number; change: number; changePct: number };

const SYMBOLS = ["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA", "SPY", "QQQ", "BTC-USD"];

const FALLBACK: Quote[] = [
    { symbol: "AAPL", price: 232.41, change: 1.83, changePct: 0.79 },
    { symbol: "MSFT", price: 421.07, change: -2.14, changePct: -0.51 },
    { symbol: "GOOGL", price: 184.32, change: 0.92, changePct: 0.50 },
    { symbol: "TSLA", price: 274.58, change: 4.21, changePct: 1.56 },
    { symbol: "NVDA", price: 142.83, change: 3.12, changePct: 2.23 },
    { symbol: "SPY", price: 583.12, change: 1.04, changePct: 0.18 },
    { symbol: "QQQ", price: 502.71, change: 1.97, changePct: 0.39 },
    { symbol: "BTC-USD", price: 96420, change: 1240, changePct: 1.30 },
];

export function MarketTicker() {
    const [quotes, setQuotes] = useState<Quote[]>(FALLBACK);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
        if (!apiKey) {
            // Simulate live tick when no key — drift prices each second
            const id = setInterval(() => {
                setQuotes((prev) =>
                    prev.map((q) => {
                        const drift = (Math.random() - 0.5) * (q.price * 0.0008);
                        const newPrice = +(q.price + drift).toFixed(2);
                        const newChange = +(q.change + drift).toFixed(2);
                        return {
                            ...q,
                            price: newPrice,
                            change: newChange,
                            changePct: +((newChange / (newPrice - newChange)) * 100).toFixed(2),
                        };
                    })
                );
            }, 1500);
            return () => clearInterval(id);
        }

        try {
            const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
            wsRef.current = ws;
            ws.onopen = () => {
                SYMBOLS.filter((s) => !s.includes("-")).forEach((s) => {
                    ws.send(JSON.stringify({ type: "subscribe", symbol: s }));
                });
                ws.send(JSON.stringify({ type: "subscribe", symbol: "BINANCE:BTCUSDT" }));
            };
            ws.onmessage = (evt) => {
                try {
                    const msg = JSON.parse(evt.data);
                    if (msg.type === "trade" && Array.isArray(msg.data)) {
                        setQuotes((prev) => {
                            const next = [...prev];
                            for (const trade of msg.data) {
                                const sym = trade.s === "BINANCE:BTCUSDT" ? "BTC-USD" : trade.s;
                                const idx = next.findIndex((q) => q.symbol === sym);
                                if (idx >= 0) {
                                    const oldPrice = next[idx].price;
                                    const newPrice = trade.p;
                                    const change = +(newPrice - oldPrice).toFixed(2);
                                    next[idx] = {
                                        ...next[idx],
                                        price: newPrice,
                                        change,
                                        changePct: +((change / oldPrice) * 100).toFixed(2),
                                    };
                                }
                            }
                            return next;
                        });
                    }
                } catch { }
            };
            return () => {
                try { ws.close(); } catch { }
            };
        } catch {
            return;
        }
    }, []);

    const items = [...quotes, ...quotes];

    return (
        <div className="relative overflow-hidden border-y border-border/40 bg-background/30 backdrop-blur">
            <div className="flex marquee whitespace-nowrap">
                {items.map((q, i) => {
                    const up = q.change >= 0;
                    return (
                        <div
                            key={`${q.symbol}-${i}`}
                            className="flex items-center gap-2 px-4 py-1.5 text-xs"
                        >
                            <span className="font-bold text-foreground/90">{q.symbol}</span>
                            <span className="font-mono text-foreground/70 tabular-nums">
                                {q.price < 1000 ? q.price.toFixed(2) : q.price.toLocaleString()}
                            </span>
                            <span
                                className={cn(
                                    "flex items-center gap-0.5 font-mono tabular-nums",
                                    up ? "text-emerald-400" : "text-rose-400"
                                )}
                            >
                                {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {up ? "+" : ""}{q.changePct.toFixed(2)}%
                            </span>
                            <span className="text-border">•</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
