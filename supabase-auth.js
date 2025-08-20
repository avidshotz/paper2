// Reusable Supabase Authentication Class
class SupabaseAuth {
    constructor() {
        this.supabaseUrl = 'https://sdlmyaffbnjkmzwpdwqp.supabase.co';
        this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkbG15YWZmYm5qa216d3Bkd3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NDYwNjMsImV4cCI6MjA3MDUyMjA2M30.4sAux871wQyke3_bTJtqR9j4Nca76SJ1_yKQjui5SGA';
        this.session = null;
        this.user = null;
        this.isAuthenticated = false;
        
        // Initialize auth state
        this.initAuth();
    }

    async initAuth() {
        try {
            // Try to get stored session
            const storedSession = await this.getStoredSession();
            if (storedSession && storedSession.access_token) {
                // Verify the stored session is still valid
                const isValid = await this.verifySession(storedSession.access_token);
                if (isValid) {
                    this.session = storedSession;
                    this.user = storedSession.user;
                    this.isAuthenticated = true;
                    console.log('✅ Restored valid session');
                    return;
                }
            }
            
            // No valid session found
            this.clearAuth();
            console.log('⚠️ No valid session found');
        } catch (error) {
            console.error('❌ Auth initialization error:', error);
            this.clearAuth();
        }
    }

    async verifySession(token) {
        try {
            const response = await fetch(`${this.supabaseUrl}/auth/v1/user`, {
                method: 'GET',
                headers: {
                    'apikey': this.supabaseAnonKey,
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.user = data;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Session verification failed:', error);
            return false;
        }
    }

    async signIn(email, password) {
        try {
            const response = await fetch(`${this.supabaseUrl}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.supabaseAnonKey,
                    'Authorization': `Bearer ${this.supabaseAnonKey}`
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error_description || data.message || 'Sign in failed');
            }

            // Store the session
            this.session = data;
            this.user = data.user;
            this.isAuthenticated = true;
            await this.storeSession(data);
            
            console.log('✅ Sign in successful');
            return data;
        } catch (error) {
            console.error('❌ Sign in error:', error);
            this.clearAuth();
            throw error;
        }
    }

    async signUp(email, password) {
        try {
            const response = await fetch(`${this.supabaseUrl}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.supabaseAnonKey,
                    'Authorization': `Bearer ${this.supabaseAnonKey}`
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error_description || data.message || 'Sign up failed');
            }

            console.log('✅ Sign up successful');
            
            // If session is provided, store it
            if (data.session) {
                this.session = data.session;
                this.user = data.user;
                this.isAuthenticated = true;
                await this.storeSession(data.session);
            }
            
            return data;
        } catch (error) {
            console.error('❌ Sign up error:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            if (this.session && this.session.access_token) {
                await fetch(`${this.supabaseUrl}/auth/v1/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': this.supabaseAnonKey,
                        'Authorization': `Bearer ${this.session.access_token}`
                    }
                });
            }
        } catch (error) {
            console.error('Sign out API error:', error);
        } finally {
            // Always clear local state
            this.clearAuth();
            await this.clearStoredSession();
            console.log('✅ Signed out');
        }
    }

    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'apikey': this.supabaseAnonKey
        };
        
        // Always include Authorization header - either with access token or anon key
        if (this.isAuthenticated && this.session && this.session.access_token) {
            headers['Authorization'] = `Bearer ${this.session.access_token}`;
            console.log('🔑 Using authenticated user token');
        } else {
            headers['Authorization'] = `Bearer ${this.supabaseAnonKey}`;
            console.log('🔑 Using anon key for authorization');
        }
        
        return headers;
    }

    getAuthHeader() {
        if (this.isAuthenticated && this.session && this.session.access_token) {
            return `Bearer ${this.session.access_token}`;
        }
        return null;
    }

    getCurrentUser() {
        return this.user;
    }

    getAccessToken() {
        return this.session ? this.session.access_token : null;
    }

    clearAuth() {
        this.session = null;
        this.user = null;
        this.isAuthenticated = false;
    }

    // Storage methods - can be overridden for different environments
    async storeSession(session) {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                // Chrome extension environment
                await chrome.storage.local.set({ 'supabase_session': session });
            } else {
                // Web environment
                localStorage.setItem('supabase_session', JSON.stringify(session));
            }
        } catch (error) {
            console.error('Error storing session:', error);
        }
    }

    async getStoredSession() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                // Chrome extension environment
                const result = await chrome.storage.local.get(['supabase_session']);
                return result.supabase_session || null;
            } else {
                // Web environment
                const stored = localStorage.getItem('supabase_session');
                return stored ? JSON.parse(stored) : null;
            }
        } catch (error) {
            console.error('Error getting stored session:', error);
            return null;
        }
    }

    async clearStoredSession() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                // Chrome extension environment
                await chrome.storage.local.remove(['supabase_session']);
            } else {
                // Web environment
                localStorage.removeItem('supabase_session');
            }
        } catch (error) {
            console.error('Error clearing stored session:', error);
        }
    }

    // Event callbacks
    onAuthStateChange(callback) {
        this.authCallback = callback;
        return {
            data: { subscription: null },
            error: null
        };
    }

    triggerAuthStateChange(event, session) {
        if (this.authCallback) {
            this.authCallback(event, session);
        }
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseAuth;
} else {
    window.SupabaseAuth = SupabaseAuth;
}
