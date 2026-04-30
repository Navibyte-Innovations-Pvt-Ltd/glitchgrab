/** @type {import('next-sitemap').IConfig} */

const PRIVATE_PATHS = ["/dashboard", "/api", "/login", "/collaborate"];

const AI_BOTS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot",
  "anthropic-ai", "Claude-Web", "ClaudeBot",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot", "Applebot-Extended",
  "Bingbot", "Amazonbot", "DuckAssistBot",
  "cohere-ai", "CCBot", "Diffbot",
  "Meta-ExternalAgent", "FacebookBot",
  "YouBot", "Mistral-AI-User",
];

module.exports = {
  siteUrl: "https://glitchgrab.dev",
  generateRobotsTxt: true,
  exclude: [
    "/dashboard/*",
    "/api/*",
    "/login",
    "/collaborate/*",
  ],
  additionalPaths: async (config) => [
    await config.transform(config, "/llms.txt"),
    await config.transform(config, "/llms-full.txt"),
  ],
  robotsTxtOptions: {
    additionalSitemaps: ["https://glitchgrab.dev/sitemap.xml"],
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
