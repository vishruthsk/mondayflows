"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    HomeIcon,
    BoltIcon,
    ChartBarIcon,
    TicketIcon,
    Cog6ToothIcon,
    ArrowLeftOnRectangleIcon
} from "@heroicons/react/24/outline";
import { useAuth } from "@/lib/contexts/AuthContext";
import { api } from "@/lib/api";

export function Sidebar() {
    const pathname = usePathname();
    const { logout } = useAuth();

    const navigation = [
        { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
        { name: "Automations", href: "/automations", icon: BoltIcon },
        { name: "Activity", href: "/activity", icon: ChartBarIcon },
        { name: "Discount Pools", href: "/discount-codes", icon: TicketIcon },
    ];

    const handleLogout = async () => {
        try {
            await api.auth.logout();
            logout();
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col z-10 transition-all duration-300">
            {/* Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-gray-100">
                <div className="flex items-center justify-start w-full">
                    <img src="/images/full-logo.png" alt="Monday Flows" className="h-16 w-auto object-contain" />
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                <div className="mb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Menu
                </div>
                {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`
                                group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                                ${isActive
                                    ? "bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-100"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }
                            `}
                        >
                            <item.icon
                                className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200
                                    ${isActive ? "text-purple-600" : "text-gray-400 group-hover:text-gray-500"}
                                `}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <div className="space-y-1">
                    <Link
                        href="/settings"
                        className={`
                            group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                            ${pathname === '/settings'
                                ? "bg-purple-50 text-purple-700"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            }
                        `}
                    >
                        <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                        Settings
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" />
                        Logout
                    </button>
                </div>
            </div>
        </aside>
    );
}
