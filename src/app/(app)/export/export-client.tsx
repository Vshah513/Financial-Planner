"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Download, Upload, FileSpreadsheet, FileText, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { exportYearCSV, exportYearXLSX, importCSVData } from "@/app/actions/export";
import Papa from "papaparse";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export default function ExportClient({
    workspaceId,
    initialYear,
}: {
    workspaceId: string;
    initialYear: number;
}) {
    const [year, setYear] = useState(initialYear);
    const [exporting, setExporting] = useState(false);
    const [importData, setImportData] = useState<Record<string, string>[]>([]);
    const [columnMap, setColumnMap] = useState<Record<string, string>>({});
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExportCSV = async () => {
        setExporting(true);
        try {
            const csv = await exportYearCSV(workspaceId, year);
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `cash-clarity-${year}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("CSV exported!");
        } catch {
            toast.error("Failed to export CSV");
        } finally {
            setExporting(false);
        }
    };

    const handleExportXLSX = async () => {
        setExporting(true);
        try {
            const base64 = await exportYearXLSX(workspaceId, year);
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `cash-clarity-${year}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("XLSX exported!");
        } catch {
            toast.error("Failed to export XLSX");
        } finally {
            setExporting(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete(results) {
                const data = results.data as Record<string, string>[];
                setImportData(data);

                // Auto-detect columns
                const headers = Object.keys(data[0] || {});
                const autoMap: Record<string, string> = {};
                for (const h of headers) {
                    const lower = h.toLowerCase();
                    if (lower.includes("description") || lower.includes("item")) autoMap.description = h;
                    if (lower.includes("amount") || lower.includes("value")) autoMap.amount = h;
                    if (lower.includes("direction") || lower.includes("type")) autoMap.direction = h;
                    if (lower.includes("category") || lower.includes("cat")) autoMap.category = h;
                    if (lower.includes("month")) autoMap.month = h;
                }
                setColumnMap(autoMap);
                toast.success(`Parsed ${data.length} rows`);
            },
            error() {
                toast.error("Failed to parse CSV");
            },
        });
    };

    const handleImport = async () => {
        setImporting(true);
        try {
            const rows = importData.map((row) => ({
                direction: (row[columnMap.direction] || "expense").toLowerCase() as string,
                category: row[columnMap.category] || "Other Expenses",
                description: row[columnMap.description] || "",
                amount: parseFloat(row[columnMap.amount] || "0") || 0,
                month: columnMap.month
                    ? MONTH_NAMES.indexOf(row[columnMap.month]) + 1 || parseInt(row[columnMap.month]) || 1
                    : 1,
            }));

            const result = await importCSVData(workspaceId, year, rows);
            toast.success(`Imported ${result.imported} entries`);
            setImportData([]);
        } catch {
            toast.error("Failed to import data");
        } finally {
            setImporting(false);
        }
    };

    const csvHeaders = importData.length > 0 ? Object.keys(importData[0]) : [];
    const requiredFields = ["description", "amount", "direction", "category", "month"];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Export &amp; Import</h1>
                <p className="text-sm text-muted-foreground">Export year data or import from CSV</p>
            </div>

            {/* Year selector */}
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setYear((y) => y - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg font-bold w-16 text-center">{year}</span>
                <Button variant="outline" size="icon" onClick={() => setYear((y) => y + 1)}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Export */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium">Export {year} Data</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-3">
                    <Button onClick={handleExportCSV} disabled={exporting} variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button onClick={handleExportXLSX} disabled={exporting}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Export XLSX
                    </Button>
                </CardContent>
            </Card>

            {/* Import */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium">Import CSV</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-4 w-4 mr-2" />
                            Select CSV File
                        </Button>
                    </div>

                    {importData.length > 0 && (
                        <>
                            <Separator />
                            <div>
                                <p className="text-sm font-medium mb-3">Map Columns</p>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    {requiredFields.map((field) => (
                                        <div key={field} className="space-y-1">
                                            <Label className="text-xs capitalize">{field}</Label>
                                            <Select
                                                value={columnMap[field] || ""}
                                                onValueChange={(v) => setColumnMap((prev) => ({ ...prev, [field]: v }))}
                                            >
                                                <SelectTrigger className="h-8">
                                                    <SelectValue placeholder="Select..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {csvHeaders.map((h) => (
                                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <p className="text-sm font-medium mb-2">Preview (first 5 rows)</p>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {csvHeaders.map((h) => (
                                                    <TableHead key={h} className="text-xs">{h}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {importData.slice(0, 5).map((row, i) => (
                                                <TableRow key={i}>
                                                    {csvHeaders.map((h) => (
                                                        <TableCell key={h} className="text-xs">{row[h]}</TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <Button onClick={handleImport} disabled={importing}>
                                <Download className="h-4 w-4 mr-2" />
                                {importing ? "Importing..." : `Import ${importData.length} Rows`}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
