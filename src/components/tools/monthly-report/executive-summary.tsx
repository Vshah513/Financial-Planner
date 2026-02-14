"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface ExecutiveSummaryProps {
    initialCommentary?: string;
    onSave: (commentary: string) => void;
}

export function ExecutiveSummary({ initialCommentary = "", onSave }: ExecutiveSummaryProps) {
    const [commentary, setCommentary] = useState(initialCommentary);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(commentary);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <CardTitle>Executive Summary</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="commentary">Monthly Commentary</Label>
                    <Textarea
                        id="commentary"
                        placeholder="Add your executive summary, key highlights, challenges, and outlook for next month..."
                        value={commentary}
                        onChange={(e) => setCommentary(e.target.value)}
                        rows={8}
                        className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                        This will appear at the top of your monthly report
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">
                    {saving ? "Saving..." : "Save Commentary"}
                </Button>
            </CardContent>
        </Card>
    );
}
