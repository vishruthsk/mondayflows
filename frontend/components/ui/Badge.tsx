import { cn, getStatusColor, getStatusLabel } from "@/lib/utils";
import type { ExecutionStatus } from "@/types/api";

interface BadgeProps {
    status: ExecutionStatus | string;
    className?: string;
}

export function Badge({ status, className }: BadgeProps) {
    return (
        <span
            className={cn(
                "badge",
                getStatusColor(status),
                className
            )}
        >
            {getStatusLabel(status)}
        </span>
    );
}
