import { cn } from "@/lib/utils";
import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    hover?: boolean;
    padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
    children,
    hover = false,
    padding = "md",
    className,
    ...props
}: CardProps) {
    return (
        <div
            className={cn(
                "bg-white border border-gray-200 rounded-lg shadow-sm",
                hover && "transition-all duration-200 hover:shadow-md hover:border-gray-300",
                padding === "sm" && "p-3",
                padding === "md" && "p-4",
                padding === "lg" && "p-6",
                padding === "none" && "p-0",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
