// js/purchase-manager.js
// Manages itinerary purchases with Supabase backend

class PurchaseManager {
  constructor(supabaseAuth) {
    this.auth = supabaseAuth;
    this.purchasesCache = null;
    this.cacheTimestamp = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Fetch user's purchases from Supabase
   * @returns {Promise<Array>} Array of purchase objects
   */
  async fetchUserPurchases() {
    if (!this.auth.isAuthenticated()) {
      return this.getFallbackPurchases();
    }

    // Return cached purchases if still valid
    if (this.isCacheValid()) {
      return this.purchasesCache;
    }

    try {
      const { data, error } = await this.auth.client
        .from('purchases')
        .select('*')
        .eq('user_id', this.auth.getUserId())
        .eq('status', 'completed')
        .order('purchase_date', { ascending: false });

      if (error) throw error;

      this.purchasesCache = data || [];
      this.cacheTimestamp = Date.now();
      
      return this.purchasesCache;
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
      return this.getFallbackPurchases();
    }
  }

  /**
   * Check if user has access to an itinerary
   * @param {string} itineraryId - Itinerary identifier (e.g., 'itin-brazil')
   * @returns {Promise<boolean>}
   */
  async checkItineraryAccess(itineraryId) {
    // Free samples
    if (itineraryId === 'itin-brazil' || itineraryId === 'itin-dallas') {
      return true;
    }

    if (!this.auth.isAuthenticated()) {
      // Fallback to localStorage for guest users
      return this.checkLocalStorageAccess(itineraryId);
    }

    const purchases = await this.fetchUserPurchases();
    return purchases.some(p => p.itinerary_id === itineraryId);
  }

  /**
   * Get user's purchased itineraries
   * @returns {Promise<Array>} Array of itinerary IDs
   */
  async getPurchasedItineraries() {
    const purchases = await this.fetchUserPurchases();
    return purchases.map(p => p.itinerary_id);
  }

  /**
   * Record a purchase in Supabase
   * This should ideally be called from a Stripe webhook on your backend
   * For now, this allows manual recording during development
   * 
   * @param {Object} purchaseData
   * @returns {Promise<Object>}
   */
  async recordPurchase(purchaseData) {
    if (!this.auth.isAuthenticated()) {
      throw new Error('Must be authenticated to record purchase');
    }

    const purchase = {
      user_id: this.auth.getUserId(),
      itinerary_id: purchaseData.itineraryId,
      itinerary_name: purchaseData.itineraryName,
      stripe_payment_id: purchaseData.stripePaymentId || null,
      stripe_checkout_session_id: purchaseData.stripeSessionId || null,
      price_paid: purchaseData.pricePaid || 0,
      status: 'completed',
      metadata: purchaseData.metadata || {}
    };

    try {
      const { data, error } = await this.auth.client
        .from('purchases')
        .insert([purchase])
        .select();

      if (error) throw error;

      // Invalidate cache
      this.purchasesCache = null;
      this.cacheTimestamp = null;

      return data[0];
    } catch (error) {
      console.error('Failed to record purchase:', error);
      throw error;
    }
  }

  /**
   * Migrate localStorage purchases to Supabase
   * Call this after user signs in to preserve their guest purchases
   */
  async migrateLocalStoragePurchases() {
    if (!this.auth.isAuthenticated()) return;

    const localPurchases = this.getLocalStoragePurchases();
    const existingPurchases = await this.fetchUserPurchases();
    const existingIds = existingPurchases.map(p => p.itinerary_id);

    const itineraryMetadata = this.getItineraryMetadata();

    for (const itinId of localPurchases) {
      // Skip if already in database
      if (existingIds.includes(itinId)) continue;
      
      // Skip free samples
      if (itinId === 'itin-brazil' || itinId === 'itin-dallas') continue;

      try {
        await this.recordPurchase({
          itineraryId: itinId,
          itineraryName: itineraryMetadata[itinId]?.name || itinId,
          pricePaid: itineraryMetadata[itinId]?.price || 0,
          metadata: { migrated_from_localstorage: true }
        });
        
        console.log(`Migrated purchase: ${itinId}`);
      } catch (e) {
        console.error(`Failed to migrate ${itinId}:`, e);
      }
    }

    // Clear localStorage after successful migration
    this.clearLocalStoragePurchases();
  }

  /**
   * Get purchases from localStorage (fallback for guests)
   */
  getLocalStoragePurchases() {
    const purchased = [];
    const itineraries = [
      'itin-puntacana', 'itin-thailand', 'itin-brazil', 
      'itin-elsalvador', 'itin-belize', 'itin-dallas', 
      'itin-panama', 'itin-stmartin'
    ];

    itineraries.forEach(id => {
      if (localStorage.getItem('purchased_' + id) === 'true') {
        purchased.push(id);
      }
    });

    return purchased;
  }

  /**
   * Check localStorage for guest access
   */
  checkLocalStorageAccess(itineraryId) {
    return localStorage.getItem('purchased_' + itineraryId) === 'true';
  }

  /**
   * Clear localStorage purchases after migration
   */
  clearLocalStoragePurchases() {
    const itineraries = [
      'itin-puntacana', 'itin-thailand', 'itin-brazil',
      'itin-elsalvador', 'itin-belize', 'itin-dallas',
      'itin-panama', 'itin-stmartin'
    ];

    itineraries.forEach(id => {
      localStorage.removeItem('purchased_' + id);
    });
  }

  /**
   * Fallback purchases for unauthenticated users
   */
  getFallbackPurchases() {
    const localIds = this.getLocalStoragePurchases();
    const metadata = this.getItineraryMetadata();
    
    return localIds.map(id => ({
      itinerary_id: id,
      itinerary_name: metadata[id]?.name || id,
      purchase_date: new Date().toISOString(),
      price_paid: 0,
      status: 'completed',
      from_localstorage: true
    }));
  }

  /**
   * Cache validation
   */
  isCacheValid() {
    if (!this.purchasesCache || !this.cacheTimestamp) return false;
    return (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
  }

  /**
   * Invalidate cache (call after purchase or sign in)
   */
  invalidateCache() {
    this.purchasesCache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Itinerary metadata for mapping
   */
  getItineraryMetadata() {
    return {
      'itin-puntacana': { name: 'Punta Cana Family Adventure', price: 0 },
      'itin-thailand': { name: 'Chiang Mai to Bangkok', price: 0 },
      'itin-brazil': { name: 'Rio de Janeiro & Paraty', price: 0 },
      'itin-elsalvador': { name: 'Turn Up in El Salvador', price: 0 },
      'itin-belize': { name: 'Please Belize Me', price: 0 },
      'itin-dallas': { name: 'Down in Dallas', price: 0 },
      'itin-panama': { name: 'Panama Itinerary', price: 0 },
      'itin-stmartin': { name: 'St. Martin Turn Up!!!', price: 0 }
    };
  }
}

// Export singleton instance
window.purchaseManager = new PurchaseManager(window.supabaseAuth);
