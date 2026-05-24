// js/itinerary-controller.js
// Controls itinerary access and purchase flow

class ItineraryController {
  constructor(purchaseManager, authManager) {
    this.purchases = purchaseManager;
    this.auth = authManager;
  }

  /**
   * Check if user has access to view an itinerary
   * @param {string} itineraryPage - Page ID (e.g., 'itin-brazil')
   * @returns {Promise<boolean>}
   */
  async checkAccess(itineraryPage) {
    return await this.purchases.checkItineraryAccess(itineraryPage);
  }

  /**
   * Handle itinerary view request
   * @param {string} itineraryPage - Page ID
   * @param {string} tripName - Display name of the trip
   */
  async viewItinerary(itineraryPage, tripName) {
    // Admin bypass - if in edit mode, allow viewing without purchase
    if (typeof _editModeActive !== 'undefined' && _editModeActive) {
      if (typeof showPage === 'function') {
        showPage(itineraryPage);
      }
      return false;
    }
    
    const hasAccess = await this.checkAccess(itineraryPage);
    
    if (hasAccess) {
      if (typeof showPage === 'function') {
        showPage(itineraryPage);
      }
    } else {
      // Store itinerary info for purchase
      window.currentItinerary = { page: itineraryPage, name: tripName };
      
      // Show purchase modal
      const modal = document.getElementById('purchase-modal');
      if (modal) {
        modal.style.display = 'flex';
      }
    }
    
    return false;
  }

  /**
   * Handle itinerary button clicks
   * @param {string} itineraryId - Itinerary ID
   * @param {string} tripName - Trip display name
   */
  async handleItineraryButton(itineraryId, tripName) {
    const hasAccess = await this.checkAccess(itineraryId);
    
    if (hasAccess) {
      // Already purchased - go to booking page
      window.location.href = '#book-' + itineraryId;
      if (typeof showPage === 'function') {
        showPage('book');
      }
    } else {
      // Not purchased - initiate purchase flow
      this.bookThisTrip(tripName);
    }
  }

  /**
   * Open Stripe payment link
   * @param {string} tripValue - Trip identifier
   */
  bookThisTrip(tripValue) {
    // In production, this would dynamically select the correct Stripe link
    // For now, using the single payment link
    window.open('https://buy.stripe.com/28E8wPeRsgHq9gwfHBdMI0T', '_blank');
  }

  /**
   * Update button text based on purchase status
   * @param {string} itineraryId - Itinerary ID
   */
  async updateButton(itineraryId) {
    const btnId = 'btn-' + itineraryId;
    const cardBtnId = 'card-btn-' + itineraryId;
    const btn = document.getElementById(btnId);
    const cardBtn = document.getElementById(cardBtnId);
    
    const hasAccess = await this.checkAccess(itineraryId);
    
    if (hasAccess) {
      if (btn) btn.textContent = 'Book This Group Trip →';
      if (cardBtn) cardBtn.textContent = 'Book This Group Trip →';
    } else {
      if (btn) btn.textContent = 'Purchase Itinerary →';
      if (cardBtn) cardBtn.textContent = 'Purchase Itinerary →';
    }
  }

  /**
   * Update all itinerary buttons on the page
   */
  async updateAllButtons() {
    const itineraries = [
      'itin-puntacana', 'itin-thailand', 'itin-brazil',
      'itin-elsalvador', 'itin-belize', 'itin-dallas',
      'itin-panama', 'itin-stmartin'
    ];

    for (const id of itineraries) {
      await this.updateButton(id);
    }
  }

  /**
   * Close purchase modal
   */
  closeModal() {
    const modal = document.getElementById('purchase-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Proceed to Stripe checkout
   */
  proceedToPurchase() {
    // Store which itinerary they're buying
    if (window.currentItinerary) {
      localStorage.setItem('pending_purchase', window.currentItinerary.page);
    }
    
    // Close modal
    this.closeModal();
    
    // Open Stripe payment link
    window.open('https://buy.stripe.com/28E8wPeRsgHq9gwfHBdMI0T', '_blank');
  }

  /**
   * Test function to simulate purchase (development only)
   * @param {string} itineraryId - Itinerary to mark as purchased
   */
  async testPurchase(itineraryId) {
    if (!this.auth.isAuthenticated()) {
      alert('Please sign in first');
      return;
    }

    try {
      await this.purchases.recordPurchase({
        itineraryId: itineraryId,
        itineraryName: this.getItineraryName(itineraryId),
        pricePaid: 0,
        metadata: { test_purchase: true }
      });
      
      await this.updateAllButtons();
      alert('Test purchase recorded for: ' + this.getItineraryName(itineraryId));
    } catch (error) {
      alert('Failed to record purchase: ' + error.message);
    }
  }

  /**
   * Get itinerary display name
   */
  getItineraryName(itineraryId) {
    const names = {
      'itin-puntacana': 'Punta Cana Family Adventure',
      'itin-thailand': 'Chiang Mai to Bangkok',
      'itin-brazil': 'Rio de Janeiro & Paraty',
      'itin-elsalvador': 'Turn Up in El Salvador',
      'itin-belize': 'Please Belize Me',
      'itin-dallas': 'Down in Dallas',
      'itin-panama': 'Panama Itinerary',
      'itin-stmartin': 'St. Martin Turn Up!!!'
    };
    
    return names[itineraryId] || itineraryId;
  }
}

// Initialize controller
window.addEventListener('DOMContentLoaded', () => {
  const controller = new ItineraryController(
    window.purchaseManager,
    window.supabaseAuth
  );
  
  // Make controller globally accessible
  window.itineraryController = controller;
  
  // Expose functions for onclick handlers
  window.viewItinerary = (page, name) => controller.viewItinerary(page, name);
  window.handleItineraryButton = (id, name) => controller.handleItineraryButton(id, name);
  window.bookThisTrip = (value) => controller.bookThisTrip(value);
  window.closeModal = () => controller.closeModal();
  window.proceedToPurchase = () => controller.proceedToPurchase();
  
  // Update buttons on auth state change
  window.supabaseAuth.onAuthStateChange(async () => {
    await controller.updateAllButtons();
  });
  
  // Initial button update
  controller.updateAllButtons();
  
  // Re-check buttons periodically to catch any changes
  setInterval(() => controller.updateAllButtons(), 5000);
});
