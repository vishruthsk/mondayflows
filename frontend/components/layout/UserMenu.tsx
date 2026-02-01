"use client";

import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
    UserCircleIcon,
    ArrowRightOnRectangleIcon,
    PlusCircleIcon,
    ChatBubbleLeftRightIcon
} from "@heroicons/react/24/outline";

export function UserMenu() {
    const { user, logout } = useAuth();

    // Get initials from handle or email or ID
    const getInitials = () => {
        if (user?.instagram_handle) {
            return user.instagram_handle.substring(0, 2).toUpperCase();
        }
        if (user?.email) {
            return user.email.substring(0, 2).toUpperCase();
        }
        return "U";
    };

    const getDisplayName = () => {
        return user?.instagram_handle || user?.email || "User";
    };

    return (
        <Menu as="div" className="relative ml-3">
            <div>
                <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-medium shadow-sm">
                        {getInitials()}
                    </div>
                </Menu.Button>
            </div>
            <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm text-gray-900 font-medium truncate">
                            {user?.instagram_handle || user?.email || "User"}
                        </p>
                        {user?.instagram_handle && (
                            <p className="text-xs text-gray-500 truncate">
                                {user?.email}
                            </p>
                        )}
                    </div>

                    <div className="py-1">
                        <Menu.Item>
                            {({ active }) => (
                                <Link
                                    href="/onboarding/connect-instagram"
                                    className={cn(
                                        active ? 'bg-gray-50 text-gray-900' : 'text-gray-700',
                                        'group flex items-center px-4 py-2 text-sm'
                                    )}
                                >
                                    <PlusCircleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                                    Connect Instagram
                                </Link>
                            )}
                        </Menu.Item>
                        <Menu.Item>
                            {({ active }) => (
                                <a
                                    href="https://t.me/monday_flows_bot" /* Placeholder - ideally from config but using a safe guess or external link */
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                        active ? 'bg-gray-50 text-gray-900' : 'text-gray-700',
                                        'group flex items-center px-4 py-2 text-sm'
                                    )}
                                >
                                    <ChatBubbleLeftRightIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                                    Open Telegram Bot
                                </a>
                            )}
                        </Menu.Item>
                    </div>

                    <div className="py-1 border-t border-gray-100">
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={() => logout()}
                                    className={cn(
                                        active ? 'bg-red-50 text-red-700' : 'text-gray-700',
                                        'group flex w-full items-center px-4 py-2 text-sm'
                                    )}
                                >
                                    <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-red-500 group-hover:text-red-600" aria-hidden="true" />
                                    Sign out
                                </button>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}
