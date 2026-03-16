import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com';
  const now  = new Date();

  return [
    // ── Core ──────────────────────────────────────────────────────────
    { url: `${base}/`,                            lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },

    // ── Platform downloaders ──────────────────────────────────────────
    { url: `${base}/youtube-video-download`,      lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/instagram-reels-download`,    lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/facebook-video-download`,     lastModified: now, changeFrequency: 'monthly', priority: 0.9 },

    // ── Blog ──────────────────────────────────────────────────────────
    { url: `${base}/blog`,                                          lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/blog/how-to-download-youtube-videos`,           lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/how-to-download-instagram-reels`,          lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/how-to-download-facebook-videos`,          lastModified: now, changeFrequency: 'monthly', priority: 0.8 },

    // ── Info pages ────────────────────────────────────────────────────
    { url: `${base}/about`,                       lastModified: now, changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${base}/contact`,                     lastModified: now, changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${base}/privacy-policy`,              lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${base}/terms-of-service`,            lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${base}/dmca`,                        lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
  ];
}
