'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Automation, ExecutionLog } from '@/types/api';

export function useAutomations() {
    return useQuery({
        queryKey: ['automations'],
        queryFn: async () => {
            const response = await api.automations.list();
            return response.data;
        },
    });
}

export function useAutomation(id: string) {
    return useQuery({
        queryKey: ['automations', id],
        queryFn: async () => {
            const response = await api.automations.get(id);
            return response.data;
        },
        enabled: !!id,
    });
}

export function useAutomationStats(id: string) {
    return useQuery({
        queryKey: ['automations', id, 'stats'],
        queryFn: async () => {
            const response = await api.automations.stats(id);
            return response.data;
        },
        enabled: !!id,
    });
}

export function useAutomationExecutions(
    id: string,
    params?: { limit?: number; offset?: number }
) {
    return useQuery({
        queryKey: ['automations', id, 'executions', params],
        queryFn: async () => {
            const response = await api.automations.executions(id, params);
            return response.data;
        },
        enabled: !!id,
    });
}

export function useRecentExecutions(params?: { limit?: number; offset?: number }) {
    return useQuery({
        queryKey: ['executions', 'recent', params],
        queryFn: async () => {
            const response = await api.executions.recent(params);
            return response.data;
        },
    });
}

// Dashboard-specific hook to get all data at once
export function useDashboardData() {
    const automationsQuery = useAutomations();
    const executionsQuery = useRecentExecutions({ limit: 50 });

    const automations = automationsQuery.data || [];
    const executions = executionsQuery.data?.executions || [];

    // Calculate stats
    const activeAutomations = automations.filter((a: Automation) => a.enabled).length;

    // Get today's executions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const runsToday = executions.filter((e: ExecutionLog) => {
        const executionDate = new Date(e.processed_at);
        return executionDate >= today;
    }).length;

    // Get yesterday's executions
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const runsYesterday = executions.filter((e: ExecutionLog) => {
        const executionDate = new Date(e.processed_at);
        return executionDate >= yesterday && executionDate < today;
    }).length;

    // Calculate percentage change from yesterday
    let percentageChange = 0;
    let changeDirection: 'up' | 'down' | 'same' = 'same';

    if (runsYesterday > 0) {
        percentageChange = Math.round(((runsToday - runsYesterday) / runsYesterday) * 100);
        changeDirection = percentageChange > 0 ? 'up' : percentageChange < 0 ? 'down' : 'same';
    } else if (runsToday > 0) {
        // If there were no runs yesterday but there are runs today
        percentageChange = 100;
        changeDirection = 'up';
    }

    // Calculate success rate
    const successfulRuns = executions.filter(
        (e: ExecutionLog) => e.execution_status === 'success'
    ).length;
    const successRate = executions.length > 0
        ? Math.round((successfulRuns / executions.length) * 100)
        : 0;

    return {
        automations,
        executions: executions.slice(0, 10), // Only show last 10 in dashboard
        stats: {
            activeAutomations,
            runsToday,
            runsYesterday,
            percentageChange,
            changeDirection,
            successRate,
        },
        isLoading: automationsQuery.isLoading || executionsQuery.isLoading,
        isError: automationsQuery.isError || executionsQuery.isError,
        error: automationsQuery.error || executionsQuery.error,
    };
}
