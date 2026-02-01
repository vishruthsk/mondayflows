"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Header } from "@/components/layout/Header";
import { Container } from "@/components/layout/Container";
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
        <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <button
                type="button"
                onClick={() => onChange(!enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-black" : "bg-gray-300"
                    }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"
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
        <div className="flex items-center justify-center mb-8">
            {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                    <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${currentStep >= step.number
                            ? "bg-black text-white"
                            : "bg-gray-200 text-gray-600"
                            }`}
                    >
                        {step.number}
                    </div>
                    <span
                        className={`ml-2 text-sm font-medium ${currentStep >= step.number ? "text-gray-900" : "text-gray-500"
                            }`}
                    >
                        {step.name}
                    </span>
                    {index < steps.length - 1 && (
                        <div className="w-12 h-px bg-gray-300 mx-4" />
                    )}
                </div>
            ))}
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
        if (!formData.trigger_value) newErrors.trigger_value = "Keyword is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validate()) onNext();
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Step 1: Configure Trigger
            </h2>

            <div className="space-y-6">
                <Input
                    label="Automation Name"
                    placeholder="e.g., Welcome Flow"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    error={errors.name}
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
                            className={`p-4 border-2 rounded-lg text-left transition-colors ${formData.trigger_type === "keyword"
                                ? "border-black bg-gray-50"
                                : "border-gray-200 hover:border-gray-300"
                                }`}
                        >
                            <p className="font-medium text-gray-900">Keyword</p>
                            <p className="text-sm text-gray-600">
                                Trigger on specific words
                            </p>
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setFormData({ ...formData, trigger_type: "intent" })
                            }
                            className={`p-4 border-2 rounded-lg text-left transition-colors ${formData.trigger_type === "intent"
                                ? "border-black bg-gray-50"
                                : "border-gray-200 hover:border-gray-300"
                                }`}
                        >
                            <p className="font-medium text-gray-900">Intent (AI)</p>
                            <p className="text-sm text-gray-600">
                                Detect user intent with AI
                            </p>
                        </button>
                    </div>
                </div>

                <Input
                    label={
                        formData.trigger_type === "keyword"
                            ? "Keyword"
                            : "Intent Description"
                    }
                    placeholder={
                        formData.trigger_type === "keyword"
                            ? "e.g., code, discount, giveaway"
                            : "e.g., asking for discount code"
                    }
                    value={formData.trigger_value}
                    onChange={(e) =>
                        setFormData({ ...formData, trigger_value: e.target.value })
                    }
                    error={errors.trigger_value}
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Scope
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, scope: "global" })}
                            className={`p-4 border-2 rounded-lg text-left transition-colors ${formData.scope === "global"
                                ? "border-black bg-gray-50"
                                : "border-gray-200 hover:border-gray-300"
                                }`}
                        >
                            <p className="font-medium text-gray-900">Global</p>
                            <p className="text-sm text-gray-600">All posts</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, scope: "post" })}
                            className={`p-4 border-2 rounded-lg text-left transition-colors ${formData.scope === "post"
                                ? "border-black bg-gray-50"
                                : "border-gray-200 hover:border-gray-300"
                                }`}
                        >
                            <p className="font-medium text-gray-900">Post-Specific</p>
                            <p className="text-sm text-gray-600">Single post only</p>
                        </button>
                    </div>
                </div>

                {formData.scope === "post" && (
                    <Input
                        label="Post URL"
                        placeholder="https://www.instagram.com/p/ABC123..."
                        value={formData.post_id || ""}
                        onChange={(e) =>
                            setFormData({ ...formData, post_id: e.target.value })
                        }
                        helperText="Paste the full Instagram post URL"
                    />
                )}

                <div className="flex justify-end">
                    <Button onClick={handleNext}>Next</Button>
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
        <Card className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Step 2: Configure Actions
            </h2>

            <div className="space-y-6">
                {/* Public Reply */}
                <div className="border border-gray-200 rounded-lg p-4">
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
                        <div className="mt-4">
                            <Input
                                label="Reply Text"
                                placeholder="e.g., Thanks for commenting!"
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
                            />
                        </div>
                    )}
                </div>

                {/* DM */}
                <div className="border border-gray-200 rounded-lg p-4">
                    <Toggle
                        enabled={actions.dm?.enabled || false}
                        onChange={(enabled) =>
                            setFormData({
                                ...formData,
                                actions: {
                                    ...actions,
                                    dm: enabled
                                        ? { enabled: true, text: actions.dm?.text || "", delay_seconds: actions.dm?.delay_seconds }
                                        : { enabled: false, text: "" },
                                },
                            })
                        }
                        label="Send DM"
                    />

                    {actions.dm?.enabled && (
                        <div className="mt-4 space-y-4">
                            <Input
                                label="DM Message"
                                placeholder="Use {username} and {code} variables"
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
                                helperText="Variables: {username}, {code}"
                            />
                        </div>
                    )}
                </div>

                {/* Discount Code */}
                <div className="border border-gray-200 rounded-lg p-4">
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
                        label="Discount Code"
                    />

                    {actions.discount_code?.enabled && (
                        <div className="mt-4 space-y-4">
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
                            />
                            <Input
                                label="Message Template"
                                placeholder="Your code: {{CODE}}"
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
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-between">
                    <Button variant="secondary" onClick={onBack}>
                        Back
                    </Button>
                    <Button onClick={onNext}>Next</Button>
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
        <Card className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Step 3: Set Limits
            </h2>

            <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-4">
                    <Toggle
                        enabled={!!formData.first_n_commenters}
                        onChange={(enabled) =>
                            setFormData({
                                ...formData,
                                first_n_commenters: enabled ? 10 : null,
                            })
                        }
                        label="First N Commenters"
                    />

                    {formData.first_n_commenters && (
                        <div className="mt-4">
                            <Input
                                type="number"
                                label="Number of Commenters"
                                placeholder="e.g., 10"
                                value={formData.first_n_commenters.toString()}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        first_n_commenters: parseInt(e.target.value) || null,
                                    })
                                }
                                helperText="Only the first N commenters will receive the automation"
                            />
                        </div>
                    )}
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                    <Toggle
                        enabled={formData.follow_gate}
                        onChange={(enabled) =>
                            setFormData({ ...formData, follow_gate: enabled })
                        }
                        label="Follow Gate"
                    />
                    <p className="text-sm text-gray-600 mt-2">
                        Only send to users who follow your account
                    </p>
                </div>

                <div className="flex justify-between">
                    <Button variant="secondary" onClick={onBack}>
                        Back
                    </Button>
                    <Button onClick={onNext}>Next</Button>
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
        <Card className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Step 4: Review & Create
            </h2>

            <div className="space-y-6">
                <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Automation Name</h3>
                    <p className="text-gray-900">{formData.name}</p>
                </div>

                <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Trigger</h3>
                    <p className="text-gray-900">
                        {formData.trigger_type === "keyword" ? "Keyword" : "Intent"}: {formData.trigger_value}
                    </p>
                    <p className="text-sm text-gray-600">
                        Scope: {formData.scope === "global" ? "All posts" : `Post ${formData.post_id}`}
                    </p>
                </div>

                <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Actions</h3>
                    <ul className="space-y-1">
                        {formData.actions.public_reply?.enabled && (
                            <li className="text-gray-900">✓ Public Reply</li>
                        )}
                        {formData.actions.dm?.enabled && (
                            <li className="text-gray-900">✓ Send DM</li>
                        )}
                        {formData.actions.discount_code?.enabled && (
                            <li className="text-gray-900">✓ Discount Code</li>
                        )}
                    </ul>
                </div>

                {(formData.first_n_commenters || formData.follow_gate) && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-2">Limits</h3>
                        <ul className="space-y-1">
                            {formData.first_n_commenters && (
                                <li className="text-gray-900">
                                    First {formData.first_n_commenters} commenters
                                </li>
                            )}
                            {formData.follow_gate && (
                                <li className="text-gray-900">Followers only</li>
                            )}
                        </ul>
                    </div>
                )}

                <div className="flex justify-between pt-6 border-t border-gray-200">
                    <Button variant="secondary" onClick={onBack}>
                        Back
                    </Button>
                    <Button onClick={onSubmit} loading={isSubmitting}>
                        Create Automation
                    </Button>
                </div>
            </div>
        </Card>
    );
}

export default function NewAutomationPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [formData, setFormData] = useState<FormData>({
        name: "",
        trigger_type: "keyword",
        trigger_value: "",
        scope: "global",
        actions: {},
        follow_gate: false,
    });

    const createMutation = useMutation({
        mutationFn: async (data: CreateAutomationInput) => {
            console.log('[Create Automation] Submitting data:', data);
            const response = await api.automations.create(data);
            console.log('[Create Automation] Response:', response);
            return response;
        },
        onSuccess: (response) => {
            console.log('[Create Automation] Success:', response);
            toast.success('Automation created successfully!');
            // Redirect to automations list
            router.push('/automations');
        },
        onError: (error: Error) => {
            console.error('[Create Automation] Error:', error);

            if (error instanceof ApiError) {
                // Handle validation errors
                if (error.errors && error.errors.length > 0) {
                    const errorMessages = error.errors.map(e => e.message).join(', ');
                    toast.error(`Validation failed: ${errorMessages}`);
                } else {
                    toast.error(error.message || 'Failed to create automation');
                }
            } else {
                toast.error('An unexpected error occurred. Please try again.');
            }
        },
    });

    const handleSubmit = () => {
        console.log('[Create Automation] handleSubmit called');
        console.log('[Create Automation] Form data:', formData);

        // Extract post ID from URL if provided
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

        console.log('[Create Automation] Prepared input:', input);
        createMutation.mutate(input);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <Container className="py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Create Automation
                    </h1>
                    <p className="text-gray-600">
                        Build your automation workflow step by step
                    </p>
                </div>

                <StepIndicator currentStep={currentStep} />

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
                        isSubmitting={createMutation.isPending}
                    />
                )}
            </Container>
        </div>
    );
}
