const SITE_URL = "https://glitchgrab.dev";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Glitchgrab",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: ["https://github.com/webnaresh/glitchgrab"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${SITE_URL}/contact`,
    },
  };
}

export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Glitchgrab",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "Convert screenshots, production errors, and user complaints into well-structured GitHub issues. Powered by AI. Open source.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Organization",
      name: "Navibyte Innovation Pvt. Ltd.",
    },
  };
}

export function breadcrumbSchema(
  crumbs: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
