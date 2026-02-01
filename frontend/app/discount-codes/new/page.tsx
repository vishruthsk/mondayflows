"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";

export default function NewPoolPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        codes: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Parse codes
        const codeList = formData.codes
            .split(/[\n,]+/) // Split by newline or comma
            .map(code => code.trim())
            .filter(code => code.length > 0);

        if (codeList.length === 0) {
            toast.error("Please add at least one discount code");
            return;
        }

        // Check for duplicates
        const uniqueCodes = new Set(codeList);
        if (uniqueCodes.size !== codeList.length) {
            toast.error("Duplicate codes detected. Please ensure all codes are unique.");
            return;
        }

        setIsLoading(true);

        try {
            const response = await api.discountCodes.createPool({
                name: formData.name,
                description: formData.description,
                codes: codeList
            });

            if (response.success) {
                toast.success("Discount code pool created!");
                router.push("/discount-codes");
            }
        } catch (error: any) {
            console.error("Failed to create pool:", error);
            if (error.errors) {
                toast.error(`Error: ${error.errors[0].message}`);
            } else {
                toast.error(error.message || "Failed to create pool");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <Container className="py-8">
                <div className="max-w-2xl mx-auto">
                    <Link
                        href="/discount-codes"
                        className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-1" />
                        Back to Discount Codes
                    </Link>

                    <h1 className="text-3xl font-bold text-gray-900 mb-8">
                        Create New Pool
                    </h1>

                    <Card className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Input
                                label="Pool Name"
                                placeholder="e.g., Summer Sale 2024"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />

                            <Input
                                label="Description (Optional)"
                                placeholder="What is this pool for?"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Codes
                                </label>
                                <div className="text-xs text-gray-500 mb-2">
                                    Enter codes separated by newlines or commas.
                                </div>
                                <textarea
                                    className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                                    placeholder="SUMMER20&#10;SUMMER21&#10;SUMMER22"
                                    value={formData.codes}
                                    onChange={(e) => setFormData({ ...formData, codes: e.target.value })}
                                    required
                                />
                                <div className="text-right text-xs text-gray-500 mt-1">
                                    {formData.codes.split(/[\n,]+/).filter(c => c.trim().length > 0).length} codes detected
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? "Creating..." : "Create Pool"}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </Container>
        </div>
    );
}
