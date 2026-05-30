import { ClientTable } from "../components/dashboard/ClientTable";
import { PageShell }   from "../components/shared/PageShell";

export default function Clients() {
  return (
    <PageShell title="Clients">
      <ClientTable />
    </PageShell>
  );
}
