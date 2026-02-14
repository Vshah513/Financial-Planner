"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Category {
    id: string;
    name: string;
    isEssential: boolean;
}

interface CategoryManagerProps {
    categories: Category[];
    onToggle: (categoryId: string, isEssential: boolean) => void;
}

export function CategoryManager({ categories, onToggle }: CategoryManagerProps) {
    const essentialCategories = categories.filter((c) => c.isEssential);
    const nonessentialCategories = categories.filter((c) => !c.isEssential);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Categories</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Mark categories as essential or nonessential. Only nonessential categories will be
                    considered for cuts.
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Nonessential Categories */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                            Nonessential
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                            {nonessentialCategories.length} categories
                        </span>
                    </div>
                    <div className="space-y-2">
                        {nonessentialCategories.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">
                                No nonessential categories. Toggle categories below to mark them as nonessential.
                            </p>
                        ) : (
                            nonessentialCategories.map((category) => (
                                <CategoryRow
                                    key={category.id}
                                    category={category}
                                    onToggle={onToggle}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Essential Categories */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                            Essential
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                            {essentialCategories.length} categories
                        </span>
                    </div>
                    <div className="space-y-2">
                        {essentialCategories.map((category) => (
                            <CategoryRow
                                key={category.id}
                                category={category}
                                onToggle={onToggle}
                            />
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function CategoryRow({
    category,
    onToggle,
}: {
    category: Category;
    onToggle: (categoryId: string, isEssential: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            <Label htmlFor={`category-${category.id}`} className="cursor-pointer flex-1">
                {category.name}
            </Label>
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                    {category.isEssential ? "Essential" : "Nonessential"}
                </span>
                <Switch
                    id={`category-${category.id}`}
                    checked={category.isEssential}
                    onCheckedChange={(checked) => onToggle(category.id, checked)}
                />
            </div>
        </div>
    );
}
