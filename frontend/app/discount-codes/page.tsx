"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon, TicketIcon, PencilIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { Dialog, Transition } from "@headlessui/react";

import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";
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
            // Parse codes: split by newline, trim, filter empty
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
            // Show more helpful error for duplicates
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
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

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
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                                >
                                    Edit Pool
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-500"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Pool Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm border p-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Description (Optional)
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={2}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm border p-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex justify-between">
                                            <span>Codes</span>
                                            <span className="text-gray-400 text-xs font-normal">One per line</span>
                                        </label>
                                        <textarea
                                            value={codes}
                                            onChange={(e) => setCodes(e.target.value)}
                                            rows={6}
                                            placeholder="SUMMER20&#10;SUMMER25&#10;..."
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm border p-2 font-mono"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Add new codes here. Removing unassigned codes will delete them. Assigned codes cannot be removed.
                                        </p>
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3">
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

export default function DiscountCodesPage() {
    const [pools, setPools] = useState<CodePool[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingPool, setEditingPool] = useState<CodePool | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchPools();
    }, []);

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
        <div className="min-h-screen bg-gray-50">
            <Header />

            <Container className="py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Discount Codes
                        </h1>
                        <p className="text-gray-600">
                            Manage your discount code pools for automations
                        </p>
                    </div>
                    <Link href="/discount-codes/new">
                        <Button className="flex items-center gap-2">
                            <PlusIcon className="w-5 h-5" />
                            Create Pool
                        </Button>
                    </Link>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="h-48 animate-pulse bg-gray-100">
                                <div />
                            </Card>
                        ))}
                    </div>
                ) : pools.length === 0 ? (
                    <Card className="text-center py-12">
                        <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                            <TicketIcon className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No discount pools yet
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            Create a pool of discount codes to distribute them automatically in your DM campaigns.
                        </p>
                        <Link href="/discount-codes/new">
                            <Button>Create Your First Pool</Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pools.map((pool) => (
                            <Card key={pool.id} className="hover:shadow-md transition-shadow relative group">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-2 bg-purple-50 rounded-lg">
                                            <TicketIcon className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setEditingPool(pool)}
                                                className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                                                title="Edit Pool"
                                            >
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(pool.id)}
                                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Delete Pool"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-start justify-between mb-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${pool.assigned_codes === pool.total_codes
                                            ? "bg-red-100 text-red-700"
                                            : "bg-green-100 text-green-700"
                                            }`}>
                                            {pool.total_codes - pool.assigned_codes} left
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                        {pool.name}
                                    </h3>
                                    {pool.description && (
                                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                            {pool.description}
                                        </p>
                                    )}

                                    <div className="space-y-3 mt-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Total Codes</span>
                                            <span className="font-medium text-gray-900">{pool.total_codes}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Assigned</span>
                                            <span className="font-medium text-gray-900">{pool.assigned_codes}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div
                                                className="bg-purple-600 h-2 rounded-full transition-all"
                                                style={{ width: `${(pool.assigned_codes / pool.total_codes) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-gray-100">
                                        <div className="flex flex-col gap-2">
                                            <span className="text-xs text-gray-500">Pool ID</span>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 text-xs bg-gray-50 p-2 rounded border border-gray-200 truncate font-mono">
                                                    {pool.id}
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(pool.id)}
                                                    className="shrink-0"
                                                >
                                                    Copy
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 text-xs text-gray-400 text-right">
                                        Created {formatDate(pool.created_at)}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </Container>

            <EditPoolModal
                pool={editingPool}
                isOpen={!!editingPool}
                onClose={() => setEditingPool(null)}
                onUpdate={fetchPools}
            />
        </div>
    );
}
