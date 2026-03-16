/**
 * config/ads.ts
 * ─────────────
 * Central configuration for all advertisement placements.
 * Edit this file to enable/disable ads and set network IDs.
 */

export const adsConfig = {
  /** Set to false to disable all ads globally (e.g. for development) */
  enableAds: true,

  /** How many seconds the interstitial countdown lasts before Skip is enabled */
  interstitialDelay: 10,

  /** Banner placements — set to false to hide a specific slot */
  banners: {
    header:  true,
    sidebar: true,
    footer:  true,
  },

  /**
   * Ad network configuration.
   * Uncomment and fill in the network you want to use.
   *
   * --- Google AdSense ---
   * network: 'adsense',
   * adsense: {
   *   publisherId: 'ca-pub-XXXXXXXXXXXXXXXXX',
   *   slots: {
   *     header:  'XXXXXXXXXX',
   *     sidebar: 'XXXXXXXXXX',
   *     footer:  'XXXXXXXXXX',
   *     interstitial: 'XXXXXXXXXX',
   *   },
   * },
   *
   * --- Adsterra ---
   * network: 'adsterra',
   * adsterra: {
   *   headerBannerSrc:  'https://www.effectiveratecpm.com/...',
   *   sidebarBannerSrc: 'https://www.effectiveratecpm.com/...',
   *   footerBannerSrc:  'https://www.effectiveratecpm.com/...',
   * },
   *
   * --- PropellerAds ---
   * network: 'propellerads',
   * propellerads: {
   *   zoneId: 'XXXXXXX',
   * },
   */
  network: 'custom' as 'adsense' | 'adsterra' | 'propellerads' | 'custom',

  /** Custom promotional banner content (used when network === 'custom') */
  custom: {
    header: {
      html: `<div style="width:100%;text-align:center;padding:8px 0;font-size:13px;color:#6b7280;">
               📢 Advertisement
             </div>`,
    },
    sidebar: {
      html: `<div style="width:100%;text-align:center;padding:12px;font-size:13px;color:#6b7280;">
               📢 Advertisement
             </div>`,
    },
    footer: {
      html: `<div style="width:100%;text-align:center;padding:8px 0;font-size:13px;color:#6b7280;">
               📢 Advertisement
             </div>`,
    },
  },
};

export type AdsConfig = typeof adsConfig;
