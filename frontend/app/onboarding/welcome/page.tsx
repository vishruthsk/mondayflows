"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function WelcomePage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Welcome to Monday Flows
                    </h1>
                    <p className="text-lg text-gray-600 mb-6">
                        Automate your Instagram engagement with powerful, intelligent workflows
                    </p>
                </div>

                <div className="space-y-6 mb-8">
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 font-medium">
                            1
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900 mb-1">
                                Create Automations
                            </h3>
                            <p className="text-gray-600 text-sm">
                                Set up keyword or AI-powered intent triggers to automatically respond to comments
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 font-medium">
                            2
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900 mb-1">
                                Configure Actions
                            </h3>
                            <p className="text-gray-600 text-sm">
                                Send public replies, DMs, or distribute discount codes automatically
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 font-medium">
                            3
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900 mb-1">
                                Monitor Performance
                            </h3>
                            <p className="text-gray-600 text-sm">
                                Track execution logs, success rates, and engagement metrics in real-time
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center">
                    <Button
                        onClick={() => router.push("/dashboard")}
                        className="px-8"
                    >
                        Get Started
                    </Button>
                </div>
            </Card>
        </div>
    );
}
