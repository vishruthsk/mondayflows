"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/contexts/AuthContext";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

type AuthView = 'login' | 'signup' | 'signup-otp' | 'forgot-email' | 'forgot-reset';

export default function LoginPage() {
    const router = useRouter();
    const { refreshUser } = useAuth();

    // View State
    const [view, setView] = useState<AuthView>('login');

    // Form State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [otp, setOtp] = useState("");

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Strict Email Regex
    const isValidEmail = (email: string) => {
        const strictRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return strictRegex.test(email);
    };

    // Password Strength Calculation
    const getPasswordStrength = (pwd: string) => {
        let score = 0;
        if (pwd.length > 7) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        return score;
    };

    const passwordStrength = getPasswordStrength(password);

    const resetFormIds = () => {
        setError("");
        setSuccessMessage("");
    };

    const handleSwitchView = (newView: AuthView) => {
        resetFormIds();
        setView(newView);
        // Clear sensitive fields when switching main modes, but keep email for convenience
        if (newView === 'login' || newView === 'signup') {
            setPassword("");
            setConfirmPassword("");
            setOtp("");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        // Generic Validation
        if (!email) {
            setError("Email is required");
            return;
        }

        // --- LOGIN FLOW ---
        if (view === 'login') {
            if (!password) {
                setError("Please enter your password");
                return;
            }
            setIsLoading(true);
            try {
                const response = await api.auth.login({ email, password });
                if (response.success && response.data) {
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('auth_token', response.data.token);
                    }
                    await refreshUser();
                    router.push("/dashboard");
                }
            } catch (err: any) {
                // Fixed: Do not clear form on error, just show message
                setError("Invalid email or password");
            } finally {
                setIsLoading(false);
            }
        }

        // --- SIGNUP FLOW: STEP 1 (Details) ---
        else if (view === 'signup') {
            if (!isValidEmail(email)) {
                setError("Please enter a valid email address (e.g. user@example.com)");
                return;
            }
            if (password.length < 8) {
                setError("Password must be at least 8 characters");
                return;
            }
            if (password !== confirmPassword) {
                setError("Passwords do not match");
                return;
            }
            if (passwordStrength < 3) {
                setError("Please verify password strength - try adding numbers or special characters");
                return;
            }

            setIsLoading(true);
            try {
                // Send OTP to verify email before creating account
                const response = await api.auth.sendOTP(email);
                if (response.success) {
                    setSuccessMessage("Verification code sent to your email!");
                    setView('signup-otp');
                }
            } catch (err: any) {
                setError(err.message || "Failed to send verification code. Email might be invalid.");
            } finally {
                setIsLoading(false);
            }
        }

        // --- SIGNUP FLOW: STEP 2 (Verify & Create) ---
        else if (view === 'signup-otp') {
            if (otp.length !== 6) {
                setError("Please enter a valid 6-digit code");
                return;
            }
            setIsLoading(true);
            try {
                const response = await api.auth.signup({ email, password, code: otp });
                if (response.success && response.data) {
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('auth_token', response.data.token);
                    }
                    await refreshUser();
                    router.push("/onboarding/welcome");
                }
            } catch (err: any) {
                setError(err.message || "Failed to verify code.");
            } finally {
                setIsLoading(false);
            }
        }

        // --- FORGOT PASSWORD: SEND OTP ---
        else if (view === 'forgot-email') {
            if (!isValidEmail(email)) {
                setError("Please enter a valid email address");
                return;
            }
            setIsLoading(true);
            try {
                const response = await api.auth.sendOTP(email);
                if (response.success) {
                    setSuccessMessage("Code sent! Please check your email.");
                    setView('forgot-reset');
                }
            } catch (err: any) {
                setError(err.message || "Failed to send code.");
            } finally {
                setIsLoading(false);
            }
        }

        // --- FORGOT PASSWORD: RESET ---
        else if (view === 'forgot-reset') {
            if (otp.length !== 6) {
                setError("Please enter a valid 6-digit code");
                return;
            }
            if (password.length < 8) {
                setError("New password must be at least 8 characters");
                return;
            }
            if (password !== confirmPassword) {
                setError("Passwords do not match");
                return;
            }

            setIsLoading(true);
            try {
                const response = await api.auth.resetPassword({ email, code: otp, newPassword: password });
                if (response.success) {
                    setSuccessMessage("Password reset successfully! Redirecting...");
                    setTimeout(() => {
                        handleSwitchView('login');
                        setSuccessMessage("Password updated. Please log in.");
                        setPassword("");
                    }, 2000);
                }
            } catch (err: any) {
                setError(err.message || "Failed to reset password. Code might be invalid.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    // Helper to render content based on view
    const renderContent = () => {
        switch (view) {
            case 'login':
                return {
                    title: "Welcome back 👋!",
                    subtitle: "Enter your credentials to access your account",
                    buttonText: "Log In"
                };
            case 'signup':
                return {
                    title: "Create your account",
                    subtitle: "Start automating your Instagram flows today",
                    buttonText: "Verify Email"
                };
            case 'signup-otp':
                return {
                    title: "Verify Email",
                    subtitle: `Enter the code sent to ${email}`,
                    buttonText: "Create Account"
                };
            case 'forgot-email':
                return {
                    title: "Reset Password 🔒",
                    subtitle: "Enter your email to receive a recovery code",
                    buttonText: "Send Code"
                };
            case 'forgot-reset':
                return {
                    title: "Set New Password 🔑",
                    subtitle: `Enter the code sent to ${email}`,
                    buttonText: "Reset Password"
                };
        }
    };

    const content = renderContent();

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat transition-all duration-500"
            style={{ backgroundImage: 'url(/images/auth-bg.png)' }}
        >
            <Card className="w-full max-w-[400px] border border-white/20 shadow-xl shadow-purple-500/10 p-8 sm:p-10 rounded-2xl bg-white/90 backdrop-blur-md transition-all duration-300 relative overflow-hidden">

                {/* Back Button */}
                {(view === 'forgot-email' || view === 'forgot-reset' || view === 'signup-otp') && (
                    <button
                        type="button"
                        onClick={() => {
                            if (view === 'signup-otp') handleSwitchView('signup');
                            else handleSwitchView('login');
                        }}
                        className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                )}

                <div className="text-center mb-8">
                    <div className="flex justify-center mb-2">
                        <img src="/images/logo-icon.png" alt="Monday Flows" className="h-24 w-auto object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                        {content.title}
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {content.subtitle}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        {/* Email Field - Always visible except for specific transitions where it might be locked/hidden if desired, currently always shown for context */}
                        <Input
                            type="email"
                            label="Email Address"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            error={error && error.toLowerCase().includes("email") ? error : ""}
                            disabled={isLoading || view === 'forgot-reset' || view === 'signup-otp'}
                            className="bg-white/80"
                        />

                        {/* OTP Field */}
                        {(view === 'forgot-reset' || view === 'signup-otp') && (
                            <Input
                                type="text"
                                label="Verification Code"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                maxLength={6}
                                disabled={isLoading}
                                className="bg-white/80 text-center tracking-widest font-mono"
                            />
                        )}

                        {/* Password Field */}
                        {(view === 'login' || view === 'signup' || view === 'forgot-reset') && (
                            <div className="space-y-1">
                                <Input
                                    type="password"
                                    label={view === 'forgot-reset' ? "New Password" : "Password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    // Don't show generic error on field unless specific
                                    disabled={isLoading}
                                    className="bg-white/80"
                                />
                                {/* Password Strength Meter (Only Signup) */}
                                {view === 'signup' && password.length > 0 && (
                                    <div className="flex gap-1 h-1 mt-1">
                                        {[1, 2, 3, 4].map((step) => (
                                            <div
                                                key={step}
                                                className={`h-full flex-1 rounded-full transition-all duration-300 ${passwordStrength >= step
                                                    ? (passwordStrength < 2 ? 'bg-red-500' : passwordStrength < 3 ? 'bg-yellow-500' : 'bg-green-500')
                                                    : 'bg-gray-200'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                )}
                                {view === 'signup' && password.length > 0 && (
                                    <p className="text-xs text-right text-gray-500">
                                        {passwordStrength < 2 ? 'Weak' : passwordStrength < 3 ? 'Medium' : 'Strong'}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Confirm Password Field */}
                        {(view === 'signup' || view === 'forgot-reset') && (
                            <Input
                                type="password"
                                label="Confirm Password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                error={error && error.toLowerCase().includes("match") ? error : ""}
                                disabled={isLoading}
                                className="bg-white/80"
                            />
                        )}

                        {/* Forgot Password Link */}
                        {view === 'login' && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => handleSwitchView('forgot-email')}
                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Generic Error/Success Messages */}
                    {error && !error.includes("match") && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm text-center animate-in fade-in slide-in-from-top-1">
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-green-600 text-sm text-center animate-in fade-in slide-in-from-top-1">
                            {successMessage}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-lg font-medium transition-all shadow-lg shadow-indigo-100"
                        loading={isLoading}
                        disabled={isLoading}
                    >
                        {content.buttonText}
                    </Button>
                </form>

                {/* Footer Switcher */}
                {(view === 'login' || view === 'signup') && (
                    <div className="mt-8 text-center space-y-4">
                        <p className="text-sm text-gray-500">
                            {view === 'login' ? "Don't have an account?" : "Already have an account?"}
                            <button
                                type="button"
                                onClick={() => handleSwitchView(view === 'login' ? 'signup' : 'login')}
                                className="ml-2 font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                                {view === 'login' ? "Sign up" : "Log in"}
                            </button>
                        </p>
                    </div>
                )}
            </Card>
        </div>
    );
}
