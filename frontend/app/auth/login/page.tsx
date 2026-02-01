"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email || !email.includes("@")) {
            setError("Please enter a valid email address");
            return;
        }

        setIsLoading(true);

        try {
            const response = await api.auth.sendOTP(email);

            if (response.success) {
                // Navigate to verify page with email
                router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
            } else {
                setError("Failed to send OTP. Please try again.");
            }
        } catch (err: any) {
            setError(err.message || "Failed to send OTP. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Welcome to Monday Flows
                    </h1>
                    <p className="text-gray-600">
                        Enter your email to get started
                    </p>
                </div>

                <form onSubmit={handleSendOTP} className="space-y-6">
                    <Input
                        type="email"
                        label="Email Address"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={error}
                        disabled={isLoading}
                    />

                    <Button
                        type="submit"
                        className="w-full"
                        loading={isLoading}
                        disabled={isLoading}
                    >
                        Continue with Email
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        We'll send you a one-time code to verify your email
                    </p>
                </div>
            </Card>
        </div>
    );
}
