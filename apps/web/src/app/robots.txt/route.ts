export const dynamic = "force-dynamic";

export function GET(): Response {
  const body = [
    "User-agent: *",
    "Allow: /$",
    "Allow: /new$",
    "Allow: /about$",
    "Allow: /privacy$",
    "Allow: /contact$",
    "Allow: /feedback$",
    "Allow: /terms$",
    "Allow: /zh$",
    "Allow: /zh/new$",
    "Allow: /zh/about$",
    "Allow: /zh/privacy$",
    "Allow: /zh/contact$",
    "Allow: /zh/feedback$",
    "Allow: /zh/terms$",
    "Allow: /en$",
    "Allow: /en/new$",
    "Allow: /en/about$",
    "Allow: /en/privacy$",
    "Allow: /en/contact$",
    "Allow: /en/feedback$",
    "Allow: /en/terms$",
    "Allow: /ads.txt$",
    "Disallow: /api/",
    "Disallow: /s/",
    "Disallow: /zh/s/",
    "Disallow: /en/s/",
    "Disallow: /*?key=",
    `Sitemap: ${new URL("/sitemap.xml", getSiteOrigin()).toString()}`,
    ""
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8"
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
