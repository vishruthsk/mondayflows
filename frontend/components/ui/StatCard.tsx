import { Card } from "./Card";
import { formatNumber } from "@/lib/utils";
import { ReactNode } from "react";

interface StatCardProps {
    title: string;
    value: number | string;
    subtitle: string;
    icon?: ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
}

export function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
    const displayValue = typeof value === 'number' ? formatNumber(value) : value;

    return (
        <Card hover className="relative overflow-hidden">
            {/* Background decoration - Purple theme */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-50 to-transparent rounded-full -mr-16 -mt-16 opacity-50" />

            <div className="relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-600">{title}</h3>
                    {icon && (
                        <div className="text-purple-600">
                            {icon}
                        </div>
                    )}
                </div>

                {/* Value */}
                <div className="mb-2">
                    <p className="text-4xl font-bold text-slate-900">{displayValue}</p>
                </div>

                {/* Subtitle & Trend */}
                <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-500">{subtitle}</p>
                    {trend && (
                        <span className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                            {trend.isPositive ? '↑' : '↓'} {trend.value}%
                        </span>
                    )}
                </div>
            </div>
        </Card>
    );
}
