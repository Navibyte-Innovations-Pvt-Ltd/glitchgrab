/** @type {import('next-sitemap').IConfig} */

const PRIVATE_PATHS = ["/dashboard", "/api", "/login"];

const AI_BOTS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot",
  "anthropic-ai", "Claude-Web", "ClaudeBot",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot", "Applebot-Extended",
  "Bingbot", "Amazonbot", "DuckAssistBot",
  "cohere-ai", "CCBot", "Diffbot",
  "Meta-ExternalAgent", "FacebookBot",
  "YouBot", "Mistral-AI-User",
  "Bytespider",
];

// Pages that should rank high — high priority, weekly changefreq
const HIGH_PRIORITY_PATHS = ["/", "/features", "/docs"];

module.exports = {
  siteUrl: "https://glitchgrab.dev",
  generateRobotsTxt: true,
  exclude: [
    "/dashboard/*",
    "/api/*",
    "/login",
    "/llms-full.txt",
    "/sitemap.xml",
    "/sitemap-0.xml",
    "/connect/*",
    "/org/*",
  ],
  transform: async (config, path) => ({
    loc: path,
    changefreq: HIGH_PRIORITY_PATHS.includes(path) ? "weekly" : "monthly",
    priority: HIGH_PRIORITY_PATHS.includes(path) ? 0.9 : 0.7,
    lastmod: new Date().toISOString(),
    alternateRefs: [],
  }),
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      ...AI_BOTS.map((bot) => ({
        userAgent: bot,
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: PRIVATE_PATHS,
      })),
    ],
  },
};
