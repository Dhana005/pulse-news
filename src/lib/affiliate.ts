// Amazon Associates — tagged search links only (no Product Advertising API
// access yet; that requires 3 qualifying sales within 180 days first, so
// there's no live product-data feed to pull from). Search links need no API
// and work immediately with just the associate tag.
//
// Scoped to the technology category only — it's the one category where
// product links are actually contextually relevant. Amazon's operating
// agreement requires affiliate links to be contextually relevant and
// requires a visible disclosure near them (see AmazonDealsCard), and
// Google's thin-affiliate-content policy penalizes exactly the pattern of
// links-without-relevance this scoping avoids.

export const AMAZON_ASSOCIATE_TAG = "nexivotek-21";

export interface AmazonSearchLink {
  label: string;
  query: string;
}

export const TECH_SEARCH_LINKS: AmazonSearchLink[] = [
  { label: "ஸ்மார்ட்போன்கள்", query: "smartphones" },
  { label: "லேப்டாப்", query: "laptops" },
  { label: "இயர்பட்ஸ்", query: "wireless earbuds" },
  { label: "ஸ்மார்ட் வாட்ச்", query: "smartwatches" },
  { label: "பவர் பேங்க்", query: "power bank" },
];

export function buildAmazonSearchUrl(query: string): string {
  const params = new URLSearchParams({ k: query, tag: AMAZON_ASSOCIATE_TAG });
  return `https://www.amazon.in/s?${params.toString()}`;
}
