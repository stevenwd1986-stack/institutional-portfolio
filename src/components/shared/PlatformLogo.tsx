import { useQuery } from "@tanstack/react-query";
import { FileText }  from "lucide-react";

const BRANDFETCH_KEY = import.meta.env.VITE_BRANDFETCH_API_KEY as string | undefined;

const PLATFORM_DOMAINS: Record<string, string> = {
  TRANSACT:        "transact.co.uk",
  FINIO:           "finio.co.uk",
  NOVIA:           "novia.co.uk",
  QUILTER:         "quilter.com",
  RL360:           "rl360.com",
  "CANADA LIFE":   "canadalife.co.uk",
  "STANDARD LIFE": "standardlife.co.uk",
  AVIVA:           "aviva.co.uk",
  ABRDN:           "abrdn.com",
  NUCLEUS:         "nucleusfinancial.com",
  AEGON:           "aegon.co.uk",
  ZURICH:          "zurich.co.uk",
  "OLD MUTUAL":    "oldmutualwealth.co.uk",
};

const logoUrlCache = new Map<string, string | null>();

async function fetchBrandfetchLogo(domain: string): Promise<string | null> {
  if (logoUrlCache.has(domain)) return logoUrlCache.get(domain)!;
  if (!BRANDFETCH_KEY) return null;

  try {
    const res = await fetch(`https://api.brandfetch.io/v2/brands/${domain}`, {
      headers: { Authorization: `Bearer ${BRANDFETCH_KEY}` },
    });
    if (!res.ok) { logoUrlCache.set(domain, null); return null; }

    const json = await res.json();
    const logos: any[] = json.logos ?? [];

    const target = logos.find((l) => l.type === "icon") ?? logos[0];
    if (!target) { logoUrlCache.set(domain, null); return null; }

    const formats: any[] = target.formats ?? [];
    const src =
      (formats.find((f) => f.format === "svg") ??
       formats.find((f) => f.format === "png") ??
       formats[0])?.src ?? null;

    logoUrlCache.set(domain, src);
    return src;
  } catch {
    logoUrlCache.set(domain, null);
    return null;
  }
}

export function usePlatformLogo(platform: string) {
  const domain = PLATFORM_DOMAINS[platform.toUpperCase()];
  return useQuery({
    queryKey:  ["platform-logo", domain ?? platform],
    queryFn:   () => (domain ? fetchBrandfetchLogo(domain) : Promise.resolve(null)),
    staleTime: 1000 * 60 * 60 * 24,
    enabled:   Boolean(domain),
  });
}

interface PlatformLogoProps {
  platform: string;
  size?:    number;
  /** Rendered when Brandfetch has no logo for this platform */
  fallback?: React.ReactNode;
}

export function PlatformLogo({ platform, size = 18, fallback }: PlatformLogoProps) {
  const { data: logoUrl } = usePlatformLogo(platform);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        width={size}
        height={size}
        className="rounded-sm shrink-0 object-contain"
        alt={platform}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }

  if (fallback) return <>{fallback}</>;

  return (
    <span
      className="shrink-0 rounded-md bg-slate-300 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <FileText className="text-white" style={{ width: size * 0.6, height: size * 0.6 }} />
    </span>
  );
}
