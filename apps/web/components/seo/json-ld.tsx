import Script from "next/script";

const BASE_URL = "https://glitchgrab.dev";
const ORG_NAME = "Glitchgrab";

export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": ["Organization", "SoftwareApplication"],
    name: ORG_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    description:
      "Convert screenshots, production errors, and user complaints into well-structured GitHub issues. Powered by AI. Open source.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      description: "Free tier — 1 GitHub repo, unlimited reports",
    },
    author: {
      "@type": "Organization",
      name: "Navibyte Innovations Pvt. Ltd.",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${BASE_URL}/contact`,
      availableLanguage: ["English"],
    },
    sameAs: [
      "https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab",
    ],
  };
  return (
    <Script
      id="org-json-ld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return (
    <Script
      id="breadcrumb-json-ld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
