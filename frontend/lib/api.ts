import type {
    Automation,
    AutomationsListResponse,
    ApiResponse,
    ExecutionsResponse,
    AutomationStatsResponse,
    CreateAutomationInput,
    UpdateAutomationInput,
    CodePool,
    CreatePoolInput,
    DiscountCode,
    CodeAssignment
} from '@/types/api';



const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public errors?: Array<{ field: string; message: string; code?: string }>
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

async function apiRequest<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    try {
        // Get auth token from localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        console.log(`[API] ${options?.method || 'GET'} ${endpoint}`);
        console.log('[API] Token from localStorage:', token ? 'EXISTS' : 'MISSING');

        const res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options?.headers,
            },
            credentials: 'include', // Include cookies for auth
        });

        console.log(`[API] Response status: ${res.status}`);
        const data = await res.json();

        if (!res.ok) {
            console.error(`[API] Error response:`, data);
            // Handle 401 Unauthorized - redirect to login
            if (res.status === 401 && typeof window !== 'undefined') {
                console.warn('[API] 401 Unauthorized - clearing auth and redirecting to login');
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
                window.location.href = '/auth/login';
            }

            throw new ApiError(
                data.error || 'API request failed',
                res.status,
                data.errors
            );
        }

        console.log(`[API] Success response:`, data);
        return data;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        console.error('[API] Network error:', error);
        throw new ApiError('Network error', 500);
    }
}

export const api = {
    // Authentication
    auth: {
        sendOTP: (email: string) =>
            apiRequest<ApiResponse<void>>('/auth/send-otp', {
                method: 'POST',
                body: JSON.stringify({ email }),
            }),

        verifyOTP: (email: string, code: string) =>
            apiRequest<ApiResponse<{ token: string; user: any }>>('/auth/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ email, code }),
            }),

        getMe: () =>
            apiRequest<ApiResponse<any>>('/auth/me'),

        logout: () =>
            apiRequest<ApiResponse<void>>('/auth/logout', {
                method: 'POST',
            }),
    },

    // Automations
    automations: {
        list: () =>
            apiRequest<AutomationsListResponse>('/automations'),

        get: (id: string) =>
            apiRequest<ApiResponse<Automation>>(`/automations/${id}`),

        create: (data: CreateAutomationInput) =>
            apiRequest<ApiResponse<Automation>>('/automations', {
                method: 'POST',
                body: JSON.stringify(data),
            }),

        update: (id: string, data: UpdateAutomationInput) =>
            apiRequest<ApiResponse<Automation>>(`/automations/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            }),

        delete: (id: string) =>
            apiRequest<ApiResponse<void>>(`/automations/${id}`, {
                method: 'DELETE',
            }),

        enable: (id: string) =>
            apiRequest<ApiResponse<Automation>>(`/automations/${id}/enable`, {
                method: 'POST',
            }),

        disable: (id: string) =>
            apiRequest<ApiResponse<Automation>>(`/automations/${id}/disable`, {
                method: 'POST',
            }),

        executions: (id: string, params?: { limit?: number; offset?: number }) =>
            apiRequest<any>(
                `/automations/${id}/executions?${new URLSearchParams(
                    params as any
                ).toString()}`
            ),

        stats: (id: string) =>
            apiRequest<AutomationStatsResponse>(`/automations/${id}/stats`),
    },

    // Executions
    executions: {
        recent: (params?: { limit?: number; offset?: number }) =>
            apiRequest<ExecutionsResponse>(
                `/executions?${new URLSearchParams(params as any).toString()}`
            ),
    },

    // Discount Codes
    discountCodes: {
        listPools: () =>
            apiRequest<{ success: boolean; data: CodePool[]; count: number }>('/discount-codes/pools'),

        createPool: (data: CreatePoolInput) =>
            apiRequest<{ success: boolean; data: CodePool }>('/discount-codes/pools', {
                method: 'POST',
                body: JSON.stringify(data),
            }),

        getPool: (id: string) =>
            apiRequest<{ success: boolean; data: CodePool }>(`/discount-codes/pools/${id}`),

        getPoolAssignments: (id: string) =>
            apiRequest<{ success: boolean; data: CodeAssignment[]; count: number }>(`/discount-codes/pools/${id}/assignments`),

        getPoolCodes: (id: string) =>
            apiRequest<{ success: boolean; data: string[] }>(`/discount-codes/pools/${id}/codes`),

        updatePool: (id: string, data: { name?: string; description?: string; codes?: string[] }) =>
            apiRequest<{ success: boolean; data: CodePool }>(`/discount-codes/pools/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            }),

        deletePool: (id: string) =>
            apiRequest<{ success: boolean; message: string }>(`/discount-codes/pools/${id}`, {
                method: 'DELETE',
            }),
    },
};

export { ApiError };
