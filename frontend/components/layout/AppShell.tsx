"use client";

import { Sidebar } from "./Sidebar";
import { UserMenu } from "./UserMenu";

interface AppShellProps {
    children: React.ReactNode;
    title?: string;
    action?: React.ReactNode;
}

export function AppShell({ children, title, action }: AppShellProps) {
    return (
        <div className="min-h-screen bg-[#F7F8FA]">
            <Sidebar />

            <main className="pl-64 min-h-screen transition-all duration-300">
                <div className="max-w-7xl mx-auto p-8">
                    {/* Top Bar for specific page actions/title if needed, usually distinct from global nav */}
                    {(title || action) && (
                        <header className="flex items-center justify-between mb-8 animate-fade-in">
                            <div>
                                {title && (
                                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                        {title}
                                    </h1>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                {action}
                                {/* We can also put UserMenu here if we want helpful top-right context */}
                                <div className="pl-4 border-l border-gray-200">
                                    <UserMenu />
                                </div>
                            </div>
                        </header>
                    )}

                    {/* If no title/action, we might still want the UserMenu relative to the content area */}
                    {!title && !action && (
                        <div className="flex justify-end mb-6">
                            <UserMenu />
                        </div>
                    )}

                    <div className="animate-slide-up">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
