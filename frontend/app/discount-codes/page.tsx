"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon, TicketIcon, PencilIcon, TrashIcon, XMarkIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { Dialog, Transition } from "@headlessui/react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { CodePool } from "@/types/api";

function EditPoolModal({
    pool,
    isOpen,
    onClose,
    onUpdate
}: {
    pool: CodePool | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [codes, setCodes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (pool && isOpen) {
            setName(pool.name);
            setDescription(pool.description || "");
            fetchCodes(pool.id);
        }
    }, [pool, isOpen]);

    const fetchCodes = async (poolId: string) => {
        try {
            const response = await api.discountCodes.getPoolCodes(poolId);
            if (response.success) {
                setCodes(response.data.join("\n"));
            }
        } catch (error) {
            console.error("Failed to fetch codes:", error);
            toast.error("Failed to load codes");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pool) return;

        setIsSubmitting(true);
        try {
            const codeList = codes
                .split("\n")
                .map(c => c.trim())
                .filter(c => c.length > 0);

            if (codeList.length === 0) {
                toast.error("Pool must contain at least one code");
                setIsSubmitting(false);
                return;
            }

            const response = await api.discountCodes.updatePool(pool.id, {
                name,
                description,
                codes: codeList
            });

            if (response.success) {
                toast.success("Pool updated successfully");
                onUpdate();
                onClose();
            }
        } catch (error: any) {
            console.error(error);
            const message = error.message || "Failed to update pool";
            if (message.includes("duplicate")) {
                toast.error("Code pool contains duplicate codes");
            } else {
                toast.error(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-gray-100">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-bold leading-6 text-gray-900 flex justify-between items-center"
                                >
                                    Edit Pool
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-500 bg-gray-50 p-1 rounded-full transition-colors"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Pool Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Description <span className="text-gray-400 font-normal">(Optional)</span>
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={2}
                                            className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex justify-between mb-1">
                                            <span>Codes</span>
                                            <span className="text-gray-400 text-xs font-normal">One per line</span>
                                        </label>
                                        <div className="relative">
                                            <textarea
                                                value={codes}
                                                onChange={(e) => setCodes(e.target.value)}
                                                rows={6}
                                                placeholder="SUMMER20&#10;SUMMER25&#10;..."
                                                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border font-mono bg-gray-50"
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500">
                                            Add new codes here. Removing unassigned codes will delete them from the pool.
                                        </p>
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-50">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={onClose}
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            loading={isSubmitting}
                                            disabled={isSubmitting}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                                        >
                                            Save Changes
                                        </Button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

import { useAuth } from "@/lib/contexts/AuthContext";
// ... (imports)

// ... (EditPoolModal stays same)

export default function DiscountCodesPage() {
    const [pools, setPools] = useState<CodePool[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingPool, setEditingPool] = useState<CodePool | null>(null);
    const router = useRouter();
    const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthLoading && !isAuthenticated) {
            router.push('/auth/login');
        }
    }, [isAuthLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchPools();
        }
    }, [isAuthenticated]);

    const fetchPools = async () => {
        try {
            const response = await api.discountCodes.listPools();
            if (response.success) {
                setPools(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch pools:", error);
            toast.error("Failed to load discount code pools");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (poolId: string) => {
        if (!confirm("Are you sure you want to delete this pool? This action cannot be undone.")) {
            return;
        }

        try {
            const response = await api.discountCodes.deletePool(poolId);
            if (response.success) {
                toast.success("Pool deleted successfully");
                fetchPools();
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to delete pool");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Pool ID copied to clipboard");
    };

    return (
        <AppShell
            title="Discount Pools"
            action={
                <Link href="/discount-codes/new">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm">
                        <PlusIcon className="w-5 h-5" />
                        Create Pool
                    </Button>
                </Link>
            }
        >
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-64 bg-gray-100 rounded-xl border border-gray-200" />
                    ))}
                </div>
            ) : pools.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
                    <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <TicketIcon className="w-10 h-10 text-purple-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        No discount pools yet
                    </h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        Create a pool of discount codes to distribute them automatically in your DM campaigns.
                    </p>
                    <Link href="/discount-codes/new">
                        <Button>Create Your First Pool</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pools.map((pool) => (
                        <div key={pool.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                                        <TicketIcon className="w-6 h-6" />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setEditingPool(pool)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit Pool"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(pool.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Pool"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-bold text-gray-900 truncate pr-2">
                                            {pool.name}
                                        </h3>
                                        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${pool.assigned_codes === pool.total_codes
                                            ? "bg-red-50 text-red-600 border-red-100"
                                            : "bg-green-50 text-green-600 border-green-100"
                                            }`}>
                                            {pool.total_codes - pool.assigned_codes > 0 ? 'Active' : 'Empty'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 line-clamp-2 h-10">
                                        {pool.description || "No description provided"}
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>Waitlist Usage</span>
                                        <span className="font-medium text-gray-900">{Math.round((pool.assigned_codes / pool.total_codes) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3 overflow-hidden">
                                        <div
                                            className={`h-1.5 rounded-full transition-all duration-1000 ${pool.assigned_codes === pool.total_codes ? 'bg-red-500' : 'bg-indigo-500'
                                                }`}
                                            style={{ width: `${(pool.assigned_codes / pool.total_codes) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <div className="text-gray-600">
                                            <span className="font-semibold text-gray-900">{pool.assigned_codes}</span> used
                                        </div>
                                        <div className="text-gray-400">/</div>
                                        <div className="text-gray-600">
                                            <span className="font-semibold text-gray-900">{pool.total_codes}</span> total
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                                    <span className="text-gray-400 font-mono">ID: {pool.id.substring(0, 8)}...</span>
                                    <button
                                        onClick={() => copyToClipboard(pool.id)}
                                        className="text-indigo-600 font-medium hover:underline flex items-center gap-1"
                                    >
                                        <ClipboardDocumentIcon className="w-3 h-3" />
                                        Copy ID
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <EditPoolModal
                pool={editingPool}
                isOpen={!!editingPool}
                onClose={() => setEditingPool(null)}
                onUpdate={fetchPools}
            />
        </AppShell>
    );
}
