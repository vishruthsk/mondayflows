"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useRecentExecutions } from "@/lib/hooks/useAutomations";
import { getRelativeTime } from "@/lib/utils";
import type { ExecutionLog } from "@/types/api";

function ExecutionRow({ execution }: { execution: ExecutionLog }) {
    return (
        <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
            <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                <div>
                    <p className="text-sm font-medium text-gray-900">
                        @{execution.commenter_username || "unknown"}
                    </p>
                    <p className="text-xs text-gray-500">
                        {getRelativeTime(execution.processed_at)}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">{execution.automation_name || execution.automation_id}</p>
                </div>
                <div>
                    <Badge status={execution.execution_status} />
                </div>
                <div>
                    <p className="text-sm text-gray-600">
                        {execution.actions_executed?.public_reply && "Reply"}
                        {execution.actions_executed?.dm && " + DM"}
                        {execution.actions_executed?.discount_code && " + Code"}
                    </p>
                </div>
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 h-20" />
            ))}
        </div>
    );
}

export default function ActivityPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data, isLoading, isError } = useRecentExecutions({ limit: 50 });

    const executions = data?.executions || [];

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

    if (isError) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <Container className="py-8">
                    <Card className="p-8 text-center">
                        <p className="text-red-600 mb-4">Failed to load activity</p>
                        <Button onClick={() => window.location.reload()}>Retry</Button>
                    </Card>
                </Container>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <Container className="py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Activity History
                    </h1>
                    <p className="text-gray-600">
                        View all automation execution logs
                    </p>
                </div>

                {/* Executions List */}
                {executions.length === 0 ? (
                    <Card className="p-12 text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No activity yet
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Execution logs will appear here when your automations run
                        </p>
                        <Button onClick={() => router.push("/automations/new")}>
                            Create Automation
                        </Button>
                    </Card>
                ) : (
                    <Card padding="none" className="divide-y divide-gray-100">
                        {/* Header */}
                        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 text-xs font-medium text-gray-600 uppercase">
                            <div>User</div>
                            <div>Automation</div>
                            <div>Status</div>
                            <div>Actions</div>
                        </div>

                        {/* Rows */}
                        {executions.map((execution: ExecutionLog) => (
                            <ExecutionRow key={execution.id} execution={execution} />
                        ))}
                    </Card>
                )}
            </Container>
        </div>
    );
}
