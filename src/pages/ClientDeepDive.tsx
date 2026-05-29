import { useParams }              from "react-router-dom";
import { ClientHeader }            from "../components/client/ClientHeader";
import { WrapperCards }            from "../components/client/WrapperCards";
import { PerformanceChart }        from "../components/client/PerformanceChart";
import { PerformancePeriodTable }  from "../components/client/PerformancePeriodTable";
import { HoldingsTable }           from "../components/client/HoldingsTable";
import { TransactionHistory }      from "../components/client/TransactionHistory";
import { PageShell }               from "../components/shared/PageShell";
import { useClient }               from "../hooks/useClient";

export default function ClientDeepDive() {
  const { clientId } = useParams<{ clientId: string }>();
  const { data: client, isLoading } = useClient(clientId!);

  if (isLoading || !client) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
          Loading client…
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        <ClientHeader client={client} />
        <WrapperCards clientId={clientId!} />
        <PerformancePeriodTable clientId={clientId!} />
        <PerformanceChart clientId={clientId!} />
        <HoldingsTable clientId={clientId!} />
        <TransactionHistory clientId={clientId!} />
      </div>
    </PageShell>
  );
}
