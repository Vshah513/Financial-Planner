"use client";

import { useMemo, useState } from "react";
import { Sparkles, CheckCircle2, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DemoCategory =
  | "Salary"
  | "Subscriptions"
  | "Rent"
  | "Groceries"
  | "Transportation"
  | "Dining"
  | "Utilities"
  | "Other";

type DemoEntry = {
  id: string;
  direction: "income" | "expense";
  description: string;
  amount: number;
  category: DemoCategory;
};

const DEMO_PASTE = `Paycheck 5200
Cursor subscription 200
Rent 2100
Groceries 120.50
Uber 34.20`;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function uid() {
  // Avoid crypto dependency in older browsers.
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function DemoSandboxMonthPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [entries, setEntries] = useState<DemoEntry[]>([]);
  const [lastImportMode, setLastImportMode] = useState<"ai" | "heuristic" | null>(null);

  const totals = useMemo(() => {
    const income = entries.filter((e) => e.direction === "income").reduce((s, e) => s + e.amount, 0);
    const expense = entries.filter((e) => e.direction === "expense").reduce((s, e) => s + e.amount, 0);
    return { income, expense, net: income - expense };
  }, [entries]);

  const byCategory = useMemo(() => {
    const map = new Map<DemoCategory, number>();
    for (const e of entries.filter((x) => x.direction === "expense")) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const handleUseDemoText = () => {
    setText(DEMO_PASTE);
    setStep((s) => (s < 2 ? 2 : s));
  };

  const handleImport = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setImporting(true);
    try {
      const res = await fetch("/api/demo/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const json = (await res.json()) as
        | { entries: Array<{ direction: "income" | "expense"; description: string; amount: number; category: DemoCategory }>; mode: "ai" | "heuristic" }
        | { error: string };

      if (!res.ok || "error" in json) throw new Error("Import failed");

      const imported = json.entries
        .filter((e) => e.description && e.amount > 0)
        .slice(0, 50)
        .map((e) => ({
          id: uid(),
          ...e,
          amount: Number(e.amount),
        }));

      if (!imported.length) {
        toast.message("No entries detected", { description: "Try a clearer list like “Rent 2100, Groceries 120.50, Paycheck 5200”." });
        return;
      }

      setEntries((prev) => [...prev, ...imported]);
      setLastImportMode(json.mode);
      setStep(3);
      toast.success(`Imported ${imported.length} entr${imported.length === 1 ? "y" : "ies"}`);
    } catch {
      toast.error("Couldn’t import that text");
    } finally {
      setImporting(false);
    }
  };

  const handleNext = () => setStep((s) => (s === 4 ? 4 : ((s + 1) as 2 | 3 | 4)));
  const handleBack = () => setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3 | 4)));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Interactive Sandbox: Month Walkthrough</h1>
          <p className="text-sm text-muted-foreground">
            Try the “Assistant Import” flow without signing in. Paste a messy list and watch it sort into categories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBack} disabled={step === 1}>
            Back
          </Button>
          <Button size="sm" onClick={handleNext} disabled={step === 4}>
            Next
          </Button>
        </div>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="py-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MousePointerClick className="h-4 w-4 text-primary/70" />
            Walkthrough Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-4">
          {[
            { n: 1, title: "Load demo month", desc: "Start with an empty month." },
            { n: 2, title: "Paste messy list", desc: "Use the sample text." },
            { n: 3, title: "Import + auto-sort", desc: "See categorized rows appear." },
            { n: 4, title: "Review summary", desc: "Check totals and breakdown." },
          ].map((s) => (
            <div key={s.n} className={`rounded-lg border p-3 ${step === s.n ? "border-primary/50 bg-primary/5" : "border-border/40"}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Step {s.n}</span>
                {step > s.n && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {step === s.n && <Badge variant="secondary" className="text-[10px]">Current</Badge>}
              </div>
              <p className="mt-1 text-sm font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary/70" />
                Assistant Import (Sandbox)
                {lastImportMode && (
                  <Badge variant="outline" className="text-[10px] ml-1">
                    {lastImportMode === "ai" ? "AI" : "Heuristic"} mode
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste a messy list like: Cursor subscription 200, Rent 2100, Paycheck 5200…"
                className="min-h-28"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleUseDemoText} disabled={importing}>
                  Use demo text
                </Button>
                <Button size="sm" onClick={handleImport} disabled={importing || !text.trim()}>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {importing ? "Importing..." : "Import"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  This is a sandbox: it won’t touch your real data.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/30">Income</Badge>
                  <span className="text-xs text-muted-foreground font-normal">{formatCurrency(totals.income)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Item</TableHead>
                      <TableHead className="w-28 text-right text-[10px]">Amount</TableHead>
                      <TableHead className="w-28 text-[10px]">Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.filter((e) => e.direction === "income").map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs">{e.description}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(e.amount)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{e.category}</TableCell>
                      </TableRow>
                    ))}
                    {entries.filter((e) => e.direction === "income").length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-xs">
                          Import something like “Paycheck 5200”
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline" className="bg-chart-5/10 text-chart-5 border-chart-5/30">Expenses</Badge>
                  <span className="text-xs text-muted-foreground font-normal">{formatCurrency(totals.expense)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Item</TableHead>
                      <TableHead className="w-28 text-right text-[10px]">Amount</TableHead>
                      <TableHead className="w-28 text-[10px]">Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.filter((e) => e.direction === "expense").map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs">{e.description}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(e.amount)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{e.category}</TableCell>
                      </TableRow>
                    ))}
                    {entries.filter((e) => e.direction === "expense").length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-xs">
                          Import something like “Cursor subscription 200”
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm sticky top-6">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Sandbox Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Income</span>
                <span className="text-sm font-bold positive-value">{formatCurrency(totals.income)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Expenses</span>
                <span className="text-sm font-bold negative-value">{formatCurrency(totals.expense)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Net</span>
                <span className={`text-sm font-bold ${totals.net >= 0 ? "positive-value" : "negative-value"}`}>
                  {formatCurrency(totals.net)}
                </span>
              </div>

              {byCategory.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Expense breakdown
                    </p>
                    {byCategory.slice(0, 6).map(([cat, total]) => (
                      <div key={cat} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{cat}</span>
                        <span className="font-medium">{formatCurrency(total)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <Separator />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEntries([]);
                  setText("");
                  setLastImportMode(null);
                  setStep(1);
                  toast.message("Sandbox reset");
                }}
              >
                Reset sandbox
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

