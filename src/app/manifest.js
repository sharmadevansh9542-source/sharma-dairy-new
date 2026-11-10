export default function manifest() {
  return {
    name: 'Sharma Dairy ERP SaaS',
    short_name: 'Sharma Dairy',
    description: 'Enterprise Multi-Tenant Dairy ERP & Milk Management SaaS Platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#14532d',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}

