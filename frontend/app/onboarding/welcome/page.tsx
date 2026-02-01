"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BoltIcon, ChatBubbleLeftRightIcon, ChartBarIcon } from "@heroicons/react/24/outline";

export default function WelcomePage() {
    const router = useRouter();

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: 'url(/images/auth-bg.png)' }}
        >
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center p-8 rounded-3xl bg-white/40 backdrop-blur-lg border border-white/30 shadow-2xl">

                {/* Left Side: Content */}
                <div className="space-y-8 order-2 md:order-1">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            Now in Alpha
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-[1.1] mb-4">
                            Automate your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                                Instagram Growth
                            </span>
                        </h1>
                        <p className="text-lg text-gray-500 leading-relaxed max-w-md">
                            Turn comments into conversations and DMs into sales. The all-in-one automation platform for modern creators.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100/50 hover:bg-white hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <BoltIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Instant Replies</h3>
                                <p className="text-sm text-gray-500">Auto-respond to keywords in seconds</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100/50 hover:bg-white hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300">
                            <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600">
                                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Smart DMs</h3>
                                <p className="text-sm text-gray-500">Send personalized messages automatically</p>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={() => router.push("/onboarding/connect-instagram")}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-xl px-8 text-[15px] shadow-xl shadow-indigo-200 transition-all hover:scale-105"
                    >
                        Get Started
                    </Button>
                </div>

                {/* Right Side: Visual */}
                <div className="order-1 md:order-2 md:pl-10">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 animate-pulse"></div>
                        <Card className="relative p-6 border-gray-200/60 shadow-2xl shadow-indigo-100/50 bg-white/80 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                                <div className="flex items-center">
                                    <img src="/images/full-logo.png" alt="Monday Flows" className="h-12 w-auto object-contain" />
                                </div>
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                    <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0"></div>
                                    <div className="space-y-2 w-full">
                                        <div className="h-2 w-24 bg-gray-100 rounded"></div>
                                        <div className="h-16 w-full bg-gray-50 rounded-lg border border-gray-100 p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1 rounded">Trigger: "price"</span>
                                            </div>
                                            <div className="text-xs text-gray-400">Sent DM with pricing info...</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0"></div>
                                    <div className="space-y-2 w-full">
                                        <div className="h-2 w-32 bg-gray-100 rounded"></div>
                                        <div className="h-8 w-3/4 bg-gray-50 rounded-lg border border-gray-100"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                                <span>Automation Active</span>
                                <span className="text-green-600 font-medium">98% Success</span>
                            </div>
                        </Card>
                    </div>
                </div>

            </div>
        </div>
    );
}
