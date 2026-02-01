"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api, ApiError } from "@/lib/api";
import { extractPostIdFromUrl } from "@/lib/instagram-utils";
import type { CreateAutomationInput, AutomationActions } from "@/types/api";

type Step = 1 | 2 | 3 | 4;

interface FormData {
    name: string;
    trigger_type: "keyword" | "intent";
    trigger_value: string;
    scope: "global" | "post";
    post_id?: string;
    actions: AutomationActions;
    first_n_commenters?: number | null;
    follow_gate: boolean;
}

function Toggle({
    enabled,
    onChange,
    label,
}: {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    label: string;
}) {
    return (
        <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
            <button
                type="button"
                onClick={() => onChange(!enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-indigo-600" : "bg-gray-200"
                    }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                />
            </button>
        </label>
    );
}

function StepIndicator({ currentStep }: { currentStep: Step }) {
    const steps = [
        { number: 1, name: "Trigger" },
        { number: 2, name: "Actions" },
        { number: 3, name: "Limits" },
        { number: 4, name: "Review" },
    ];

    return (
        <div className="flex items-center justify-center mb-12">
            {steps.map((step, index) => {
                const isCompleted = currentStep > step.number;
                const isCurrent = currentStep === step.number;

                return (
                    <div key={step.number} className="flex items-center">
                        <div className="relative flex flex-col items-center">
                            <div
                                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${isCompleted || isCurrent
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                        : "bg-gray-100 text-gray-400 border border-gray-200"
                                    }`}
                            >
                                {isCompleted ? "✓" : step.number}
                            </div>
                            <span
                                className={`absolute -bottom-6 text-xs font-medium whitespace-nowrap transition-colors ${isCurrent ? "text-indigo-600" : "text-gray-400"
                                    }`}
                            >
                                {step.name}
                            </span>
                        </div>
                        {index < steps.length - 1 && (
                            <div className={`w-16 h-0.5 mx-2 transition-colors duration-300 ${isCompleted ? "bg-indigo-600" : "bg-gray-200"
                                }`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function Step1Trigger({
    formData,
    setFormData,
    onNext,
}: {
    formData: FormData;
    setFormData: (data: FormData) => void;
    onNext: () => void;
}) {
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name) newErrors.name = "Name is required";
        if (!formData.trigger_value) newErrors.trigger_value = "Keyword/Intent is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) onNext();
    };

    return (
        <Card className="max-w-2xl mx-auto shadow-lg border-gray-100">
            <div className="p-2">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-600 rounded-lg w-8 h-8 flex items-center justify-center text-sm">1</span>
                    Configure Trigger
                </h2>

                <div className="space-y-6">
                    <Input
                        label="Automation Name"
                        placeholder="e.g., Summer Giveaway Flow"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        error={errors.name}
                        className="text-lg font-medium"
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Trigger Type
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({ ...formData, trigger_type: "keyword" })
                                }
                                className={`p-4 border rounded-xl text-left transition-all ${formData.trigger_type === "keyword"
                                    ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 shadow-sm"
                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                    }`}
                            >
                                <p className={`font-medium ${formData.trigger_type === "keyword" ? "text-indigo-900" : "text-gray-900"}`}>Keyword</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Trigger on specific keywords in comments
                                </p>
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setFormData({ ...formData, trigger_type: "intent" })
                                }
                                className={`p-4 border rounded-xl text-left transition-all ${formData.trigger_type === "intent"
                                    ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 shadow-sm"
                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                    }`}
                            >
                                <p className={`font-medium ${formData.trigger_type === "intent" ? "text-indigo-900" : "text-gray-900"}`}>Intent (AI)</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Use AI to detect user intent (e.g. "Buy")
                                </p>
                            </button>
                        </div>
                    </div>

                    <Input
                        label={
                            formData.trigger_type === "keyword"
                                ? "Keyword to Match"
                                : "Describe the Intent"
                        }
                        placeholder={
                            formData.trigger_type === "keyword"
                                ? "e.g., send, code, discount"
                                : "e.g., User is asking for a discount code"
                        }
                        value={formData.trigger_value}
                        onChange={(e) =>
                            setFormData({ ...formData, trigger_value: e.target.value })
                        }
                        error={errors.trigger_value}
                        helperText={formData.trigger_type === "keyword" ? "Comma separated for multiple variations" : "Be descriptive for best AI results"}
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Scope
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, scope: "global" })}
                                className={`p-3 border rounded-lg text-left transition-all ${formData.scope === "global"
                                    ? "border-indigo-600 bg-indigo-50"
                                    : "border-gray-200 hover:bg-gray-50"
                                    }`}
                            >
                                <p className="font-medium text-sm text-gray-900">Global</p>
                                <p className="text-xs text-gray-500">Run on all posts</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, scope: "post" })}
                                className={`p-3 border rounded-lg text-left transition-all ${formData.scope === "post"
                                    ? "border-indigo-600 bg-indigo-50"
                                    : "border-gray-200 hover:bg-gray-50"
                                    }`}
                            >
                                <p className="font-medium text-sm text-gray-900">Post-Specific</p>
                                <p className="text-xs text-gray-500">Only one specific post</p>
                            </button>
                        </div>
                    </div>

                    {formData.scope === "post" && (
                        <div className="animate-fade-in p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <Input
                                label="Post URL"
                                placeholder="https://www.instagram.com/p/ABC123xyz..."
                                value={formData.post_id || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, post_id: e.target.value })
                                }
                                helperText="Paste the full Instagram post URL"
                            />
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8">Next Step</Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

function Step2Actions({
    formData,
    setFormData,
    onNext,
    onBack,
}: {
    formData: FormData;
    setFormData: (data: FormData) => void;
    onNext: () => void;
    onBack: () => void;
}) {
    const actions = formData.actions;

    return (
        <Card className="max-w-2xl mx-auto shadow-lg border-gray-100">
            <div className="p-2">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-600 rounded-lg w-8 h-8 flex items-center justify-center text-sm">2</span>
                    Configure Actions
                </h2>

                <div className="space-y-6">
                    {/* Public Reply */}
                    <div className={`border rounded-xl p-5 transition-all ${actions.public_reply?.enabled ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200'}`}>
                        <Toggle
                            enabled={actions.public_reply?.enabled || false}
                            onChange={(enabled) =>
                                setFormData({
                                    ...formData,
                                    actions: {
                                        ...actions,
                                        public_reply: enabled
                                            ? { enabled: true, type: "static", text: actions.public_reply?.text || "" }
                                            : { enabled: false, type: "static" },
                                    },
                                })
                            }
                            label="Public Reply"
                        />

                        {actions.public_reply?.enabled && (
                            <div className="mt-4 animate-fade-in pl-1">
                                <Input
                                    label="Reply Text"
                                    placeholder="Enter your comment reply..."
                                    value={actions.public_reply.text || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            actions: {
                                                ...actions,
                                                public_reply: {
                                                    ...actions.public_reply!,
                                                    text: e.target.value,
                                                },
                                            },
                                        })
                                    }
                                    className="bg-white"
                                />
                            </div>
                        )}
                    </div>

                    {/* DM */}
                    <div className={`border rounded-xl p-5 transition-all ${actions.dm?.enabled ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200'}`}>
                        <Toggle
                            enabled={actions.dm?.enabled || false}
                            onChange={(enabled) => {
                                const newActions = { ...actions };
                                if (enabled) {
                                    newActions.dm = {
                                        enabled: true,
                                        text: actions.dm?.text || "",
                                        delay_seconds: 0
                                    };
                                } else {
                                    newActions.dm = undefined;
                                }
                                setFormData({ ...formData, actions: newActions });
                            }}
                            label="Send DM"
                        />

                        {actions.dm && (
                            <div className="mt-4 animate-fade-in pl-1">
                                <Input
                                    label="DM Message"
                                    placeholder="Hey {{username}}! Thanks for your comment."
                                    value={actions.dm.text}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            actions: {
                                                ...actions,
                                                dm: { ...actions.dm!, text: e.target.value },
                                            },
                                        })
                                    }
                                    helperText="Variables: {{username}}, {{code}}"
                                    required
                                    className="bg-white"
                                />
                            </div>
                        )}
                    </div>

                    {/* Discount Code */}
                    <div className={`border rounded-xl p-5 transition-all ${actions.discount_code?.enabled ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200'}`}>
                        <Toggle
                            enabled={actions.discount_code?.enabled || false}
                            onChange={(enabled) =>
                                setFormData({
                                    ...formData,
                                    actions: {
                                        ...actions,
                                        discount_code: enabled
                                            ? {
                                                enabled: true,
                                                pool_id: actions.discount_code?.pool_id || "",
                                                message_template: actions.discount_code?.message_template || "",
                                                fallback_message: actions.discount_code?.fallback_message,
                                            }
                                            : { enabled: false, pool_id: "", message_template: "" },
                                    },
                                })
                            }
                            label="Send Discount Code"
                        />

                        {actions.discount_code?.enabled && (
                            <div className="mt-4 space-y-4 animate-fade-in pl-1">
                                <div>
                                    <Input
                                        label="Pool ID"
                                        placeholder="Enter discount code pool ID"
                                        value={actions.discount_code.pool_id}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                actions: {
                                                    ...actions,
                                                    discount_code: {
                                                        ...actions.discount_code!,
                                                        pool_id: e.target.value,
                                                    },
                                                },
                                            })
                                        }
                                        className="bg-white"
                                    />
                                    <div className="mt-1 text-xs text-gray-500">
                                        Need a pool ID? <Link href="/discount-codes" target="_blank" className="text-indigo-600 hover:text-indigo-800 font-medium">Manage Pools</Link>
                                    </div>
                                </div>
                                <Input
                                    label="Message Template"
                                    placeholder="Here is your unique code: {{CODE}}"
                                    value={actions.discount_code.message_template}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            actions: {
                                                ...actions,
                                                discount_code: {
                                                    ...actions.discount_code!,
                                                    message_template: e.target.value,
                                                },
                                            },
                                        })
                                    }
                                    helperText="Use {{CODE}} placeholder"
                                    className="bg-white"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between pt-4">
                        <Button variant="ghost" onClick={onBack}>
                            Back
                        </Button>
                        <Button onClick={onNext} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8">Next Step</Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

