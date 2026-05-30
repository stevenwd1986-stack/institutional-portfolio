import { useQuery } from "@tanstack/react-query";
import { FileText }  from "lucide-react";

const BRANDFETCH_KEY = import.meta.env.VITE_BRANDFETCH_API_KEY as string | undefined;

// ── Platform → domain ─────────────────────────────────────────────────────────

const PLATFORM_DOMAINS: Record<string, string> = {
  TRANSACT:           "transact.co.uk",
  FINIO:              "finio.co.uk",
  NOVIA:              "novia.co.uk",
  QUILTER:            "quilter.com",
  RL360:              "rl360.com",
  "CANADA LIFE":      "canadalife.co.uk",
  "STANDARD LIFE":    "standardlife.co.uk",
  "CHARLES STANLEY":  "charlesstanley.co.uk",
  "HARGREAVES LANSDOWN": "hl.co.uk",
  "AJ BELL":          "ajbell.co.uk",
  "JAMES HAY":        "jameshay.co.uk",
  AVIVA:              "aviva.co.uk",
  ABRDN:              "abrdn.com",
  NUCLEUS:            "nucleusfinancial.com",
  AEGON:              "aegon.co.uk",
  ZURICH:             "zurich.co.uk",
  "OLD MUTUAL":       "oldmutualwealth.co.uk",
  CAVENDISH:          "cavendishonline.co.uk",
  ALLIANCE:           "alliancetrust.co.uk",
};

// ── Fund manager → domain (matched against the start of instrument name) ──────

// Ordered longest-first so "Baillie Gifford" matches before "Bail"
const FUND_MANAGER_PREFIXES: [string, string][] = [
  ["baillie gifford",           "bailliegifford.com"],
  ["janus henderson",           "janushenderson.com"],
  ["columbia threadneedle",     "columbiathreadneedle.co.uk"],
  ["legal & general",           "legalandgeneral.com"],
  ["premier miton",             "premiermiton.com"],
  ["polar capital",             "polarcapital.co.uk"],
  ["royal london",              "royallondon.com"],
  ["standard life",             "standardlife.co.uk"],
  ["charles stanley",           "charlesstanley.co.uk"],
  ["dimensional",               "dimensional.com"],
  ["blackrock",                 "blackrock.com"],
  ["ishares",                   "ishares.com"],
  ["vanguard",                  "vanguard.co.uk"],
  ["fidelity",                  "fidelity.co.uk"],
  ["fundsmith",                 "fundsmith.co.uk"],
  ["artemis",                   "artemisfunds.com"],
  ["schroders",                 "schroders.com"],
  ["invesco",                   "invesco.com"],
  ["rathbone",                  "rathbones.com"],
  ["jupiter",                   "jupiteram.com"],
  ["liontrust",                 "liontrust.co.uk"],
  ["spdr",                      "ssga.com"],
  ["m&g",                       "mandg.com"],
  ["hsbc",                      "hsbc.co.uk"],
  ["aberdeen",                  "abrdn.com"],
  ["abrdn",                     "abrdn.com"],
  ["aviva",                     "aviva.co.uk"],
  ["l&g",                       "legalandgeneral.com"],
  ["rl360",                     "rl360.com"],
  ["cazenove",                  "cazenovecapital.com"],
  ["ninety one",                "ninetyone.com"],
  ["man group",                 "man.com"],
  ["lazard",                    "lazard.com"],
  ["threadneedle",              "columbiathreadneedle.co.uk"],
  ["veritas",                   "veritasam.com"],
  ["troy",                      "troyassetmanagement.com"],
  ["cgwm",                      "canaccord.com"],
  ["canaccord",                 "canaccord.com"],
  ["evelyn partners",           "evelynpartners.com"],
  ["smith & williamson",        "evelyn.com"],
];

export function getFundManagerDomain(instrumentName: string): string | null {
  const lower = instrumentName.toLowerCase();
  for (const [prefix, domain] of FUND_MANAGER_PREFIXES) {
    if (lower.startsWith(prefix) || lower.includes(` ${prefix}`) || lower.includes(`(${prefix}`)) {
      return domain;
    }
  }
  return null;
}

// ── Shared Brandfetch fetch + cache ───────────────────────────────────────────

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

// ── PlatformLogo ──────────────────────────────────────────────────────────────

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
  platform:  string;
  size?:     number;
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

// ── FundManagerLogo ───────────────────────────────────────────────────────────

// Deterministic colour from a string (for the initial fallback avatar)
function stringToColor(str: string): string {
  const PALETTE = [
    "#002147", "#1D4ED8", "#059669", "#D97706",
    "#7C3AED", "#DB2777", "#0891B2", "#65A30D",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function useFundManagerLogo(instrumentName: string) {
  const domain = getFundManagerDomain(instrumentName);
  return useQuery({
    queryKey:  ["fund-logo", domain ?? instrumentName],
    queryFn:   () => (domain ? fetchBrandfetchLogo(domain) : Promise.resolve(null)),
    staleTime: 1000 * 60 * 60 * 24,
    enabled:   Boolean(domain),
  });
}

interface FundManagerLogoProps {
  name: string;   // full instrument name, e.g. "iShares Core MSCI World ETF"
  size?: number;
}

export function FundManagerLogo({ name, size = 20 }: FundManagerLogoProps) {
  const { data: logoUrl } = useFundManagerLogo(name);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        width={size}
        height={size}
        className="rounded-sm shrink-0 object-contain"
        alt={name}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }

  // Coloured initial fallback
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  const bg      = stringToColor(name);
  return (
    <span
      className="shrink-0 rounded-md flex items-center justify-center text-white font-semibold select-none"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.5 }}
    >
      {initial}
    </span>
  );
}
