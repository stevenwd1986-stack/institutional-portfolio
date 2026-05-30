import { FileText } from "lucide-react";

function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

// ── Platform → domain ─────────────────────────────────────────────────────────

const PLATFORM_DOMAINS: Record<string, string> = {
  // ── Wrap / adviser platforms ────────────────────────────────────────────────
  TRANSACT:                  "transact.co.uk",
  FINIO:                     "finio.co.uk",
  NUCLEUS:                   "nucleusfinancial.com",
  NOVIA:                     "novia.co.uk",
  QUILTER:                   "quilter.com",
  PRAEMIUM:                  "praemium.com",
  RAYMOND_JAMES:             "raymondjames.co.uk",
  "RAYMOND JAMES":           "raymondjames.co.uk",
  PARMENION:                 "parmenion.co.uk",
  TATTON:                    "tattonam.com",
  "7IM":                     "7im.co.uk",
  COPIA:                     "copiacapital.co.uk",
  WEALTHTIME:                "wealthtime.co.uk",
  SANLAM:                    "sanlam.co.uk",
  ALLIANCE:                  "alliancetrust.co.uk",
  ABRDN:                     "abrdn.com",

  // ── D2C / execution-only platforms ─────────────────────────────────────────
  "HARGREAVES LANSDOWN":     "hl.co.uk",
  HL:                        "hl.co.uk",
  "AJ BELL":                 "ajbell.co.uk",
  AJBELL:                    "ajbell.co.uk",
  "INTERACTIVE INVESTOR":    "ii.co.uk",
  II:                        "ii.co.uk",
  VANGUARD:                  "vanguard.co.uk",
  FIDELITY:                  "fidelity.co.uk",
  "FIDELITY ADVISER":        "fidelity.co.uk",
  BESTINVEST:                "bestinvest.co.uk",
  "CHARLES STANLEY":         "charlesstanley.co.uk",
  "CHARLES STANLEY DIRECT":  "charlesstanley.co.uk",
  CAVENDISH:                 "cavendishonline.co.uk",
  IWEB:                      "iweb-sharedealing.co.uk",
  SHARE:                     "share.com",
  FREETRADE:                 "freetrade.io",
  TRADING212:                "trading212.com",
  "TRADING 212":             "trading212.com",
  ETORO:                     "etoro.com",

  // ── SIPP / SSAS specialists ─────────────────────────────────────────────────
  "JAMES HAY":               "jameshay.co.uk",
  SIPPDEAL:                  "sippdeal.co.uk",
  "BARNETT WADDINGHAM":      "barnettwaddingham.co.uk",
  TALBOT:                    "talbotandmuir.co.uk",
  "TALBOT & MUIR":           "talbotandmuir.co.uk",
  DENTONS:                   "dentonspensiontrust.co.uk",
  "A J BELL SIPP":           "ajbell.co.uk",
  "SUFFOLK LIFE":            "suffolklife.co.uk",
  "ROWANMOOR":               "rowanmoor.co.uk",
  "XAFINITY":                "xafinity.com",
  HORNBUCKLE:                "hornbuckle.co.uk",

  // ── Life & pension insurers ─────────────────────────────────────────────────
  AVIVA:                     "aviva.co.uk",
  "LEGAL & GENERAL":         "legalandgeneral.com",
  "L&G":                     "legalandgeneral.com",
  "STANDARD LIFE":           "standardlife.co.uk",
  "SCOTTISH WIDOWS":         "scottishwidows.co.uk",
  REASSURE:                  "reassure.co.uk",
  PHOENIX:                   "phoenixgroup.com",
  "PHOENIX GROUP":           "phoenixgroup.com",
  "ROYAL LONDON":            "royallondon.com",
  AEGON:                     "aegon.co.uk",
  ZURICH:                    "zurich.co.uk",
  "CANADA LIFE":             "canadalife.co.uk",
  RL360:                     "rl360.com",
  "OLD MUTUAL":              "oldmutualwealth.co.uk",
  "OLD MUTUAL WEALTH":       "oldmutualwealth.co.uk",
  "UTMOST":                  "utmostinternational.com",
  "UTMOST INTERNATIONAL":    "utmostinternational.com",
  VITALITY:                  "vitality.co.uk",
  "VITALITY INVEST":         "vitality.co.uk",
  "LV=":                     "lv.com",
  LV:                        "lv.com",
  "LIVERPOOL VICTORIA":      "lv.com",
  "SUN LIFE":                "sunlife.co.uk",
  "SUN LIFE FINANCIAL":      "sunlife.co.uk",
  METLIFE:                   "metlife.co.uk",
  "CLERICAL MEDICAL":        "clericalmedical.co.uk",
  ZURICHLIFE:                "zurich.co.uk",
  "FRIENDS LIFE":            "aviva.co.uk",
  "FRIENDS PROVIDENT":       "aviva.co.uk",
  "GUARDIAN FINANCIAL":      "guardianfinancial.co.uk",
  GUARDIAN:                  "guardianfinancial.co.uk",
  ONELIFE:                   "onelife.co.uk",
  "SCOTTISH EQUITABLE":      "aegon.co.uk",
  "SCOTTISH LIFE":           "royallondon.com",
  "PRUDENTIAL":              "prudential.co.uk",
  PRU:                       "prudential.co.uk",
  NFU:                       "nfumutual.co.uk",
  "NFU MUTUAL":              "nfumutual.co.uk",
  "WESLEYAN":                "wesleyan.co.uk",
  "NATIONAL FRIENDLY":       "nationalfriendly.co.uk",

  // ── Workplace / master trust providers ─────────────────────────────────────
  NEST:                      "nestpensions.org.uk",
  "PEOPLES PENSION":         "thepeoplespension.co.uk",
  "THE PEOPLES PENSION":     "thepeoplespension.co.uk",
  "NOW PENSIONS":            "nowpensions.com",
  "NOW:PENSIONS":            "nowpensions.com",
  SMART:                     "smartpension.co.uk",
  "SMART PENSION":           "smartpension.co.uk",
  "CUSHON":                  "cushon.co.uk",
  SALVUS:                    "salvusmastertrustpension.co.uk",
  "ATLAS MASTER TRUST":      "atlasmastertrust.co.uk",

  // ── Offshore / international bonds ─────────────────────────────────────────
  "HANSARD":                 "hansard.com",
  GENERALI:                  "generali.com",
  "CLERICAL MEDICAL INT":    "clericalmedical.co.uk",
  "ZURICH INTERNATIONAL":    "zurichinternational.com",
  "CANADA LIFE INTERNATIONAL": "canadalifeinternational.com",
  "SCOTTISH WIDOWS INTERNATIONAL": "scottishwidows.co.uk",

  // ── Discretionary fund managers ────────────────────────────────────────────
  QUILTERCHEVIOT:            "quiltercheviot.com",
  "QUILTER CHEVIOT":         "quiltercheviot.com",
  "BREWIN DOLPHIN":          "brewin.co.uk",
  "EVELYN PARTNERS":         "evelynpartners.com",
  "SMITH & WILLIAMSON":      "evelynpartners.com",
  RATHBONES:                 "rathbones.com",
  "CHARLES STANLEY DFM":     "charlesstanley.co.uk",
  CAZENOVE:                  "cazenovecapital.com",
  "CAZENOVE CAPITAL":        "cazenovecapital.com",
  "INVESTEC":                "investec.com",
  CANACCORD:                 "canaccord.com",
  "CANACCORD GENUITY":       "canaccord.com",
  "JM FINN":                 "jmfinn.com",
  SARASIN:                   "sarasinandpartners.com",
  "SARASIN & PARTNERS":      "sarasinandpartners.com",
  PSIGMA:                    "psigma.com",
  "P1 INVESTMENT":           "p1investmentmanagement.co.uk",
};