function Step3Limits({
    formData,
    setFormData,
    onNext,
    onBack,
}: {
    formData: FormData;
    setFormData: (data: FormData) => void;
    onNext: () => void;
    onBack: () => void;
}) {
    return (
        <Card className="max-w-2xl mx-auto shadow-lg border-gray-100">
            <div className="p-2">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-600 rounded-lg w-8 h-8 flex items-center justify-center text-sm">3</span>
                    Set Limits
                </h2>

                <div className="space-y-6">
                    <div className="border border-gray-200 rounded-xl p-5">
                        <Toggle
                            enabled={!!formData.first_n_commenters}
                            onChange={(enabled) =>
                                setFormData({
                                    ...formData,
                                    first_n_commenters: enabled ? 10 : null,
                                })
                            }
                            label="Limit to First N Commenters"
                        />

                        {formData.first_n_commenters && (
                            <div className="mt-4 animate-fade-in pl-1">
                                <Input
                                    type="number"
                                    label="Max Commenters"
                                    placeholder="e.g., 50"
                                    value={formData.first_n_commenters.toString()}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            first_n_commenters: parseInt(e.target.value) || null,
                                        })
                                    }
                                    helperText="Automation stops after this many people."
                                />
                            </div>
                        )}
                    </div>

                    <div className="border border-gray-200 rounded-xl p-5">
                        <Toggle
                            enabled={formData.follow_gate}
                            onChange={(enabled) =>
                                setFormData({ ...formData, follow_gate: enabled })
                            }
                            label="Require User to Follow"
                        />
                        <p className="text-sm text-gray-500 mt-2 pl-1">
                            Only users who actully follow your account will trigger the automation. Great for growth!
                        </p>
                    </div>

                    <div className="flex justify-between pt-4">
                        <Button variant="ghost" onClick={onBack}>
                            Back
                        </Button>
                        <Button onClick={onNext} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8">Next Step</Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

