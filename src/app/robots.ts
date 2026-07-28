import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

const base = site.url.replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

/** 静的書き出し（output: "export"）でこのルートを事前生成するため。 */
export const dynamic = "force-static";
