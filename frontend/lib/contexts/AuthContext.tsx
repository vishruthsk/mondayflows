import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../api';

interface User {
    id: string;
    email: string;
    tier: 'free' | 'pro' | 'enterprise';
    instagram_connected: boolean;
    instagram_handle?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, otp: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Check for existing session on mount
    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);

        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (error) {
                console.error('Failed to parse saved user:', error);
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
            }
        }

        setIsLoading(false);
    }, []);

    const login = async (email: string, otp: string) => {
        try {
            console.log('[AuthContext] Starting login for:', email);
            const response = await api.auth.verifyOTP(email, otp);
            console.log('[AuthContext] Verify OTP response:', response);

            if (response.success && response.data) {
                const { token, user: userData } = response.data;
                console.log('[AuthContext] Token received:', token ? 'YES' : 'NO');
                console.log('[AuthContext] User data:', userData);

                // Save token and user
                localStorage.setItem(TOKEN_KEY, token);
                localStorage.setItem(USER_KEY, JSON.stringify(userData));
                console.log('[AuthContext] Token saved to localStorage');

                // Verify it was saved
                const savedToken = localStorage.getItem(TOKEN_KEY);
                console.log('[AuthContext] Token verification - saved:', savedToken ? 'YES' : 'NO');

                setUser(userData);

                // Redirect based on onboarding status
                if (!userData.instagram_connected) {
                    console.log('[AuthContext] Redirecting to onboarding');
                    router.push('/onboarding/connect-instagram');
                } else {
                    console.log('[AuthContext] Redirecting to dashboard');
                    router.push('/dashboard');
                }
            } else {
                console.error('[AuthContext] Invalid response format:', response);
                throw new Error('Invalid OTP');
            }
        } catch (error) {
            console.error('[AuthContext] Login failed:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        router.push('/auth/login');
    };

    const refreshUser = async () => {
        try {
            const response = await api.auth.getMe();
            if (response.success && response.data) {
                setUser(response.data);
                localStorage.setItem(USER_KEY, JSON.stringify(response.data));
            }
        } catch (error) {
            console.error('Failed to refresh user:', error);
            logout();
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}
