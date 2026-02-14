import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface ToolCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    href: string;
    category: 'personal' | 'business';
    badge?: string;
    isAvailable?: boolean;
}

export function ToolCard({
    title,
    description,
    icon: Icon,
    href,
    category,
    badge,
    isAvailable = true,
}: ToolCardProps) {
    const cardContent = (
        <Card className={`
        transition-all duration-200 h-full
        ${isAvailable
                ? 'hover:shadow-lg hover:border-primary/50 cursor-pointer'
                : 'opacity-60 cursor-not-allowed'
            }
      `}>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`
                p-2 rounded-lg
                ${category === 'personal'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            }
              `}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{title}</CardTitle>
                        </div>
                    </div>
                    {badge && (
                        <Badge variant="secondary" className="text-xs">
                            {badge}
                        </Badge>
                    )}
                </div>
                <CardDescription className="mt-2 line-clamp-2">
                    {description}
                </CardDescription>
            </CardHeader>
            {!isAvailable && (
                <CardContent>
                    <p className="text-xs text-muted-foreground">Coming soon</p>
                </CardContent>
            )}
        </Card>
    );

    if (isAvailable) {
        return <Link href={href}>{cardContent}</Link>;
    }

    return cardContent;
}
