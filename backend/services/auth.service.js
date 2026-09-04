/**
 * MAQ AUTO EDITOR ULTRA - License, Tier & Authorization Service
 * Manages Free vs Pro feature gating cleanly for local and future SaaS deployments.
 */

const { TIER_CAPABILITIES } = require('../../shared/constants');

class AuthService {
  constructor() {
    // Default tier: In local desktop standalone, all local editing features are enabled
    this.currentTier = process.env.MAQ_TIER || 'PRO';
  }

  /**
   * Get current license and tier information
   */
  getTierInfo() {
    const caps = TIER_CAPABILITIES[this.currentTier] || TIER_CAPABILITIES.PRO;
    return {
      tier: this.currentTier,
      isPro: this.currentTier === 'PRO',
      capabilities: caps,
      mode: 'Local Standalone / Offline'
    };
  }

  getStatus() {
    return this.getTierInfo();
  }

  /**
   * Check if a feature is allowed under current license
   * @param {string} featureKey 
   * @returns {boolean}
   */
  canAccess(featureKey) {
    const caps = TIER_CAPABILITIES[this.currentTier] || TIER_CAPABILITIES.PRO;
    if (caps[featureKey] !== undefined) {
      return !!caps[featureKey];
    }
    return true;
  }

  hasCapability(featureKey) {
    return this.canAccess(featureKey);
  }

  /**
   * Set tier for session (e.g. when testing free vs pro or receiving SaaS auth token)
   */
  setTier(tierName) {
    if (TIER_CAPABILITIES[tierName]) {
      this.currentTier = tierName;
      return true;
    }
    return false;
  }
}

module.exports = new AuthService();
