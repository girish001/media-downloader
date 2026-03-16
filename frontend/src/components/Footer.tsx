import Link from 'next/link';

const LEGAL_LINKS = [
  { href: '/about',            label: 'About Us'         },
  { href: '/contact',          label: 'Contact'          },
  { href: '/blog',             label: 'Blog'             },
  { href: '/privacy-policy',   label: 'Privacy Policy'   },
  { href: '/terms-of-service', label: 'Terms of Service' },
  { href: '/dmca',             label: 'DMCA / Copyright' },
];

const PLATFORM_LINKS = [
  { href: '/youtube-video-download',   label: 'YouTube Downloader'   },
  { href: '/instagram-reels-download', label: 'Instagram Downloader' },
  { href: '/facebook-video-download',  label: 'Facebook Downloader'  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 mt-16">
      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* Top row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                ▶
              </span>
              <span className="text-white font-extrabold tracking-tight">MediaProc</span>
            </div>
            <p className="text-sm leading-relaxed">
              Free, fast video downloader for YouTube, Instagram, Facebook and 1,000+ sites.
              No watermarks. No sign-up. No permanent storage.
            </p>
          </div>

          {/* Downloaders */}
          <div>
            <h3 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">
              Downloaders
            </h3>
            <ul className="space-y-2">
              {PLATFORM_LINKS.map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm hover:text-white transition"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">
              Legal &amp; Info
            </h3>
            <ul className="space-y-2">
              {LEGAL_LINKS.map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm hover:text-white transition"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {year} MediaProc. All rights reserved. For personal use only.</p>
          <p className="text-center sm:text-right max-w-sm">
            MediaProc does not host copyrighted content. Users are responsible for complying
            with the Terms of Service of the original platforms.
          </p>
        </div>
      </div>
    </footer>
  );
}
