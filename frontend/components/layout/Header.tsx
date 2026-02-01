"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "./Container";
import { Cog6ToothIcon, TicketIcon } from "@heroicons/react/24/outline";
import { UserMenu } from "./UserMenu";

export function Header() {
    const pathname = usePathname();

    return (
        <header className="bg-white border-b border-gray-200">
            <Container>
                <div className="flex items-center justify-between h-16">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <img src="/images/full-logo.png" alt="Monday Flows" className="h-12 object-contain" />
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center space-x-6">
                        <Link
                            href="/dashboard"
                            className={`text-sm font-medium transition-colors ${pathname === "/dashboard"
                                ? "text-gray-900"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/automations"
                            className={`text-sm font-medium transition-colors ${pathname?.startsWith("/automations")
                                ? "text-gray-900"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Automations
                        </Link>
                        <Link
                            href="/activity"
                            className={`text-sm font-medium transition-colors ${pathname === "/activity"
                                ? "text-gray-900"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Activity
                        </Link>
                        <Link
                            href="/discount-codes"
                            className={`text-sm font-medium transition-colors ${pathname?.startsWith("/discount-codes")
                                ? "text-gray-900"
                                : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            Discounts
                        </Link>
                    </nav>

                    {/* User Menu */}
                    <UserMenu />
                </div>
            </Container>
        </header>
    );
}
