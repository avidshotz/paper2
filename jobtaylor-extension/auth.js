// jobtaylor-extension/auth.js
// Authentication helper for Rezlie Chrome Extension

class RezlieAuth {
    constructor() {
        // These should be configured in your extension's environment
        this.supabaseUrl = 'https://sdlmyaffbnjkmzwpdwqp.supabase.co'; // Replace with your actual Supabase URL
        this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkbG15YWZmYm5qa216d3Bkd3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NDYwNjMsImV4cCI6MjA3MDUyMjA2M30.4sAux871wQyke3_bTJtqR9j4Nca76SJ1_yKQjui5SGA'; // Replace with your actual anon key
        
        // Initialize Supabase client
        this.supabase = null;
        this.initSupabase();
    }

    async initSupabase() {
        try {
            // For Chrome extensions, we'll use fetch directly instead of the Supabase client
            // This avoids CSP issues with external script loading
            console.log('🔧 Initializing Supabase connection...');
            this.supabase = {
                url: this.supabaseUrl,
                key: this.supabaseAnonKey
            };
            console.log('✅ Supabase connection initialized');
        } catch (error) {
            console.error('Failed to initialize Supabase connection:', error);
        }
    }

    // Get current user session
    async getCurrentUser() {
        if (!this.supabase) {
            console.error('Supabase connection not initialized');
            return null;
        }

        try {
            // Check if we have a stored session
            const session = await this.getStoredSession();
            if (session && session.user) {
                return session.user;
            }
            return null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    // Sign in with email and password
    async signIn(email, password) {
        if (!this.supabase) {
            throw new Error('Supabase connection not initialized');
        }

        try {
            const response = await fetch(`${this.supabase.url}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.supabase.key,
                    'Authorization': `Bearer ${this.supabase.key}`
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
            await this.storeSession(data);
            
            return data;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    // Sign up with email and password using proper Supabase flow
    async signUp(email, password) {
        if (!this.supabase) {
            throw new Error('Supabase connection not initialized');
        }

        try {
            // Use Supabase's proper signup endpoint
            const response = await fetch(`${this.supabase.url}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.supabase.key,
                    'Authorization': `Bearer ${this.supabase.key}`
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    data: {
                        signup_source: 'rezlie_extension'
                    }
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error_description || data.message || 'Sign up failed');
            }

            console.log('📧 Signup response:', data);

            // Check if email confirmation is required
            if (data.user && !data.user.email_confirmed_at) {
                console.log('📧 Email confirmation required');
                return {
                    ...data,
                    requiresEmailConfirmation: true,
                    message: 'Please check your email to verify your account before signing in.'
                };
            }

            // If email is already confirmed and we have a session, store it
            if (data.session) {
                await this.storeSession(data.session);
            }

            return data;
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    }

    // Verify email with token (for handling verification manually if needed)
    async verifyEmail(token) {
        if (!this.supabase) {
            throw new Error('Supabase connection not initialized');
        }

        try {
            const response = await fetch(`${this.supabase.url}/auth/v1/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.supabase.key,
                    'Authorization': `Bearer ${this.supabase.key}`
                },
                body: JSON.stringify({
                    token: token,
                    type: 'signup'
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error_description || data.message || 'Email verification failed');
            }

            console.log('✅ Email verified successfully:', data);
            return data;
        } catch (error) {
            console.error('Email verification error:', error);
            throw error;
        }
    }

    // Check if user's email is confirmed by making a direct API call
    async checkEmailConfirmation(userId) {
        if (!this.supabase) {
            throw new Error('Supabase connection not initialized');
        }

        try {
            const token = await this.getAccessToken();
            if (!token) {
                throw new Error('No access token available');
            }

            const response = await fetch(`${this.supabase.url}/auth/v1/user`, {
                method: 'GET',
                headers: {
                    'apikey': this.supabase.key,
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error_description || data.message || 'Failed to check email confirmation');
            }

            return data.user && data.user.email_confirmed_at;
        } catch (error) {
            console.error('Check email confirmation error:', error);
            throw error;
        }
    }

    // Sign out
    async signOut() {
        if (!this.supabase) {
            throw new Error('Supabase connection not initialized');
        }

        try {
            const session = await this.getStoredSession();
            if (session && session.access_token) {
                await fetch(`${this.supabase.url}/auth/v1/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': this.supabase.key,
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });
            }
            
            // Clear stored session
            await this.clearStoredSession();
        } catch (error) {
            console.error('Sign out error:', error);
            // Still clear the stored session even if the API call fails
            await this.clearStoredSession();
        }
    }

    // Get access token for API calls
    async getAccessToken() {
        const session = await this.getStoredSession();
        return session ? session.access_token : null;
    }

    // Check if user is authenticated
    async isAuthenticated() {
        const user = await this.getCurrentUser();
        return !!user;
    }

    // Check if user's email is confirmed
    async isEmailConfirmed() {
        const user = await this.getCurrentUser();
        return user && user.email_confirmed_at;
    }

    // Get user's rate limit info
    async getRateLimitInfo() {
        if (!this.supabase) {
            return null;
        }

        try {
            const token = await this.getAccessToken();
            if (!token) return null;

            const response = await fetch(`${this.supabase.url}/rest/v1/user_rate_limits?select=*`, {
                method: 'GET',
                headers: {
                    'apikey': this.supabase.key,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Error getting rate limit info:', response.statusText);
                return null;
            }

            const data = await response.json();
            return data[0] || null;
        } catch (error) {
            console.error('Error in getRateLimitInfo:', error);
            return null;
        }
    }

    // Listen for auth state changes (simplified for Chrome extension)
    onAuthStateChange(callback) {
        // For Chrome extensions, we'll use a simple polling approach
        // or trigger callbacks when auth state changes
        this.authCallback = callback;
        return {
            data: { subscription: null },
            error: null
        };
    }

    // Get authorization header for API calls
    async getAuthHeader() {
        const token = await this.getAccessToken();
        return token ? `Bearer ${token}` : null;
    }

    // Helper methods for session storage
    async storeSession(session) {
        try {
            await chrome.storage.local.set({ 'supabase_session': session });
        } catch (error) {
            console.error('Error storing session:', error);
        }
    }

    async getStoredSession() {
        try {
            const result = await chrome.storage.local.get(['supabase_session']);
            return result.supabase_session || null;
        } catch (error) {
            console.error('Error getting stored session:', error);
            return null;
        }
    }

    async clearStoredSession() {
        try {
            await chrome.storage.local.remove(['supabase_session']);
        } catch (error) {
            console.error('Error clearing stored session:', error);
        }
    }

    // Trigger auth state change callback
    triggerAuthStateChange(event, session) {
        if (this.authCallback) {
            this.authCallback(event, session);
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RezlieAuth;
} else {
    // For browser/extension environment
    window.RezlieAuth = RezlieAuth;
    console.log('🔧 RezlieAuth class registered on window object');
    console.log('🔍 RezlieAuth type:', typeof RezlieAuth);
}

// ES6 export for dynamic imports
export { RezlieAuth };
