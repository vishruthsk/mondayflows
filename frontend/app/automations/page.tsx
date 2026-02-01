"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { useAutomations } from "@/lib/hooks/useAutomations";
import { api } from "@/lib/api";
import type { Automation } from "@/types/api";
import {
    ChatBubbleLeftIcon,
    EnvelopeIcon,
    TicketIcon,
    PencilIcon,
    TrashIcon,
    PauseIcon,
    PlayIcon,
    PlusIcon,
    SparklesIcon
} from "@heroicons/react/24/outline";

function AutomationCard({ automation }: { automation: Automation }) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const toggleMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            if (enabled) {
                return api.automations.enable(automation.id);
            } else {
                return api.automations.disable(automation.id);
            }
        },
        onMutate: async (enabled: boolean) => {
            await queryClient.cancelQueries({ queryKey: ["automations"] });
            const previousAutomations = queryClient.getQueryData(["automations"]);
            queryClient.setQueryData(["automations"], (old: any) => {
                if (!old) return old;
                return old.map((a: Automation) =>
                    a.id === automation.id ? { ...a, enabled } : a
                );
            });
            return { previousAutomations };
        },
        onSuccess: (response, enabled) => {
            toast.success(`Automation ${enabled ? 'enabled' : 'disabled'}`);
            queryClient.invalidateQueries({ queryKey: ["automations"] });
        },
        onError: (error, enabled, context) => {
            toast.error(`Failed to ${enabled ? 'enable' : 'disable'} automation`);
            if (context?.previousAutomations) {
                queryClient.setQueryData(["automations"], context.previousAutomations);
            }
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            return api.automations.delete(automation.id);
        },
        onSuccess: () => {
            toast.success("Automation deleted");
            queryClient.invalidateQueries({ queryKey: ["automations"] });
        },
        onError: (error) => {
            toast.error("Failed to delete automation");
        }
    });

    const handleDelete = () => {
        if (confirm("Are you sure you want to delete this automation?")) {
            deleteMutation.mutate();
        }
    };

    return (
        <div className={`
            group bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all duration-200
            ${!automation.enabled ? 'opacity-75 hover:opacity-100 bg-gray-50/50' : ''}
        `}>
            {/* Header: Status + Actions */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${automation.enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                        {automation.enabled ? <PlayIcon className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 leading-tight">{automation.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${automation.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {automation.enabled ? 'Active' : 'Paused'}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500 font-medium">Trigger: {automation.trigger_value}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => router.push(`/automations/new?edit=${automation.id}`)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-gray-200 mx-1"></div>
                    <button
                        onClick={() => toggleMutation.mutate(!automation.enabled)}
                        className={`p-2 rounded-lg transition-colors ${automation.enabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-green-600 hover:bg-gray-100'}`}
                        title={automation.enabled ? 'Pause' : 'Resume'}
                    >
                        {automation.enabled ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Content / Conditions */}
            <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                    {automation.actions.public_reply?.enabled && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-xs font-medium text-gray-600">
                            <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
                            Reply
                        </div>
                    )}
                    {automation.actions.dm?.enabled && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-xs font-medium text-gray-600">
                            <EnvelopeIcon className="w-3.5 h-3.5" />
                            DM
                        </div>
                    )}
                    {automation.actions.discount_code?.enabled && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-xs font-medium text-gray-600">
                            <TicketIcon className="w-3.5 h-3.5" />
                            Code
                        </div>
                    )}
                </div>

                {(automation.first_n_commenters || automation.follow_gate) && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-3 border-t border-gray-100 border-dashed">
                        {automation.first_n_commenters && (
                            <span>Limit: First {automation.first_n_commenters} comments</span>
                        )}
                        {automation.first_n_commenters && automation.follow_gate && <span>•</span>}
                        {automation.follow_gate && (
                            <span>Followers only</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-100 rounded-xl h-48" />
            ))}
        </div>
    );
}

export default function AutomationsPage() {
    const router = useRouter();
    const { data: automations, isLoading, isError } = useAutomations();

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
                <div className="text-center py-20">
                    <h3 className="text-lg font-medium text-red-600">Failed to load automations</h3>
                    <Button onClick={() => window.location.reload()} variant="primary" className="mt-4">
                        Retry
                    </Button>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell
            title="Automations"
            action={
                <Button
                    onClick={() => router.push("/automations/new")}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    New Automation
                </Button>
            }
        >
            {!automations || automations.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <SparklesIcon className="w-10 h-10 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Create your first automation
                    </h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        Set up triggers to automatically reply to comments, send DMs, or distribute discount codes.
                    </p>
                    <Button onClick={() => router.push("/automations/new")}>
                        Get Started
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {automations.map((automation: Automation) => (
                        <AutomationCard key={automation.id} automation={automation} />
                    ))}

                    {/* Add New Card */}
                    <div
                        onClick={() => router.push('/automations/new')}
                        className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group h-full min-h-[200px]"
                    >
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                            <PlusIcon className="w-6 h-6 text-gray-400 group-hover:text-indigo-600" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-indigo-700">New Automation</h3>
                        <p className="text-sm text-gray-500 px-4">Create a new workflow</p>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
