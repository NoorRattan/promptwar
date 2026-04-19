/**
 * Google Analytics 4 event tracking helpers.
 * All events include venue_id as a custom dimension for venue-level analytics.
 * gtag is loaded via CDN script tag in index.html — declared as global here.
 */

declare global {
  function gtag(...args: unknown[]): void;
}

export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string;

function trackEvent(eventName: string, parameters?: Record<string, string | number | boolean>): void {
  if (typeof gtag === 'undefined') return;
  gtag('event', eventName, { ...parameters, venue_id: getCurrentVenueId() });
}

function getCurrentVenueId(): string {
  // Try to parse it from the URL or return a default
  return new URLSearchParams(window.location.search).get('venue') ?? 'unknown';
}

export const analytics = {
  trackEvent,
  // Navigation events
  viewMap: () => trackEvent('view_crowd_map'),
  requestNavigation: (destinationZone: string) =>
    trackEvent('request_navigation', { destination_zone: destinationZone }),
  viewNearestExit: () => trackEvent('view_nearest_exit'),

  // Queue events
  viewQueues: () => trackEvent('view_queues'),
  viewQueue: (queueType: string) => trackEvent('view_queue', { queue_type: queueType }),
  setQueueAlert: (queueId: string) => trackEvent('set_queue_alert', { queue_id: queueId }),

  // Order events
  viewMenu: () => trackEvent('view_menu'),
  addToCart: (itemName: string, price: number) =>
    trackEvent('add_to_cart', { item_name: itemName, value: price }),
  placeOrder: (total: number, itemCount: number) =>
    trackEvent('place_order', { order_value: total, item_count: itemCount }),
  cancelOrder: () => trackEvent('cancel_order'),

  // Seat events
  viewSeatUpgrade: () => trackEvent('view_seat_upgrade'),
  acceptUpgrade: (priceDiff: number) =>
    trackEvent('accept_seat_upgrade', { price_difference: priceDiff }),
  declineUpgrade: () => trackEvent('decline_seat_upgrade'),

  // Emergency events
  emergencyAcknowledged: () => trackEvent('emergency_acknowledged'),
  emergencySOS: () => trackEvent('emergency_sos_sent'),
  viewEvacuationRoute: () => trackEvent('view_evacuation_route'),

  // Language events
  languageChanged: (newLanguage: string) =>
    trackEvent('language_changed', { new_language: newLanguage }),

  // Auth events
  login: (method: string) => trackEvent('login', { method }),
  register: () => trackEvent('sign_up'),
  loginAsGuest: () => trackEvent('guest_mode_start'),
};

export { trackEvent };
