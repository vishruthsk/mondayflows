"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/contexts/AuthContext";
import { UserCircleIcon, EnvelopeIcon, KeyIcon } from "@heroicons/react/24/outline";

export default function SettingsPage() {
    const router = useRouter();
    const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthLoading && !isAuthenticated) {
            router.push('/auth/login');
        }
    }, [isAuthLoading, isAuthenticated, router]);

    if (isAuthLoading) {
        // Minimal loading state for settings
        return (
            <AppShell title="Account Settings">
                <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
                    <div className="h-64 bg-gray-100 rounded-xl"></div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell title="Account Settings">
            <div className="max-w-3xl mx-auto space-y-6">
                <Card className="p-0 overflow-hidden border-gray-100 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
                        <span className="text-xs font-medium px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                            Connected
                        </span>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-200">
                                {user?.instagram_handle ? user.instagram_handle.substring(0, 2).toUpperCase() : (user?.email?.substring(0, 2).toUpperCase() || 'U')}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    @{user?.instagram_handle || 'No Instagram Connected'}
                                </h3>
                                <p className="text-gray-500">
                                    {user?.email}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    Instagram Handle
                                </label>
                                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100 text-gray-700">
                                    <UserCircleIcon className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium">@{user?.instagram_handle || 'Not connected'}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    Email Address
                                </label>
                                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100 text-gray-700">
                                    <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium">{user?.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="p-0 overflow-hidden border-gray-100 shadow-sm opacity-60">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-lg font-semibold text-gray-900">Subscription & Billing</h2>
                    </div>
                    <div className="p-8 text-center text-gray-500">
                        <p>Billing capabilities coming soon.</p>
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}
