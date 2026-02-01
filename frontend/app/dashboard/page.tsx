"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useDashboardData } from "@/lib/hooks/useAutomations";
import { formatNumber } from "@/lib/utils";
import {
    CheckCircleIcon,
    ChartBarIcon,
    SparklesIcon,
} from "@heroicons/react/24/outline";

function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    onClick,
}: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: any;
    onClick?: () => void;
}) {
    return (
        <Card
            hover={!!onClick}
            className={onClick ? "cursor-pointer" : ""}
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">{title}</h3>
                </div>
            </div>
            <div className="mb-1">
                <p className="text-3xl font-bold text-gray-900">
                    {typeof value === "number" ? formatNumber(value) : value}
                </p>
            </div>
            <p className="text-sm text-gray-500">{subtitle}</p>
        </Card>
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
        success: "bg-green-500",
        warning: "bg-amber-500",
        error: "bg-red-500",
    };

    return (
        <div className="flex items-start gap-3 p-4 hover:bg-gray-50 rounded-lg transition-colors">
            <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                    {avatar}
                </div>
                <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColors[status]}`}
                />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                    <span className="font-medium text-purple-600">@{username}</span>
                    {" → "}
                    <span className="font-medium">{automation}</span>
                </p>
                <p className="text-sm text-gray-600 mt-0.5">{description}</p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">{time}</span>
        </div>
    );
}

function getExecutionDescription(execution: any): string {
    const actions = [];
    if (execution.actions_executed?.public_reply) actions.push('Reply');
    if (execution.actions_executed?.dm) actions.push('DM');
    if (execution.actions_executed?.discount_code) actions.push('Code');
    return actions.length > 0 ? actions.join(' + ') : 'No actions';
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

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}


function LoadingSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="bg-white border border-gray-200 rounded-lg p-6 h-32"
                    />
                ))}
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6 h-64" />
        </div>
    );
}

export default function DashboardPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { stats, automations, executions, isLoading } = useDashboardData();


    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <Container className="py-8">
                    <LoadingSkeleton />
                </Container>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <Container className="py-8">
                {/* Page Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Welcome back, {user?.instagram_handle || user?.email || user?.id}
                        </h1>
                        <p className="text-gray-600">
                            Here's what's happening with automations today
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Today · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard
                        title="Active Automations"
                        value={stats.activeAutomations}
                        subtitle="All running smoothly"
                        icon={CheckCircleIcon}
                        onClick={() => router.push("/automations")}
                    />
                    <StatCard
                        title="Runs Today"
                        value={stats.runsToday}
                        subtitle={
                            stats.runsYesterday === 0 && stats.runsToday === 0
                                ? "No runs yet"
                                : stats.changeDirection === 'same'
                                    ? "Same as yesterday"
                                    : `from yesterday ${stats.changeDirection === 'up' ? '↑' : '↓'} ${Math.abs(stats.percentageChange)}%`
                        }
                        icon={ChartBarIcon}
                        onClick={() => router.push("/activity")}
                    />
                    <StatCard
                        title="Success Rate"
                        value={`${stats.successRate}%`}
                        subtitle="Excellent performance"
                        icon={SparklesIcon}
                        onClick={() => router.push("/activity")}
                    />
                </div>

                {/* Quick Actions */}
                <Card className="mb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-1">
                                Quick Actions
                            </h2>
                            <p className="text-sm text-gray-600">
                                Create new automations or manage existing ones
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => router.push("/automations")}
                            >
                                View Automations
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => router.push("/automations/new")}
                            >
                                Create Automation
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Recent Activity */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Recent Activity
                    </h2>

                    <Card padding="none" className="divide-y divide-gray-100">
                        {executions && executions.length > 0 ? (
                            executions.slice(0, 5).map((execution: any) => (
                                <ActivityItem
                                    key={execution.id}
                                    username={execution.commenter_username || 'unknown'}
                                    automation={execution.automation_name || execution.automation_id}
                                    description={getExecutionDescription(execution)}
                                    time={getRelativeTime(execution.processed_at)}
                                    status={getStatusType(execution.execution_status)}
                                    avatar={getInitials(execution.commenter_username)}
                                />
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                No recent activity
                            </div>
                        )}
                    </Card>
                </div>
            </Container>
        </div>
    );
}