// ── Fund manager → domain (matched against the start of instrument name) ──────

// Ordered longest-first so "Baillie Gifford" matches before "Bail"
const FUND_MANAGER_PREFIXES: [string, string][] = [
  // ── UK active managers ────────────────────────────────────────────────────
  ["baillie gifford",                "bailliegifford.com"],
  ["janus henderson",                "janushenderson.com"],
  ["columbia threadneedle",          "columbiathreadneedle.co.uk"],
  ["legal & general",                "legalandgeneral.com"],
  ["premier miton",                  "premiermiton.com"],
  ["polar capital",                  "polarcapital.co.uk"],
  ["royal london",                   "royallondon.com"],
  ["standard life",                  "standardlife.co.uk"],
  ["charles stanley",                "charlesstanley.co.uk"],
  ["evelyn partners",                "evelynpartners.com"],
  ["smith & williamson",             "evelynpartners.com"],
  ["close brothers asset",           "closebrothersam.com"],
  ["close brothers",                 "closebrothersam.com"],
  ["aegon asset management",         "aegon.co.uk"],
  ["kames capital",                  "aegon.co.uk"],
  ["quilter investors",              "quilter.com"],
  ["old mutual global",              "quilter.com"],
  ["twenty four",                    "twentyfourassetmanagement.com"],
  ["twentyfour",                     "twentyfourassetmanagement.com"],
  ["findlay park",                   "findlaypark.com"],
  ["church house",                   "churchhouseinvest.com"],
  ["aspect capital",                 "aspectcapital.com"],
  ["colchester global",              "colchesterglobal.com"],
  ["ninety one",                     "ninetyone.com"],
  ["man group",                      "man.com"],
  ["man glg",                        "man.com"],
  ["man numeric",                    "man.com"],
  ["rbc bluebay",                    "bluebay.com"],
  ["insight investment",             "insightinvestment.com"],
  ["bny mellon investment",          "bnymellon.com"],
  ["newton investment",              "newtonim.com"],
  ["cazenove",                       "cazenovecapital.com"],
  ["lazard",                         "lazard.com"],
  ["threadneedle",                   "columbiathreadneedle.co.uk"],
  ["veritas",                        "veritasam.com"],
  ["troy",                           "troyassetmanagement.com"],
  ["cgwm",                           "canaccord.com"],
  ["canaccord",                      "canaccord.com"],
  ["ruffer",                         "ruffer.co.uk"],
  ["evenlode",                       "evenlodeinvestment.com"],
  ["marlborough",                    "marlboroughfunds.com"],
  ["montanaro",                      "montanaro.co.uk"],
  ["waverton",                       "waverton.co.uk"],
  ["impax",                          "impaxam.com"],
  ["sanditon",                       "sanditon-am.com"],
  ["foresight",                      "foresightgroup.co.uk"],
  ["psigma",                         "psigma.com"],
  ["tatton",                         "tattonam.com"],
  ["majedie",                        "majedie.com"],
  ["thesis",                         "taml.co.uk"],
  ["henderson",                      "janushenderson.com"],
  ["sarasin",                        "sarasinandpartners.com"],
  ["rathbone",                       "rathbones.com"],
  ["colchester",                     "colchesterglobal.com"],
  ["wesleyan",                       "wesleyan.co.uk"],
  ["liontrust",                      "liontrust.co.uk"],
  ["artemis",                        "artemisfunds.com"],
  ["fundsmith",                      "fundsmith.co.uk"],
  ["jupiter",                        "jupiteram.com"],

  // ── Passive / index / ETF providers ──────────────────────────────────────
  ["dimensional",                    "dimensional.com"],
  ["blackrock",                      "blackrock.com"],
  ["ishares",                        "ishares.com"],
  ["vanguard",                       "vanguard.co.uk"],
  ["spdr",                           "ssga.com"],
  ["state street",                   "ssga.com"],
  ["xtrackers",                      "dws.com"],
  ["lyxor",                          "amundi.com"],
  ["wisdomtree",                     "wisdomtree.com"],
  ["wisdom tree",                    "wisdomtree.com"],
  ["vaneck",                         "vaneck.com"],
  ["van eck",                        "vaneck.com"],
  ["hanetf",                         "hanetf.com"],
  ["ossiam",                         "ossiam.com"],
  ["tabula",                         "tabulainvestment.com"],
  ["graniteshares",                  "graniteshares.com"],
  ["leverage shares",                "leverageshares.com"],
  ["global x",                       "globalxetfs.eu"],
  ["rize",                           "rize-etf.com"],

  // ── Global asset managers ─────────────────────────────────────────────────
  ["allianz global investors",       "allianzgi.com"],
  ["bnp paribas asset management",   "bnpparibas-am.com"],
  ["jpmorgan asset management",      "jpmorgan.com"],
  ["jp morgan asset management",     "jpmorgan.com"],
  ["morgan stanley investment",      "morganstanley.com"],
  ["goldman sachs asset",            "goldmansachs.com"],
  ["franklin templeton",             "franklintempleton.com"],
  ["federated hermes",               "federatedhermes.com"],
  ["first sentier investors",        "firstsentier.com"],
  ["first state investments",        "firstsentier.com"],
  ["first sentier",                  "firstsentier.com"],
  ["first state",                    "firstsentier.com"],
  ["neuberger berman",               "nb.com"],
  ["loomis sayles",                  "loomissayles.com"],
  ["capital group",                  "capitalgroup.com"],
  ["t. rowe price",                  "troweprice.com"],
  ["t rowe price",                   "troweprice.com"],
  ["walter scott",                   "walter-scott.co.uk"],
  ["william blair",                  "williamblair.com"],
  ["fidelity",                       "fidelity.co.uk"],
  ["schroders",                      "schroders.com"],
  ["invesco",                        "invesco.com"],
  ["m&g",                            "mandg.com"],
  ["hsbc",                           "hsbc.co.uk"],
  ["aberdeen",                       "abrdn.com"],
  ["abrdn",                          "abrdn.com"],
  ["aviva",                          "aviva.co.uk"],
  ["l&g",                            "legalandgeneral.com"],
  ["rl360",                          "rl360.com"],
  ["templeton",                      "franklintempleton.com"],
  ["jpmorgan",                       "jpmorgan.com"],
  ["jp morgan",                      "jpmorgan.com"],
  ["jpm",                            "jpmorgan.com"],
  ["morgan stanley",                 "morganstanley.com"],
  ["goldman sachs",                  "goldmansachs.com"],
  ["bnp paribas",                    "bnpparibas-am.com"],
  ["carmignac",                      "carmignac.com"],
  ["bluebay",                        "bluebay.com"],
  ["pictet",                         "pictet.com"],
  ["robeco",                         "robeco.com"],
  ["comgest",                        "comgest.com"],
  ["natixis",                        "im.natixis.com"],
  ["mirova",                         "mirova.com"],
  ["nordea",                         "nordea.com"],
  ["amundi",                         "amundi.com"],
  ["barings",                        "barings.com"],
  ["nuveen",                         "nuveen.com"],
  ["pimco",                          "pimco.com"],
  ["pgim",                           "pgim.com"],
  ["orbis",                          "orbis.com"],
  ["hermes",                         "federatedhermes.com"],
  ["winton",                         "winton.com"],
  ["blackstone",                     "blackstone.com"],
  ["vontobel",                       "vontobel.com"],
  ["skagen",                         "skagenfunds.com"],
  ["eastspring",                     "eastspring.com"],
  ["alquity",                        "alquity.com"],
  ["gam",                            "gam.com"],
  ["ubs",                            "ubs.com"],
  ["dws",                            "dws.com"],

  // ── Infrastructure / alternatives ─────────────────────────────────────────
  ["greencoat",                      "greencoat.com"],
  ["hicl",                           "hicl.com"],
  ["3i infrastructure",              "3i.com"],
  ["3i",                             "3i.com"],
  ["bbgi",                           "bbgi.com"],
  ["sequoia economic",               "sequoia.fund"],
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

// ── PlatformLogo ──────────────────────────────────────────────────────────────

export function usePlatformLogo(platform: string): { data: string | null } {
  const domain = PLATFORM_DOMAINS[platform.toUpperCase()];
  return { data: domain ? faviconUrl(domain) : null };
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

export function useFundManagerLogo(instrumentName: string): { data: string | null } {
  const domain = getFundManagerDomain(instrumentName);
  return { data: domain ? faviconUrl(domain) : null };
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
