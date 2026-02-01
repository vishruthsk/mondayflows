"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/contexts/AuthContext";
import { api } from "@/lib/api";

function VerifyForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [otp, setOTP] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [resendLoading, setResendLoading] = useState(false);

    useEffect(() => {
        const emailParam = searchParams.get("email");
        if (emailParam) {
            setEmail(decodeURIComponent(emailParam));
        } else {
            router.push("/auth/login");
        }
    }, [searchParams, router]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!otp || otp.length !== 6) {
            setError("Please enter a valid 6-digit code");
            return;
        }

        setIsLoading(true);

        try {
            await login(email, otp);
            // Redirect handled by AuthContext
        } catch (err: any) {
            setError(err.message || "Invalid code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setResendLoading(true);
        setError("");

        try {
            const response = await api.auth.sendOTP(email);
            if (response.success) {
                setError("");
                // Ideally show a toast here
            } else {
                setError("Failed to resend code");
            }
        } catch (err: any) {
            setError(err.message || "Failed to resend code");
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: 'url(/images/auth-bg.png)' }}
        >
            <Card className="w-full max-w-[400px] border border-white/20 shadow-xl shadow-purple-500/10 p-8 sm:p-10 rounded-2xl bg-white/90 backdrop-blur-md">
                <div className="text-center mb-10">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                        Check your email
                    </h1>
                    <p className="text-gray-500 text-sm">
                        We sent a code to <span className="font-semibold text-gray-900">{email}</span>
                    </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-6">
                    <div>
                        <Input
                            type="text"
                            label="Verification Code"
                            placeholder="000000"
                            value={otp}
                            onChange={(e) => setOTP(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            error={error}
                            disabled={isLoading}
                            maxLength={6}
                            className="bg-white text-center text-lg tracking-widest"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-lg font-medium transition-all shadow-lg shadow-indigo-100"
                        loading={isLoading}
                        disabled={isLoading || otp.length !== 6}
                    >
                        Verify Code
                    </Button>
                </form>

                <div className="mt-8 text-center space-y-4">
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendLoading}
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
                    >
                        {resendLoading ? "Sending..." : "Didn't receive a code? Resend"}
                    </button>

                    <div>
                        <button
                            type="button"
                            onClick={() => router.push("/auth/login")}
                            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            ← Back to login
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        }>
            <VerifyForm />
        </Suspense>
    );
}
