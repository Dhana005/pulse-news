// Reuses the root sitemap so /ta/sitemap.xml (linked from elsewhere) and
// /sitemap.xml stay in sync automatically — there's only one edition of the
// site right now, so both should list the same URLs.
export { default } from "../sitemap";
