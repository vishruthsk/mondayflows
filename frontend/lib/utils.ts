import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format percentage
 */
export function formatPercentage(num: number): string {
    return `${num.toFixed(1)}%`;
}

/**
 * Get relative time string
 */
export function getRelativeTime(date: Date | string): string {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Get status color class
 */
export function getStatusColor(status: string): string {
    switch (status) {
        case 'success':
            return 'badge-success';
        case 'partial':
        case 'warning':
            return 'badge-warning';
        case 'failed':
        case 'error':
            return 'badge-error';
        case 'skipped':
        default:
            return 'badge-neutral';
    }
}

/**
 * Get status label
 */
export function getStatusLabel(status: string): string {
    switch (status) {
        case 'success':
            return 'Success';
        case 'partial':
            return 'Partial';
        case 'skipped':
            return 'Skipped';
        case 'failed':
            return 'Failed';
        default:
            return status;
    }
}

/**
 * Truncate text
 */
export function truncate(text: string, length: number): string {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
