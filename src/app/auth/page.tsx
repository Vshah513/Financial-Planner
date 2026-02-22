"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";

export default function AuthPage() {
    const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (activeTab === "signin") {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match");
                }
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: name }
                    }
                });
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
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-8" style={{ backgroundColor: "#050d1a" }}>
            <div
                className="w-full max-w-[480px] border border-white/5 bg-[#0a1428]/80 backdrop-blur-xl shadow-2xl rounded-3xl"
                style={{ padding: "48px" }}
            >
                <div className="flex flex-col items-center text-center mb-[16px]">
                    <div className="w-full flex justify-center mb-[16px]">
                        <Image
                            src="/New Logo.png"
                            alt="Cash Clarity"
                            width={200}
                            height={200}
                            style={{
                                objectFit: 'contain',
                                borderRadius: '16px',
                                alignSelf: 'center'
                            }}
                            className="drop-shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                            priority
                        />
                    </div>
                    <div className="space-y-1.5 z-10 relative">
                        <p className="text-[17px] font-medium text-gray-300">
                            Solo business financial planning made simple.
                        </p>
                    </div>
                </div>

                <div className="w-full grid grid-cols-2 mb-10 bg-[#050d1a] border border-white/5 p-1 rounded-xl shadow-inner">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab("signin");
                            setError("");
                        }}
                        className={`rounded-lg py-3 font-semibold transition-all duration-200 ${activeTab === "signin"
                            ? "bg-[#2563eb] text-white shadow-md"
                            : "text-gray-500 hover:text-gray-300"
                            }`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab("signup");
                            setError("");
                        }}
                        className={`rounded-lg py-3 font-semibold transition-all duration-200 ${activeTab === "signup"
                            ? "bg-[#2563eb] text-white shadow-md"
                            : "text-gray-500 hover:text-gray-300"
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-5">
                        {activeTab === "signup" && (
                            <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2">
                                <Label htmlFor="name" className="text-gray-300 font-medium text-[15px]">Full Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Jane Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={activeTab === "signup"}
                                    className="bg-[#050d1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#2563eb] h-[56px] px-4 rounded-xl text-[16px]"
                                />
                            </div>
                        )}

                        <div className="space-y-2.5">
                            <Label htmlFor="email" className="text-gray-300 font-medium text-[15px]">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-[#050d1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#2563eb] h-[56px] px-4 rounded-xl text-[16px]"
                            />
                        </div>

                        <div className="space-y-2.5">
                            <Label htmlFor="password" className="text-gray-300 font-medium text-[15px]">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="bg-[#050d1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#2563eb] h-[56px] px-4 rounded-xl text-[16px]"
                            />
                        </div>

                        {activeTab === "signup" && (
                            <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2">
                                <Label htmlFor="confirmPassword" className="text-gray-300 font-medium text-[15px]">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required={activeTab === "signup"}
                                    minLength={6}
                                    className="bg-[#050d1a] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#2563eb] h-[56px] px-4 rounded-xl text-[16px]"
                                />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                            <p className="text-[15px] text-red-400 text-center font-medium">
                                {error}
                            </p>
                        </div>
                    )}

                    <div className="pt-2">
                        <Button
                            type="submit"
                            className="w-full h-[56px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-lg rounded-xl transition-colors"
                            disabled={loading}
                        >
                            {loading ? "Please wait..." : activeTab === "signin" ? "Sign In" : "Create Account"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
