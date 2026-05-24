// js/ui-utils.js
// UI utilities for modals, toasts, and common interactions

class UIUtils {
  constructor(authManager) {
    this.auth = authManager;
    this.authMode = 'signin';
  }

  /**
   * Show toast notification
   */
  showToast(message, duration = 3000) {
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
      position:fixed;
      bottom:80px;
      left:50%;
      transform:translateX(-50%) translateY(20px);
      background:var(--navy-deep);
      color:var(--gold-light);
      padding:16px 32px;
      border:1px solid var(--gold);
      font-family:'Jost',sans-serif;
      font-size:11px;
      letter-spacing:0.1em;
      z-index:10000;
      opacity:0;
      transition:all 0.3s ease;
      max-width:90%;
      text-align:center;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Open authentication modal
   */
  openAuthModal(mode = 'signin') {
    this.authMode = mode;
    
    const modal = document.getElementById('auth-modal');
    const nameField = document.getElementById('name-field');
    const title = document.getElementById('auth-modal-title');
    const subtitle = document.getElementById('auth-modal-subtitle');
    const btnText = document.getElementById('auth-btn-text');
    const toggleLink = document.getElementById('auth-toggle-link');
    
    if (mode === 'signup') {
      title.textContent = 'Create Account';
      subtitle.textContent = 'Save purchases across devices';
      nameField.style.display = 'block';
      btnText.textContent = 'CREATE ACCOUNT';
      toggleLink.innerHTML = 'Have an account? <span style="color:var(--gold);">Sign in</span>';
    } else {
      title.textContent = 'Sign In';
      subtitle.textContent = 'Access your purchased itineraries';
      nameField.style.display = 'none';
      btnText.textContent = 'SIGN IN';
      toggleLink.innerHTML = 'Don\'t have an account? <span style="color:var(--gold);">Create one</span>';
    }
    
    const form = document.getElementById('auth-form');
    if (form) form.reset();
    
    const error = document.getElementById('auth-error');
    if (error) error.style.display = 'none';
    
    modal.style.display = 'flex';
  }

  /**
   * Close authentication modal
   */
  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    modal.style.display = 'none';
  }

  /**
   * Toggle between sign in and sign up
   */
  toggleAuthMode(e) {
    if (e) e.preventDefault();
    this.authMode = this.authMode === 'signin' ? 'signup' : 'signin';
    this.openAuthModal(this.authMode);
  }

  /**
   * Handle authentication form submission
   */
  async handleAuth(e) {
    e.preventDefault();
    
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value;
    
    const btnText = document.getElementById('auth-btn-text');
    const btnLoading = document.getElementById('auth-btn-loading');
    const submitBtn = document.getElementById('auth-submit-btn');
    const errorEl = document.getElementById('auth-error');
    
    // Show loading state
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    submitBtn.disabled = true;
    errorEl.style.display = 'none';
    
    try {
      if (this.authMode === 'signup') {
        await this.auth.signUp(email, password, name);
        this.showToast('Account created! Welcome ✓');
        
        // Migrate localStorage purchases after signup
        await window.purchaseManager.migrateLocalStoragePurchases();
      } else {
        await this.auth.signIn(email, password);
        this.showToast('Welcome back! ✓');
        
        // Migrate localStorage purchases after signin
        await window.purchaseManager.migrateLocalStoragePurchases();
      }
      
      this.closeAuthModal();
      
      // Refresh any active dashboard
      if (window.myTripsDashboard) {
        const myTripsPage = document.getElementById('page-mytrips');
        if (myTripsPage && myTripsPage.classList.contains('active')) {
          window.myTripsDashboard.render();
        }
      }
      
    } catch (error) {
      errorEl.textContent = error.message || 'An error occurred';
      errorEl.style.display = 'block';
    } finally {
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
      submitBtn.disabled = false;
    }
    
    return false;
  }

  /**
   * Continue as guest
   */
  continueAsGuest() {
    this.auth.continueAsGuest();
    this.closeAuthModal();
    this.showToast('Continuing as guest');
    
    if (window.currentItinerary) {
      const purchaseModal = document.getElementById('purchase-modal');
      if (purchaseModal) {
        purchaseModal.style.display = 'flex';
      }
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    if (!confirm('Sign out?')) return;
    
    await this.auth.signOut();
    this.showToast('Signed out');
    
    // Redirect to home if on My Trips page
    const myTripsPage = document.getElementById('page-mytrips');
    if (myTripsPage && myTripsPage.classList.contains('active')) {
      if (typeof showPage === 'function') {
        showPage('home');
      }
    }
  }

  /**
   * Update UI based on auth state
   */
  updateUIForAuthState(event, user) {
    const memberBtn = document.getElementById('member-btn');
    const emailDisplay = document.getElementById('member-email-display');
    
    if (user && memberBtn) {
      memberBtn.style.display = 'block';
      if (emailDisplay) {
        emailDisplay.textContent = user.email;
      }
    } else if (memberBtn) {
      memberBtn.style.display = 'none';
    }
  }

  /**
   * Open member dashboard
   */
  openMemberDashboard() {
    if (typeof showPage === 'function') {
      showPage('mytrips');
    }
  }
}

// Initialize UI utilities
window.addEventListener('DOMContentLoaded', () => {
  const uiUtils = new UIUtils(window.supabaseAuth);
  
  // Listen for auth state changes
  window.supabaseAuth.onAuthStateChange((event, user) => {
    uiUtils.updateUIForAuthState(event, user);
  });
  
  // Make utilities globally accessible
  window.uiUtils = uiUtils;
  
  // Expose functions to global scope for onclick handlers
  window.openAuthModal = (mode) => uiUtils.openAuthModal(mode);
  window.closeAuthModal = () => uiUtils.closeAuthModal();
  window.toggleAuthMode = (e) => uiUtils.toggleAuthMode(e);
  window.handleAuth = (e) => uiUtils.handleAuth(e);
  window.continueAsGuest = () => uiUtils.continueAsGuest();
  window.signOut = () => uiUtils.signOut();
  window.openMemberDashboard = () => uiUtils.openMemberDashboard();
  window.showToast = (msg, dur) => uiUtils.showToast(msg, dur);
});
