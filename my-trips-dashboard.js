// js/my-trips-dashboard.js
// User dashboard for viewing purchased itineraries and account info

class MyTripsDashboard {
  constructor(purchaseManager, authManager) {
    this.purchases = purchaseManager;
    this.auth = authManager;
  }

  /**
   * Render the My Trips dashboard
   */
  async render() {
    const container = document.getElementById('page-mytrips');
    if (!container) {
      console.error('My Trips container not found');
      return;
    }

    if (!this.auth.isAuthenticated()) {
      this.renderUnauthenticated(container);
      return;
    }

    const purchases = await this.purchases.fetchUserPurchases();
    this.renderDashboard(container, purchases);
  }

  renderUnauthenticated(container) {
    container.innerHTML = `
      <div style="max-width:600px;margin:0 auto;padding:80px 20px;text-align:center;">
        <div style="font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:var(--gold);margin-bottom:16px;">◇ Member Area</div>
        <h1 style="font-family:'Cormorant Garamond',serif;font-size:clamp(32px,5vw,48px);font-weight:300;color:var(--navy);margin-bottom:20px;">My Trips</h1>
        <p style="font-size:14px;line-height:1.8;color:var(--text-light);margin-bottom:32px;">Sign in to view your purchased itineraries and upcoming adventures.</p>
        <button onclick="openAuthModal('signin')" style="background:var(--gold);color:var(--navy);border:none;padding:14px 32px;font-family:'Jost',sans-serif;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;cursor:pointer;font-weight:500;transition:all 0.2s;">Sign In</button>
      </div>
    `;
  }

  renderDashboard(container, purchases) {
    const user = this.auth.getUser();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Traveler';
    
    container.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:60px 20px;">
        <!-- Header Section -->
        <div style="margin-bottom:48px;">
          <div style="font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:var(--gold);margin-bottom:12px;">◇ Welcome Back</div>
          <h1 style="font-family:'Cormorant Garamond',serif;font-size:clamp(36px,5vw,54px);font-weight:300;color:var(--navy);margin-bottom:8px;">${this.escapeHtml(userName)}</h1>
          <p style="font-size:13px;letter-spacing:0.1em;color:var(--text-light);margin-bottom:24px;">${this.escapeHtml(user.email)}</p>
          <button onclick="window.supabaseAuth.signOut().then(() => showToast('Signed out successfully'))" style="background:transparent;color:var(--gold);border:1px solid var(--gold);padding:10px 24px;font-family:'Jost',sans-serif;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;cursor:pointer;font-weight:400;transition:all 0.2s;">Sign Out</button>
        </div>

        <!-- Stats Overview -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:48px;">
          ${this.renderStatsCard('Total Trips', purchases.length, '🌍')}
          ${this.renderStatsCard('Destinations', this.getUniqueDestinations(purchases), '✈️')}
          ${this.renderStatsCard('Member Since', this.formatMemberSince(user), '⭐')}
        </div>

        <!-- Purchased Itineraries -->
        <div>
          <h2 style="font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:300;color:var(--navy);margin-bottom:24px;">My Itineraries</h2>
          ${purchases.length > 0 ? this.renderPurchasedTrips(purchases) : this.renderEmptyState()}
        </div>

        <!-- Quick Actions -->
        <div style="margin-top:60px;padding:40px;background:var(--sand-mid);border:1px solid rgba(201,168,76,0.2);text-align:center;">
          <h3 style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:300;color:var(--navy);margin-bottom:16px;">Explore More Destinations</h3>
          <p style="font-size:13px;color:var(--text-light);margin-bottom:24px;">Discover new curated itineraries and unlock exclusive travel experiences</p>
          <button onclick="showPage('trips')" style="background:var(--gold);color:var(--navy);border:none;padding:12px 28px;font-family:'Jost',sans-serif;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;cursor:pointer;font-weight:500;transition:all 0.2s;">Browse Itineraries</button>
        </div>
      </div>
    `;
  }

  renderStatsCard(label, value, icon) {
    return `
      <div style="background:var(--white);border:1px solid rgba(201,168,76,0.2);padding:24px;text-align:center;">
        <div style="font-size:28px;margin-bottom:8px;">${icon}</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:400;color:var(--navy);margin-bottom:4px;">${value}</div>
        <div style="font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:var(--text-light);">${label}</div>
      </div>
    `;
  }

  renderPurchasedTrips(purchases) {
    const itineraryData = this.getItineraryData();
    
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">
        ${purchases.map(purchase => {
          const itinerary = itineraryData[purchase.itinerary_id] || {};
          return this.renderTripCard(purchase, itinerary);
        }).join('')}
      </div>
    `;
  }

