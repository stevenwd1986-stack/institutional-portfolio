import { FirmAUMSummary }   from "../components/dashboard/FirmAUMSummary";
import { ClientTable }       from "../components/dashboard/ClientTable";
import { AlertsPanel }       from "../components/dashboard/AlertsPanel";
import { BatchReportRunner } from "../components/dashboard/BatchReportRunner";
import { PageShell }         from "../components/shared/PageShell";

export default function Dashboard() {
  return (
    <PageShell title="Adviser Dashboard">
      <div className="flex flex-col gap-6">
        <FirmAUMSummary />
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          <div className="flex flex-col gap-6">
            <ClientTable />
            <BatchReportRunner />
          </div>
          <AlertsPanel />
        </div>
      </div>
    </PageShell>
  );
}
