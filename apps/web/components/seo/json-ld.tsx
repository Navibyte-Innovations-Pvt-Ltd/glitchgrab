const BASE_URL = "https://glitchgrab.dev";
const ORG_NAME = "Glitchgrab";

export function FounderPersonJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Naresh Bhosale",
    jobTitle: "Founder & Developer",
    worksFor: {
      "@type": "Organization",
      name: "Navibyte Innovations Pvt. Ltd.",
      url: "https://navibyte.in",
    },
    knowsAbout: ["Next.js", "TypeScript", "Developer Tools", "GitHub Issues", "Bug Tracking"],
    nationality: { "@type": "Country", name: "India" },
    email: "bhosalenaresh73@gmail.com",
    url: BASE_URL,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    alternateName: "Glitchgrab by Navibyte Innovations",
    url: BASE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${BASE_URL}/logo.png`,
      width: 192,
      height: 192,
    },
    description:
      "Open-source developer tool that converts screenshots, production errors, and user bug reports into well-structured GitHub issues. Built for Next.js teams.",
    foundingDate: "2026",
    founder: {
      "@type": "Person",
      name: "Naresh Bhosale",
      jobTitle: "Founder",
      worksFor: { "@type": "Organization", name: "Navibyte Innovations Pvt. Ltd." },
    },
    parentOrganization: {
      "@type": "Organization",
      name: "Navibyte Innovations Pvt. Ltd.",
      url: "https://navibyte.in",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "bhosalenaresh73@gmail.com",
      url: `${BASE_URL}/contact`,
      availableLanguage: ["English"],
    },
    sameAs: [
      "https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab",
      "https://www.npmjs.com/package/glitchgrab",
      "https://glitchgrab.dev",
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebSiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ORG_NAME,
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/docs?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
  return (
    <script
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
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FAQJsonLd({
  faqs,
}: {
  faqs: { question: string; answer: string }[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function DemoVideoJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: "Glitchgrab Demo — Auto-create GitHub Issues from Next.js Errors",
    description:
      "45-second walkthrough showing how Glitchgrab captures a production error and automatically creates a structured GitHub issue with title, steps, labels, and severity.",
    thumbnailUrl: `${BASE_URL}/og-image.png`,
    contentUrl: "https://cdn.glitchgrab.dev/meta/Timeline.mp4",
    embedUrl: `${BASE_URL}/#how-it-works`,
    uploadDate: "2026-01-01",
    duration: "PT45S",
    publisher: {
      "@type": "Organization",
      name: ORG_NAME,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/logo.png` },
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function SdkProductJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: "glitchgrab npm package",
    description:
      "Drop-in Next.js SDK that auto-captures unhandled errors and turns them into structured GitHub issues. Supports Next.js 13, 14, and 15.",
    codeRepository: "https://github.com/Navibyte-Innovations-Pvt-Ltd/glitchgrab",
    programmingLanguage: "TypeScript",
    runtimePlatform: "Node.js",
    targetProduct: {
      "@type": "SoftwareApplication",
      name: "Glitchgrab",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free tier — unlimited reports, 1 GitHub repo",
      },
    },
    author: {
      "@type": "Organization",
      name: "Navibyte Innovations Pvt. Ltd.",
      url: "https://navibyte.in",
    },
    license: "https://opensource.org/licenses/MIT",
    url: "https://www.npmjs.com/package/glitchgrab",
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function HowToJsonLd({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
