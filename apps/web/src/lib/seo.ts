export const site = {
  name: "Micaela Martinez - Extension de Pestañas",
  description: "Plataforma de cursos de maquillaje y tienda de cosméticos seleccionados.",
  keywords: [
    "cursos de maquillaje",
    "cosméticos",
    "belleza",
    "tienda de maquillaje",
    "tutoriales",
  ],
};

export function productJsonLd(p: { name: string; slug: string; price: number; currency?: string; images?: string[]; brand?: string; category?: string; }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    image: p.images || [],
    brand: p.brand ? { '@type':'Brand', name: p.brand } : undefined,
    category: p.category,
    offers: {
      '@type': 'Offer',
      price: (p.price/100).toFixed(2),
      priceCurrency: p.currency || 'ARS',
      availability: 'https://schema.org/InStock',
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/tienda/${p.slug}`,
    }
  };
}
export function courseJsonLd(c: { title: string; slug: string; provider?: string; image?: string; }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: c.title,
    provider: c.provider ? { '@type':'Organization', name: c.provider } : undefined,
    image: c.image ? [c.image] : [],
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/cursos/${c.slug}`,
  };
}
