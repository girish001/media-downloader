'use client';
/**
 * components/AdBanner.tsx
 * ────────────────────────
 * Renders a banner ad placeholder at header, sidebar, or footer positions.
 * Supports Google AdSense, Adsterra, PropellerAds, and custom HTML banners.
 */

import { useEffect, useRef } from 'react';
import { adsConfig } from '@/config/ads';

type BannerPlacement = 'header' | 'sidebar' | 'footer';

interface Props {
  placement: BannerPlacement;
  className?: string;
}

const SIZES: Record<BannerPlacement, { w: string; h: string; label: string }> = {
  header:  { w: 'w-full max-w-[728px]', h: 'h-[90px]',  label: 'Header Banner (728×90)' },
  sidebar: { w: 'w-full max-w-[300px]', h: 'h-[250px]', label: 'Sidebar Banner (300×250)' },
  footer:  { w: 'w-full max-w-[728px]', h: 'h-[90px]',  label: 'Footer Banner (728×90)' },
};

export default function AdBanner({ placement, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // If ads globally disabled or this slot is off, render nothing
  if (!adsConfig.enableAds || !adsConfig.banners[placement]) return null;

  const size = SIZES[placement];

  // For AdSense: push the ad unit after mount
  useEffect(() => {
    if (adsConfig.network !== 'adsense') return;
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {}
  }, []);

  // Render based on network
  if (adsConfig.network === 'adsense') {
    const slots = (adsConfig as any).adsense?.slots;
    return (
      <div className={`flex justify-center my-3 ${className}`}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%' }}
          data-ad-client={(adsConfig as any).adsense?.publisherId}
          data-ad-slot={slots?.[placement]}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  if (adsConfig.network === 'adsterra') {
    const src = (adsConfig as any).adsterra?.[`${placement}BannerSrc`];
    if (!src) return null;
    return (
      <div className={`flex justify-center my-3 ${className}`}>
        <iframe src={src} width="728" height="90" scrolling="no" frameBorder="0" title={`${placement} ad`} />
      </div>
    );
  }

  // Custom / placeholder banner
  const html = (adsConfig as any).custom?.[placement]?.html;

  return (
    <div className={`flex justify-center my-3 ${className}`}>
      <div
        className={`${size.w} ${size.h} border border-dashed border-gray-200 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 text-xs select-none`}
      >
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} className="w-full h-full flex items-center justify-center" />
        ) : (
          <span>{size.label}</span>
        )}
      </div>
    </div>
  );
}