  renderTripCard(purchase, itinerary) {
    const purchaseDate = new Date(purchase.purchase_date);
    const formattedDate = purchaseDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });

    return `
      <div style="background:var(--white);border:1px solid rgba(201,168,76,0.25);overflow:hidden;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.boxShadow='0 8px 24px rgba(28,43,74,0.12)'" onmouseout="this.style.boxShadow='none'" onclick="viewItinerary('${purchase.itinerary_id}', '${this.escapeHtml(purchase.itinerary_name)}')">
        <div style="height:180px;background:linear-gradient(135deg, var(--navy) 0%, var(--navy-deep) 100%);position:relative;overflow:hidden;">
          ${itinerary.image ? `<img src="${itinerary.image}" style="width:100%;height:100%;object-fit:cover;opacity:0.7;" alt="${this.escapeHtml(purchase.itinerary_name)}">` : ''}
          <div style="position:absolute;top:16px;right:16px;background:rgba(201,168,76,0.95);color:var(--navy);padding:6px 12px;font-size:8px;letter-spacing:0.2em;text-transform:uppercase;font-weight:500;">Purchased</div>
        </div>
        <div style="padding:24px;">
          <h3 style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:400;color:var(--navy);margin-bottom:8px;">${this.escapeHtml(purchase.itinerary_name)}</h3>
          <p style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:var(--text-light);margin-bottom:16px;">${itinerary.destination || 'Destination'}</p>
          <div style="border-top:1px solid rgba(201,168,76,0.15);padding-top:16px;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:9px;letter-spacing:0.1em;color:var(--text-light);">Purchased ${formattedDate}</div>
            <div style="color:var(--gold);font-size:11px;">View →</div>
          </div>
        </div>
      </div>
    `;
  }

  renderEmptyState() {
    return `
      <div style="background:var(--white);border:1px solid rgba(201,168,76,0.2);padding:60px 20px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">✈️</div>
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:300;color:var(--navy);margin-bottom:12px;">No Itineraries Yet</h3>
        <p style="font-size:13px;color:var(--text-light);margin-bottom:24px;">Start your journey by purchasing your first curated itinerary</p>
        <button onclick="showPage('trips')" style="background:var(--gold);color:var(--navy);border:none;padding:12px 28px;font-family:'Jost',sans-serif;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;cursor:pointer;font-weight:500;">Explore Itineraries</button>
      </div>
    `;
  }

  getUniqueDestinations(purchases) {
    const destinations = new Set();
    purchases.forEach(p => {
      const itinerary = this.getItineraryData()[p.itinerary_id];
      if (itinerary?.destination) {
        destinations.add(itinerary.destination);
      }
    });
    return destinations.size;
  }

  formatMemberSince(user) {
    if (!user?.created_at) return 'Recently';
    const date = new Date(user.created_at);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  getItineraryData() {
    return {
      'itin-brazil': {
        destination: 'Brazil',
        image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80',
        dates: 'Jul 10–17, 2026'
      },
      'itin-thailand': {
        destination: 'Thailand',
        image: 'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=800&q=80',
        dates: 'Apr 16–26, 2027'
      },
      'itin-puntacana': {
        destination: 'Dominican Republic',
        image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
        dates: 'Jun 26–Jul 3, 2027'
      },
      'itin-elsalvador': {
        destination: 'El Salvador',
        image: 'https://images.unsplash.com/photo-1605555274146-47c28aaf0c25?w=800&q=80',
        dates: 'Dec 26–30, 2027'
      },
      'itin-belize': {
        destination: 'Belize',
        image: 'https://images.unsplash.com/photo-1544550285-f813152fb2fd?w=800&q=80',
        dates: 'May 18–22, 2027'
      },
      'itin-dallas': {
        destination: 'Dallas, TX',
        image: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&q=80',
        dates: 'Nov 2–6, 2027'
      },
      'itin-panama': {
        destination: 'Panama',
        image: 'https://images.unsplash.com/photo-1558862107-d49ef2a04d72?w=800&q=80',
        dates: 'Dec 7–14, 2027'
      },
      'itin-stmartin': {
        destination: 'St. Martin',
        image: 'https://images.unsplash.com/photo-1606083026325-22a22addccb2?w=800&q=80',
        dates: 'Feb 12–17, 2027'
      }
    };
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize dashboard on auth state change
window.addEventListener('DOMContentLoaded', () => {
  const dashboard = new MyTripsDashboard(window.purchaseManager, window.supabaseAuth);
  
  window.supabaseAuth.onAuthStateChange((event, user) => {
    // Re-render dashboard when auth state changes
    const myTripsPage = document.getElementById('page-mytrips');
    if (myTripsPage && myTripsPage.classList.contains('active')) {
      dashboard.render();
    }
  });

  // Make dashboard accessible globally
  window.myTripsDashboard = dashboard;
});
