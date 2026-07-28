import type { Metadata } from "next";

// Internal tool, not public content — /admin/poster is password-gated at
// the submit action but the page itself was previously indexable under the
// root layout's generic title/description with no noindex directive.
// Applies to any future /admin/* route too.
export const metadata: Metadata = {
  title: "Admin — PulseNews",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
