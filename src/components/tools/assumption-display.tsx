import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

interface AssumptionDisplayProps {
    baselineSource: 'actuals' | 'planner';
    periodWindow?: string;
    categories?: string[];
    customAssumptions?: Record<string, any>;
}

export function AssumptionDisplay({
    baselineSource,
    periodWindow,
    categories,
    customAssumptions,
}: AssumptionDisplayProps) {
    return (
        <Card className="bg-muted/30 border-dashed">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Assumptions Used</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Baseline Source:</span>
                    <Badge variant="secondary" className="capitalize">
                        {baselineSource}
                    </Badge>
                </div>

                {periodWindow && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Period Window:</span>
                        <span className="font-medium">{periodWindow}</span>
                    </div>
                )}

                {categories && categories.length > 0 && (
                    <div className="text-sm">
                        <span className="text-muted-foreground">Categories Included:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                            {categories.map((category) => (
                                <Badge key={category} variant="outline" className="text-xs">
                                    {category}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {customAssumptions && Object.keys(customAssumptions).length > 0 && (
                    <div className="pt-2 border-t border-border space-y-1">
                        {Object.entries(customAssumptions).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground capitalize">
                                    {key.replace(/_/g, ' ')}:
                                </span>
                                <span className="font-medium">
                                    {typeof value === 'number'
                                        ? value.toLocaleString()
                                        : String(value)
                                    }
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
