// Shared by articles-sitemap.xml (index) and articles-sitemap/[page]
// (per-shard content) — both need the exact same shard boundaries, so this
// lives in one place rather than being derived independently in each route.
//
// Fixed shard count rather than deriving page count from a live row count:
// an offset-based scheme (OFFSET N * pageSize, ORDER BY published_at) was
// tried first and hit Postgres's statement timeout at this table's size —
// there's no index supporting a global ORDER BY published_at, so deep
// OFFSET forced a full-table sort. Sharding by `id` (the primary key, always
// indexed) with a fixed shard count avoids that entirely: each shard is an
// indexed id-range scan, independent of table size or growth, and both
// routes computing the same fixed boundaries from a constant means they can
// never disagree the way they would if boundaries were derived from a row
// count that can change between the index route's request and a given
// page's request.
//
// 20 shards against ~66k articles (~3,300/shard) leaves generous headroom
// under the 50,000-URL sitemap spec limit even as the table grows;
// bump SHARD_COUNT later if it ever gets close.
export const SHARD_COUNT = 20;

const UUID_SPACE = BigInt(1) << BigInt(128);

function toUuid(n: bigint): string {
  const hex = n.toString(16).padStart(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// Half-open range [gte, lt) covering this shard's slice of the UUID space.
// lt is null for the last shard (upper bound is unrepresentable as a valid
// UUID, so that shard is queried with no upper bound instead).
export function shardBounds(shard: number): { gte: string; lt: string | null } {
  const gte = toUuid((UUID_SPACE * BigInt(shard)) / BigInt(SHARD_COUNT));
  const lt = shard === SHARD_COUNT - 1 ? null : toUuid((UUID_SPACE * BigInt(shard + 1)) / BigInt(SHARD_COUNT));
  return { gte, lt };
}
