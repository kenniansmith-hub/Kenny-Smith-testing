// js/supabase-client.js
// Supabase authentication and client management

const SUPABASE_CONFIG = {
  url: 'https://pomynwxyorhqrqunrryz.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvbXlud3h5b3JocXJxdW5ycnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0ODAwNzQsImV4cCI6MjA5NTA1NjA3NH0.q6nWAndb7rBBVCSqWhixRamZnfTXqlo9YZ9r1kQLYG8'
};

class SupabaseAuthManager {
  constructor() {
    this.client = null;
    this.currentUser = null;
    this.isGuest = false;
    this.authStateCallbacks = [];
  }

  async initialize() {
    try {
      if (typeof window.supabase !== 'undefined') {
        this.client = window.supabase.createClient(
          SUPABASE_CONFIG.url,
          SUPABASE_CONFIG.anonKey
        );
        await this.checkAuthState();
        return true;
      } else {
        // Wait for Supabase library to load
        return new Promise((resolve) => {
          setTimeout(async () => {
            const result = await this.initialize();
            resolve(result);
          }, 100);
        });
      }
    } catch (e) {
      console.warn('Supabase auth initialization failed:', e);
      return false;
    }
  }

  async checkAuthState() {
    if (!this.client) return;
    
    try {
      const { data: { session } } = await this.client.auth.getSession();
      if (session) {
        this.currentUser = session.user;
        this.notifyAuthStateChange('SIGNED_IN', session.user);
      }
      
      // Listen for auth state changes
      this.client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          this.currentUser = session.user;
          this.notifyAuthStateChange('SIGNED_IN', session.user);
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          this.isGuest = false;
          this.notifyAuthStateChange('SIGNED_OUT', null);
        }
      });
    } catch (e) {
      console.warn('Auth state check failed:', e);
    }
  }

  onAuthStateChange(callback) {
    this.authStateCallbacks.push(callback);
  }

  notifyAuthStateChange(event, user) {
    this.authStateCallbacks.forEach(cb => cb(event, user));
  }

  async signUp(email, password, fullName) {
    if (!this.client) throw new Error('Supabase not initialized');
    
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { 
        data: { full_name: fullName }
      }
    });
    
    if (error) throw error;
    return data;
  }

  async signIn(email, password) {
    if (!this.client) throw new Error('Supabase not initialized');
    
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  }

  async signOut() {
    if (!this.client) return;
    await this.client.auth.signOut();
  }

  continueAsGuest() {
    this.isGuest = true;
    this.notifyAuthStateChange('GUEST_MODE', null);
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  getUser() {
    return this.currentUser;
  }

  getUserId() {
    return this.currentUser?.id || null;
  }

  getUserEmail() {
    return this.currentUser?.email || null;
  }
}

// Export singleton instance
window.supabaseAuth = new SupabaseAuthManager();
