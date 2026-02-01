import { getRelativeTime } from "@/lib/utils";

interface ActivityItemProps {
    status: "success" | "warning" | "error";
    user: string;
    automation: string;
    outcome: string;
    timestamp: string | Date;
}

const statusConfig = {
    success: {
        icon: "✅",
        dotColor: "bg-emerald-500",
        bgColor: "bg-emerald-50",
    },
    warning: {
        icon: "⚠️",
        dotColor: "bg-amber-500",
        bgColor: "bg-amber-50",
    },
    error: {
        icon: "❌",
        dotColor: "bg-red-500",
        bgColor: "bg-red-50",
    },
};

export function ActivityItem({ status, user, automation, outcome, timestamp }: ActivityItemProps) {
    const config = statusConfig[status];
    const relativeTime = typeof timestamp === 'string' ? timestamp : getRelativeTime(timestamp);

    return (
        <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-purple-50/50 transition-colors duration-150 cursor-pointer">
            {/* Status Icon */}
            <div className={`flex-shrink-0 w-10 h-10 ${config.bgColor} rounded-full flex items-center justify-center text-lg`}>
                {config.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="text-sm font-medium text-slate-900">
                            <span className="text-purple-600">{user}</span> → {automation}
                        </p>
                        <p className="text-sm text-slate-600 mt-0.5">{outcome}</p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{relativeTime}</span>
                </div>
            </div>

            {/* Status Dot */}
            <div className={`flex-shrink-0 w-2 h-2 ${config.dotColor} rounded-full mt-2`} />
        </div>
    );
}