function Step4Review({
    formData,
    onBack,
    onSubmit,
    isSubmitting,
}: {
    formData: FormData;
    onBack: () => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}) {
    return (
        <Card className="max-w-2xl mx-auto shadow-lg border-gray-100">
            <div className="p-2">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-600 rounded-lg w-8 h-8 flex items-center justify-center text-sm">4</span>
                    Review & Create
                </h2>

                <div className="space-y-6">
                    <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Automation Name</h3>
                            <p className="text-lg font-medium text-gray-900">{formData.name}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Trigger</h3>
                                <div className="text-gray-900 text-sm">
                                    <span className="font-medium capitalize">{formData.trigger_type}</span>
                                    <span className="mx-2 text-gray-400">|</span>
                                    <span className="font-mono bg-white px-2 py-0.5 rounded border">{formData.trigger_value}</span>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Scope</h3>
                                <p className="text-gray-900 text-sm">{formData.scope === "global" ? "All posts" : "Specific Post"}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Configured Actions</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {formData.actions.public_reply?.enabled ? (
                                <div className="flex items-center gap-3 text-sm text-gray-700 bg-green-50 p-3 rounded-lg border border-green-100">
                                    <span className="text-green-600 text-lg">✓</span> Public Reply
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 text-sm text-gray-400 p-3">
                                    <span className="text-gray-300 text-lg">•</span> Public Reply (Disabled)
                                </div>
                            )}

                            {formData.actions.dm?.enabled ? (
                                <div className="flex items-center gap-3 text-sm text-gray-700 bg-green-50 p-3 rounded-lg border border-green-100">
                                    <span className="text-green-600 text-lg">✓</span> Send DM
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 text-sm text-gray-400 p-3">
                                    <span className="text-gray-300 text-lg">•</span> DM (Disabled)
                                </div>
                            )}

                            {formData.actions.discount_code?.enabled ? (
                                <div className="flex items-center gap-3 text-sm text-gray-700 bg-green-50 p-3 rounded-lg border border-green-100">
                                    <span className="text-green-600 text-lg">✓</span> Discount Code
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 text-sm text-gray-400 p-3">
                                    <span className="text-gray-300 text-lg">•</span> Discount Code (Disabled)
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between pt-6 border-t border-gray-100">
                        <Button variant="ghost" onClick={onBack}>
                            Back
                        </Button>
                        <Button onClick={onSubmit} loading={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 shadow-lg shadow-indigo-200">
                            Create Automation
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

function AutomationForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit");
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [formData, setFormData] = useState<FormData>({
        name: "",
        trigger_type: "keyword",
        trigger_value: "",
        scope: "global",
        actions: {},
        follow_gate: false,
    });

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (editId) {
            const fetchAutomation = async (id: string) => {
                setIsLoading(true);
                try {
                    const response = await api.automations.get(id);
                    if (response.success && response.data) {
                        const automation = response.data;
                        setFormData({
                            name: automation.name,
                            trigger_type: automation.trigger_type,
                            trigger_value: automation.trigger_value,
                            scope: automation.scope,
                            post_id: automation.post_id,
                            actions: automation.actions,
                            first_n_commenters: automation.first_n_commenters,
                            follow_gate: automation.follow_gate,
                        });
                    }
                } catch (error) {
                    console.error("Failed to fetch automation:", error);
                    toast.error("Failed to load automation details");
                    router.push("/automations");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchAutomation(editId);
        }
    }, [editId, router]);

    const mutation = useMutation({
        mutationFn: async (data: CreateAutomationInput) => {
            if (editId) {
                return api.automations.update(editId, data);
            } else {
                return api.automations.create(data);
            }
        },
        onSuccess: (response) => {
            toast.success(`Automation ${editId ? 'updated' : 'created'} successfully!`);
            router.push('/automations');
        },
        onError: (error: Error) => {
            if (error instanceof ApiError && error.errors) {
                const errorMessages = error.errors.map(e => e.message).join(', ');
                toast.error(`Validation failed: ${errorMessages}`);
            } else {
                toast.error(error.message || `Failed to ${editId ? 'update' : 'create'} automation`);
            }
        },
    });

    const handleSubmit = () => {
        const postId = formData.post_id
            ? extractPostIdFromUrl(formData.post_id)
            : undefined;

        const input: CreateAutomationInput = {
            name: formData.name,
            trigger_type: formData.trigger_type,
            trigger_value: formData.trigger_value,
            scope: formData.scope,
            post_id: postId,
            actions: formData.actions,
            first_n_commenters: formData.first_n_commenters,
            follow_gate: formData.follow_gate,
        };

        mutation.mutate(input);
    };

    if (isLoading) {
        return (
            <AppShell>
                <div className="flex justify-center items-center h-96">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell
            title={editId ? "Edit Automation" : "Create New Automation"}
            action={
                <Button variant="ghost" onClick={() => router.push('/automations')}>Cancel</Button>
            }
        >
            <div className="max-w-4xl mx-auto pb-12">
                <StepIndicator currentStep={currentStep} />

                <div className="mt-8 animate-slide-up">
                    {currentStep === 1 && (
                        <Step1Trigger
                            formData={formData}
                            setFormData={setFormData}
                            onNext={() => setCurrentStep(2)}
                        />
                    )}

                    {currentStep === 2 && (
                        <Step2Actions
                            formData={formData}
                            setFormData={setFormData}
                            onNext={() => setCurrentStep(3)}
                            onBack={() => setCurrentStep(1)}
                        />
                    )}

                    {currentStep === 3 && (
                        <Step3Limits
                            formData={formData}
                            setFormData={setFormData}
                            onNext={() => setCurrentStep(4)}
                            onBack={() => setCurrentStep(2)}
                        />
                    )}

                    {currentStep === 4 && (
                        <Step4Review
                            formData={formData}
                            onBack={() => setCurrentStep(3)}
                            onSubmit={handleSubmit}
                            isSubmitting={mutation.isPending}
                        />
                    )}
                </div>
            </div>
        </AppShell>
    );
}

export default function NewAutomationPage() {
    return (
        <Suspense fallback={
            <AppShell>
                <div className="flex justify-center items-center h-96">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </AppShell>
        }>
            <AutomationForm />
        </Suspense>
    );
}
