"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRecentExecutions } from "@/lib/hooks/useAutomations";
import { getRelativeTime } from "@/lib/utils";
import type { ExecutionLog } from "@/types/api";
import {
    CheckCircleIcon,
    ExclamationCircleIcon,
    ClockIcon
} from "@heroicons/react/24/solid";

function StatusBadge({ status }: { status: string }) {
    if (status === 'success') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                Success
            </span>
        );
    }
    if (status === 'failed' || status === 'error') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                <ExclamationCircleIcon className="w-3.5 h-3.5" />
                Failed
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <ClockIcon className="w-3.5 h-3.5" />
            {status}
        </span>
    );
}

function ActivityRow({ execution }: { execution: ExecutionLog }) {
    const executedActions = [];
    if (execution.actions_executed?.public_reply) executedActions.push("Reply");
    if (execution.actions_executed?.dm) executedActions.push("DM");
    if (execution.actions_executed?.discount_code) executedActions.push("Code");

    return (
        <tr className="hover:bg-gray-50/50 transition-colors group border-b border-gray-100 last:border-0">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-xs ring-2 ring-white">
                        {execution.commenter_username ? execution.commenter_username.substring(0, 2).toUpperCase() : "?"}
                    </div>
                    <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">@{execution.commenter_username || "Unknown"}</div>
                        <div className="text-xs text-gray-500">{getRelativeTime(execution.processed_at)}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{execution.automation_name || execution.automation_id}</div>
                <div className="text-xs text-gray-400 font-mono mt-0.5">ID: {execution.id.substring(0, 8)}...</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={execution.execution_status} />
                {execution.error_message && (
                    <div className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={execution.error_message}>
                        {execution.error_message}
                    </div>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {executedActions.length > 0 ? (
                    <div className="flex gap-1">
                        {executedActions.map((action, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {action}
                            </span>
                        ))}
                    </div>
                ) : (
                    <span className="text-gray-400 italic">No actions</span>
                )}
            </td>
        </tr>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 h-20" />
            ))}
        </div>
    );
}

export default function ActivityPage() {
    const router = useRouter();
    const { data, isLoading, isError } = useRecentExecutions({ limit: 50 });

    const executions = data?.executions || [];

    if (isLoading) {
        return (
            <AppShell>
                <LoadingSkeleton />
            </AppShell>
        );
    }

    if (isError) {
        return (
            <AppShell>
                <div className="text-center py-12">
                    <p className="text-red-500 mb-2">Could not load activity log</p>
                    <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell title="Activity Log">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {executions.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ClockIcon className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No activity recorded</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-6">Executions will appear here once your automations are triggered.</p>
                        <Button onClick={() => router.push("/automations/new")} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                            Create Automation
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Automation</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {executions.map((execution: ExecutionLog) => (
                                    <ActivityRow key={execution.id} execution={execution} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
