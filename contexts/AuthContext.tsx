import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'tecnico';

interface Profile {
    id: string;
    role: UserRole;
    name: string;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    role: UserRole | null;
    isPasswordRecovery: boolean;
    logout: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<UserRole | null>(null);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
    const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

    const logout = async () => {
        console.log("AuthContext: Logout triggered");
        setLoading(true);
        try {
            await supabase.auth.signOut({ scope: 'local' });
        } catch (err) {
            console.error("Signout error:", err);
        }
        setUser(null);
        setProfile(null);
        setRole(null);
        setIsPasswordRecovery(false);
        setLoading(false);
    };

    const resetInactivityTimer = () => {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        inactivityTimer.current = setTimeout(() => {
            console.log('Inactivity timeout reached. Logging out...');
            logout();
        }, INACTIVITY_TIMEOUT);
    };

    const fetchProfile = async (uid: string) => {
        console.log("AuthContext: Fetching profile for", uid);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, role, name')
            .eq('id', uid)
            .single();

        if (error) {
            console.error('AuthContext: Error fetching profile:', error);
            return null;
        }
        console.log("AuthContext: Profile fetched successfully");
        return data as Profile;
    };

    useEffect(() => {
        let mounted = true;

        // Failsafe timeout to prevent infinite loading screen
        const failsafe = setTimeout(() => {
            if (mounted && loading) {
                console.warn("AuthContext: Failsafe timeout reached. Forcing loading=false");
                setLoading(false);
            }
        }, 5000); // Reduced to 5 seconds

        const initAuth = async () => {
            try {
                // Check if we are in recovery mode from URL hash
                const isRecovery = window.location.hash.includes('type=recovery');
                if (isRecovery) {
                    console.log("AuthContext: Detected recovery mode from URL");
                    setIsPasswordRecovery(true);
                }

                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (session?.user && mounted) {
                    setUser(session.user);
                    // Non-blocking profile fetch to speed up UI
                    fetchProfile(session.user.id).then(userProfile => {
                        if (mounted) {
                            if (userProfile) {
                                setProfile(userProfile);
                                setRole(userProfile.role || 'admin');
                            } else {
                                setRole('admin');
                            }
                        }
                    });
                }
            } catch (error) {
                console.error("Auth initialization failed:", error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`Auth event: ${event}`);
            if (!mounted) return;

            if (event === 'PASSWORD_RECOVERY') {
                setIsPasswordRecovery(true);
            }

            if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setRole(null);
                setLoading(false);
                return;
            }

            if (session?.user) {
                // Only update if user ID changed to avoid unnecessary re-renders
                setUser(prev => prev?.id === session.user.id ? prev : session.user);
                // Defer profile fetch to avoid Supabase callback deadlock
                setTimeout(async () => {
                    if (!mounted) return;
                    const userProfile = await fetchProfile(session.user.id);
                    if (mounted) {
                        if (userProfile) {
                            setProfile(userProfile);
                            setRole(userProfile.role || 'admin');
                        } else {
                            setRole('admin');
                        }
                    }
                }, 0);
            }

            setLoading(false);
            resetInactivityTimer();
        });

        // Validate session when tab regains focus (only update if user changed)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (!mounted) return;
                    if (session?.user) {
                        // Only update if user ID changed to avoid unnecessary re-renders
                        setUser(prev => prev?.id === session.user.id ? prev : session.user);
                    }
                });
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Activity listeners
        const activityEvents = ['mousedown', 'keydown', 'touchstart', 'mousemove'];
        activityEvents.forEach(ev => window.addEventListener(ev, resetInactivityTimer));
        resetInactivityTimer();

        return () => {
            mounted = false;
            subscription.unsubscribe();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            activityEvents.forEach(ev => window.removeEventListener(ev, resetInactivityTimer));
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            clearTimeout(failsafe);
        };
    }, []);

    const updateProfile = async (updates: Partial<Profile>) => {
        if (!user) return { success: false, error: 'User not authenticated' };

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

        if (error) {
            console.error('AuthContext: Error updating profile:', error);
            return { success: false, error };
        }

        setProfile(data as Profile);
        return { success: true, error: null };
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, role, isPasswordRecovery, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
