const SITE_URL = "https://glitchgrab.dev";

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
