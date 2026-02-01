"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/contexts/AuthContext";
import { api } from "@/lib/api";

export default function VerifyPage() {
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
                setError(""); // Clear any errors
                // Could show success toast here
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Check your email
                    </h1>
                    <p className="text-gray-600">
                        We sent a code to <span className="font-medium">{email}</span>
                    </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-6">
                    <Input
                        type="text"
                        label="Verification Code"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOTP(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        error={error}
                        disabled={isLoading}
                        maxLength={6}
                    />

                    <Button
                        type="submit"
                        className="w-full"
                        loading={isLoading}
                        disabled={isLoading || otp.length !== 6}
                    >
                        Verify Code
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendLoading}
                        className="text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                    >
                        {resendLoading ? "Sending..." : "Didn't receive a code? Resend"}
                    </button>
                </div>

                <div className="mt-4 text-center">
                    <button
                        type="button"
                        onClick={() => router.push("/auth/login")}
                        className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        ← Back to login
                    </button>
                </div>
            </Card>
        </div>
    );
}
