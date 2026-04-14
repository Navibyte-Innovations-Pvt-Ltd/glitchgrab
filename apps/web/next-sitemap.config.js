/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://glitchgrab.dev",
  generateRobotsTxt: true,
  exclude: [
    "/dashboard/*",
    "/api/*",
    "/login",
    "/collaborate/*",
  ],
  robotsTxtOptions: {
    additionalSitemaps: [
      "https://glitchgrab.dev/sitemap.xml",
    ],
    policies: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/dashboard", "/api", "/login", "/collaborate"] },
    ],
  },
};
