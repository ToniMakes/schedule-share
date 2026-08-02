export const dynamic = "force-dynamic";

const googleSellerAccountId = "f08c47fec0942fa0";

export function GET(): Response {
  const publisherId = process.env.ADS_TXT_PUBLISHER_ID?.trim() ?? "";
  const body =
    publisherId.length > 0
      ? `google.com, ${publisherId}, DIRECT, ${googleSellerAccountId}\n`
      : "# ads.txt is not configured yet. Set ADS_TXT_PUBLISHER_ID after ad platform approval.\n";

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8"
    }
  });
}
