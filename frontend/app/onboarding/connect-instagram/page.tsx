"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/contexts/AuthContext";
import { ArrowRightIcon } from "@heroicons/react/24/solid";

export default function ConnectInstagramPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (user?.instagram_connected) {
            router.push("/dashboard");
        }
    }, [user, router]);

    const handleConnect = async () => {
        setIsLoading(true);
        setError("");

        try {
            // Placeholder for real OAuth
            setError("Instagram OAuth integration coming soon. Redirecting to dashboard...");
            setTimeout(() => {
                router.push("/dashboard");
            }, 2000);
        } catch (err: any) {
            setError(err.message || "Failed to connect Instagram");
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: 'url(/images/auth-bg.png)' }}
        >
            <Card className="w-full max-w-[440px] border border-white/20 shadow-xl shadow-purple-500/10 p-8 sm:p-12 rounded-3xl text-center bg-white/95 backdrop-blur-md">
                <div className="mb-8 relative inline-block">
                    <div className="w-20 h-20 bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#F77737] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-pink-200 transform rotate-3">
                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                    Connect Instagram
                </h1>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                    To automate comments and DMs, we need permission to access your Instagram professional account.
                </p>

                <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left space-y-3 border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-green-600 text-xs">✓</span>
                        </div>
                        <span className="text-sm text-gray-600">Auto-reply to comments</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-green-600 text-xs">✓</span>
                        </div>
                        <span className="text-sm text-gray-600">Send automated DMs</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-green-600 text-xs">✓</span>
                        </div>
                        <span className="text-sm text-gray-600">Read public profile info</span>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg">
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                <Button
                    onClick={handleConnect}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-xl text-[15px] shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group transition-all"
                    loading={isLoading}
                    disabled={isLoading}
                >
                    Connect Account
                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>

                <p className="mt-4 text-xs text-gray-400">
                    Safe & Secure. We only ask for permissions we need.
                </p>
            </Card>
        </div>
    );
}
