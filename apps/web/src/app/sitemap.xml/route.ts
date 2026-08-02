export const dynamic = "force-dynamic";

const publicRoutes = ["/", "/new", "/about", "/privacy", "/feedback", "/terms"] as const;

export function GET(): Response {
  const origin = getSiteOrigin();
  const now = new Date().toISOString();
  const urls = publicRoutes
    .map(
      (route) => `  <url>
    <loc>${escapeXml(new URL(route, origin).toString())}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${route === "/" ? "weekly" : "monthly"}</changefreq>
    <priority>${route === "/" ? "1.0" : "0.7"}</priority>
  </url>`
    )
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8"
    }
  });
}

function getSiteOrigin(): string {
  const configuredUrl = process.env.APP_BASE_URL?.trim();

  if (configuredUrl !== undefined && configuredUrl.length > 0) {
    return configuredUrl;
  }

  return "https://schedule.tonimakes.com";
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
