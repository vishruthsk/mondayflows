"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useDashboardData } from "@/lib/hooks/useAutomations";
import { formatNumber } from "@/lib/utils";
import {
    CheckCircleIcon,
    ChartBarIcon,
    SparklesIcon,
    ArrowTrendingUpIcon,
    PlusIcon,
    BoltIcon
} from "@heroicons/react/24/outline";

function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    onClick,
    trend,
    iconColorClass,
    iconBgClass
}: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: any;
    onClick?: () => void;
    trend?: "up" | "down" | "neutral";
    iconColorClass?: string;
    iconBgClass?: string;
}) {
    return (
        <div
            onClick={onClick}
            className={`
                bg-white p-6 rounded-xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] 
                hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300
                ${onClick ? "cursor-pointer" : ""}
            `}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${iconBgClass || 'bg-gray-50'}`}>
                    <Icon className={`w-6 h-6 ${iconColorClass || 'text-gray-700'}`} />
                </div>
                {trend === "up" && <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span>}
            </div>
            <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
                <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
                <p className="text-xs text-gray-400 mt-2 uppercase tracking-wide font-medium">{subtitle}</p>
            </div>
        </div>
    );
}

function ActivityItem({
    username,
    automation,
    description,
    time,
    status,
    avatar,
}: {
    username: string;
    automation: string;
    description: string;
    time: string;
    status: "success" | "warning" | "error";
    avatar: string;
}) {
    const statusColors = {
        success: "bg-emerald-500",
        warning: "bg-amber-500",
        error: "bg-rose-500",
    };

    return (
        <div className="group flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl transition-all duration-200 border border-transparent hover:border-gray-100">
            <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    {avatar}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColors[status]}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold text-gray-900">
                        @{username}
                    </p>
                    <span className="text-xs text-gray-400">{time}</span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                    Triggered <span className="font-medium text-indigo-600">{automation}</span> • {description}
                </p>
            </div>
        </div>
    );
}

function getExecutionDescription(execution: any): string {
    const actions = [];
    if (execution.actions_executed?.public_reply) actions.push('Replied');
    if (execution.actions_executed?.dm) actions.push('Sent DM');
    if (execution.actions_executed?.discount_code) actions.push('Sent Code');
    return actions.length > 0 ? actions.join(' & ') : 'No actions taken';
}

function getStatusType(status: string): 'success' | 'warning' | 'error' {
    if (status === 'success') return 'success';
    if (status === 'partial' || status === 'skipped') return 'warning';
    return 'error';
}

function getInitials(username?: string): string {
    if (!username) return '?';
    return username.substring(0, 2).toUpperCase();
}

function getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function LoadingSkeleton() {
    return (
        <div className="animate-pulse space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-100 rounded-xl h-40" />
                ))}
            </div>
            <div className="bg-gray-100 rounded-xl h-96" />
        </div>
    );
}

const router = useRouter();
const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
const { stats, automations, executions, isLoading: isDataLoading } = useDashboardData();

useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
        router.push('/auth/login');
    }
}, [isAuthLoading, isAuthenticated, router]);

if (isAuthLoading || isDataLoading) {
    return (
        <AppShell>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <LoadingSkeleton />
            </div>
        </AppShell>
    );
}

const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
};

return (
    <AppShell
        title={`${getTimeGreeting()}, ${user?.instagram_handle || 'Creator!'}`}
        action={
            <Button
                onClick={() => router.push("/automations/new")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all hover:scale-105"
            >
                <PlusIcon className="w-5 h-5" />
                New Automation
            </Button>
        }
    >
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <StatCard
                title="Active Automations"
                value={formatNumber(stats.activeAutomations)}
                subtitle="RUNNING NOW"
                icon={BoltIcon}
                onClick={() => router.push("/automations")}
                trend="neutral"
                iconColorClass="text-indigo-600"
                iconBgClass="bg-indigo-50"
            />
            <StatCard
                title="Total Runs Today"
                value={formatNumber(stats.runsToday)}
                subtitle={stats.changeDirection === 'up' ? 'INCREASE TODAY' : 'CONSISTENT ACTIVITY'}
                icon={ChartBarIcon}
                onClick={() => router.push("/activity")}
                trend={stats.changeDirection === 'up' ? "up" : "neutral"}
                iconColorClass="text-emerald-600"
                iconBgClass="bg-emerald-50"
            />
            <StatCard
                title="Success Rate"
                value={`${stats.successRate}%`}
                subtitle="AUTOMATION HEALTH"
                icon={CheckCircleIcon}
                onClick={() => router.push("/activity")}
                iconColorClass="text-blue-600"
                iconBgClass="bg-blue-50"
            />
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activity Feed */}
            <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">Live Activity</h2>
                    <Button
                        variant="ghost"
                        className="text-sm text-gray-500 hover:text-gray-900"
                        onClick={() => router.push('/activity')}
                    >
                        View All
                    </Button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
                    {executions && executions.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                            {executions.slice(0, 6).map((execution: any) => (
                                <ActivityItem
                                    key={execution.id}
                                    username={execution.commenter_username || 'Unknown User'}
                                    automation={execution.automation_name || 'Automation'}
                                    description={getExecutionDescription(execution)}
                                    time={getRelativeTime(execution.processed_at)}
                                    status={getStatusType(execution.execution_status)}
                                    avatar={getInitials(execution.commenter_username)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-24 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <SparklesIcon className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-gray-900 font-medium mb-1">No activity yet</h3>
                            <p className="text-gray-500 text-sm">Once your automations run, they'll show up here.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Automation Quick List (Right Column) */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">Your Automations</h2>
                    <Button
                        variant="ghost"
                        className="text-sm text-gray-500 hover:text-gray-900"
                        onClick={() => router.push('/automations')}
                    >
                        Manage
                    </Button>
                </div>

                <div className="space-y-4">
                    {automations && automations.slice(0, 4).map((automation: any) => (
                        <div
                            key={automation.id}
                            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
                            onClick={() => router.push(`/automations/new?edit=${automation.id}`)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${automation.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {automation.enabled ? 'Active' : 'Paused'}
                                </div>
                                <ArrowTrendingUpIcon className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-1 truncate">{automation.name}</h3>
                            <p className="text-xs text-gray-500 truncate">
                                Trigger: <span className="font-mono bg-gray-50 px-1 rounded">{automation.trigger_value}</span>
                            </p>
                        </div>
                    ))}

                    <div
                        onClick={() => router.push('/automations/new')}
                        className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group h-24"
                    >
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mb-1 group-hover:bg-indigo-100 transition-colors">
                            <PlusIcon className="w-4 h-4 text-gray-500 group-hover:text-indigo-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-600 group-hover:text-indigo-700">Create New</span>
                    </div>
                </div>
            </div>
        </div>
    </AppShell>
);
}
