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
    softwareVersion: "1.26.0",
    license: "https://opensource.org/licenses/MIT",
    featureList: [
      "Automatic production error capture",
      "AI-powered GitHub issue generation",
      "Semantic deduplication",
      "Screenshot-to-issue conversion",
      "GitHub integration",
      "Next.js SDK",
      "Mobile app with share intent",
    ],
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        description: "Free tier — 1 GitHub repo, unlimited reports",
      },
      {
        "@type": "Offer",
        price: "199",
        priceCurrency: "INR",
        description: "Pro plan — multiple repos, BYOK AI keys",
      },
    ],
    author: {
      "@type": "Organization",
      name: "Navibyte Innovations Pvt. Ltd.",
      url: SITE_URL,
    },
    sameAs: [
      "https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab",
      "https://www.npmjs.com/package/glitchgrab",
    ],
  };
}
