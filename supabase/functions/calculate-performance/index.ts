import { createClient }   from "npm:@supabase/supabase-js@2";
import { corsHeaders }     from "../_shared/cors.ts";
import { calculateXIRR, calculateTWR, calculateCAGR } from "../_shared/performance.ts";

interface RequestBody {
  client_id: string;
  period?: "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";
}

interface WrapperSeries {
  wrapper_id:   string;
  wrapper_type: string;
  points: { date: string; value: number }[];
  metrics: {
    twr:  number | null;
    xirr: number | null;
    cagr: number | null;
  };
}

function periodStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case "1M":  return new Date(now.setMonth(now.getMonth() - 1));
    case "3M":  return new Date(now.setMonth(now.getMonth() - 3));
    case "6M":  return new Date(now.setMonth(now.getMonth() - 6));
    case "1Y":  return new Date(now.setFullYear(now.getFullYear() - 1));
    case "3Y":  return new Date(now.setFullYear(now.getFullYear() - 3));
    case "5Y":  return new Date(now.setFullYear(now.getFullYear() - 5));
    default:    return new Date("2000-01-01");
  }
}

function indexToBase100(points: { date: string; value: number }[]): { date: string; value: number }[] {
  if (!points.length) return [];
  const base = points[0].value;
  if (base === 0) return points;
  return points.map((p) => ({ date: p.date, value: (p.value / base) * 100 }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: RequestBody = await req.json();
    const { client_id, period = "1Y" } = body;

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: "client_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const periodStart = periodStartDate(period);
    const periodEnd   = new Date();

    // Fetch tax wrappers for this client
    const { data: wrappers, error: wErr } = await supabase
      .from("tax_wrappers")
      .select("id, wrapper_type")
      .eq("client_id", client_id)
      .eq("is_active", true);

    if (wErr) throw wErr;
    if (!wrappers?.length) {
      return new Response(
        JSON.stringify({ series: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: WrapperSeries[] = await Promise.all(
      wrappers.map(async (wrapper) => {
        // Fetch cached valuations for this wrapper in the period
        const { data: valuations } = await supabase
          .from("valuations")
          .select("valuation_date, market_value")
          .eq("tax_wrapper_id", wrapper.id)
          .gte("valuation_date", periodStart.toISOString().slice(0, 10))
          .lte("valuation_date", periodEnd.toISOString().slice(0, 10))
          .order("valuation_date", { ascending: true });

        // Fetch transactions for performance calculations
        const { data: txns } = await supabase
          .from("transactions")
          .select(
            `sub_accounts!inner(tax_wrapper_id),
             trade_date, net_amount, is_book_over, transaction_type`
          )
          .eq("sub_accounts.tax_wrapper_id", wrapper.id)
          .gte("trade_date", periodStart.toISOString().slice(0, 10))
          .lte("trade_date", periodEnd.toISOString().slice(0, 10))
          .order("trade_date", { ascending: true });

        const valPoints = (valuations ?? []).map((v) => ({
          date:  new Date(v.valuation_date),
          value: Number(v.market_value),
        }));

        const rawPoints = (valuations ?? []).map((v) => ({
          date:  v.valuation_date as string,
          value: Number(v.market_value),
        }));

        const cfEvents = (txns ?? []).map((t: Record<string, unknown>) => ({
          date:         new Date(t.trade_date as string),
          amount:       ["CONTRIBUTION", "TRANSFER_IN_CASH", "BUY"].includes(t.transaction_type as string)
                          ? -Number(t.net_amount)  // outflow from investor perspective
                          : Number(t.net_amount),
          is_book_over: Boolean(t.is_book_over),
        }));

        // XIRR: filter out book-overs, build cash-flow series ending with current value
        const xirrCFs = cfEvents
          .filter((cf) => !cf.is_book_over)
          .map((cf) => ({ date: cf.date, amount: cf.amount }));

        if (valPoints.length > 0) {
          xirrCFs.push({
            date:   valPoints[valPoints.length - 1].date,
            amount: valPoints[valPoints.length - 1].value,
          });
        }

        const twr  = valPoints.length >= 2 ? calculateTWR(valPoints, cfEvents, periodStart, periodEnd) : null;
        const xirr = calculateXIRR(xirrCFs);
        const cagr = valPoints.length >= 2
          ? calculateCAGR(valPoints[0].value, valPoints[valPoints.length - 1].value, periodStart, periodEnd)
          : null;

        // Cache updated valuations for any dates that don't exist yet
        // (omitted — would require a separate fetch to check which dates are new)

        return {
          wrapper_id:   wrapper.id,
          wrapper_type: wrapper.wrapper_type,
          points:       indexToBase100(rawPoints),
          metrics:      { twr, xirr, cagr },
        };
      })
    );

    return new Response(
      JSON.stringify({ series: results, period, calculated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("calculate-performance error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
