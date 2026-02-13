"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
            }
            router.push("/dashboard");
            router.refresh();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An error occurred";
            setError(message);
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            {/* Ambient background effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-chart-2/10 blur-3xl" />
            </div>

            <Card className="relative w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
                <CardHeader className="text-center space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                        <DollarSign className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        Cash Clarity
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Solo business financial planning made simple
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-background/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="bg-background/50"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                                {error}
                            </p>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3">
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
                        </Button>



                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {isLogin
                                ? "Don't have an account? Sign up"
                                : "Already have an account? Sign in"}
                        </button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
