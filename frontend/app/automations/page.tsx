"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Header } from "@/components/layout/Header";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAutomations } from "@/lib/hooks/useAutomations";
import { api } from "@/lib/api";
import type { Automation } from "@/types/api";
import {
    ChatBubbleLeftIcon,
    EnvelopeIcon,
    TicketIcon,
} from "@heroicons/react/24/outline";

function Toggle({
    enabled,
    onChange,
    disabled,
}: {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-black" : "bg-gray-300"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"
                    }`}
            />
        </button>
    );
}

function AutomationCard({ automation }: { automation: Automation }) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const toggleMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            console.log(`[Toggle] ${enabled ? 'Enabling' : 'Disabling'} automation ${automation.id}`);
            if (enabled) {
                return api.automations.enable(automation.id);
            } else {
                return api.automations.disable(automation.id);
            }
        },
        onMutate: async (enabled: boolean) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ["automations"] });

            // Snapshot the previous value
            const previousAutomations = queryClient.getQueryData(["automations"]);

            // Optimistically update to the new value
            queryClient.setQueryData(["automations"], (old: any) => {
                if (!old) return old;
                return old.map((a: Automation) =>
                    a.id === automation.id ? { ...a, enabled } : a
                );
            });

            // Return a context object with the snapshotted value
            return { previousAutomations };
        },
        onSuccess: (response, enabled) => {
            console.log(`[Toggle] Success:`, response);
            toast.success(`Automation ${enabled ? 'enabled' : 'disabled'} successfully`);
            queryClient.invalidateQueries({ queryKey: ["automations"] });
        },
        onError: (error, enabled, context) => {
            console.error(`[Toggle] Error:`, error);
            toast.error(`Failed to ${enabled ? 'enable' : 'disable'} automation`);

            // Rollback to the previous value
            if (context?.previousAutomations) {
                queryClient.setQueryData(["automations"], context.previousAutomations);
            }
        },
    });

    const handleToggle = (enabled: boolean) => {
        toggleMutation.mutate(enabled);
    };

    const getActionIcons = () => {
        const icons = [];
        // Only show if enabled AND has content configured
        if (automation.actions.public_reply?.enabled && automation.actions.public_reply?.text) {
            icons.push(
                <div key="reply" className="flex items-center gap-1 text-gray-600">
                    <ChatBubbleLeftIcon className="w-4 h-4" />
                    <span className="text-xs">Reply</span>
                </div>
            );
        }
        if (automation.actions.dm?.enabled && automation.actions.dm?.text) {
            icons.push(
                <div key="dm" className="flex items-center gap-1 text-gray-600">
                    <EnvelopeIcon className="w-4 h-4" />
                    <span className="text-xs">DM</span>
                </div>
            );
        }
        if (automation.actions.discount_code?.enabled && automation.actions.discount_code?.pool_id) {
            icons.push(
                <div key="code" className="flex items-center gap-1 text-gray-600">
                    <TicketIcon className="w-4 h-4" />
                    <span className="text-xs">Code</span>
                </div>
            );
        }
        return icons;
    };

    return (
        <Card
            hover={false}
            className=""
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {automation.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                        Trigger: <span className="font-medium">{automation.trigger_value}</span>
                        {automation.scope === "post" && " (Post-specific)"}
                    </p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                    <Toggle
                        enabled={automation.enabled}
                        onChange={handleToggle}
                        disabled={toggleMutation.isPending}
                    />
                </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
                {getActionIcons()}
            </div>

            {(automation.first_n_commenters || automation.follow_gate) && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    {automation.first_n_commenters && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            First {automation.first_n_commenters} commenters
                        </span>
                    )}
                    {automation.follow_gate && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            Followers only
                        </span>
                    )}
                </div>
            )}
        </Card>
    );
}

function LoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 h-40" />
            ))}
        </div>
    );
}

export default function AutomationsPage() {
    const router = useRouter();
    const { data: automations, isLoading, isError } = useAutomations();

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
                        <p className="text-red-600 mb-4">Failed to load automations</p>
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
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Automations
                        </h1>
                        <p className="text-gray-600">
                            Manage your Instagram automation workflows
                        </p>
                    </div>
                    <Button onClick={() => router.push("/automations/new")}>
                        Create Automation
                    </Button>
                </div>

                {/* Automations Grid */}
                {!automations || automations.length === 0 ? (
                    <Card className="p-12 text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No automations yet
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Create your first automation to start engaging with your audience automatically
                        </p>
                        <Button onClick={() => router.push("/automations/new")}>
                            Create Your First Automation
                        </Button>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {automations.map((automation: Automation) => (
                            <AutomationCard key={automation.id} automation={automation} />
                        ))}
                    </div>
                )}
            </Container>
        </div>
    );
}
