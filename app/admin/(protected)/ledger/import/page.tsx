import { CsvImporter } from "@/components/csv-importer";
import { BackLink, PageHeader, Panel } from "@/components/ui";

export default function LedgerImportPage() {
  return <div className="grid gap-8"><div><BackLink href="/admin/ledger">Back to ledger</BackLink><div className="mt-5"><PageHeader eyebrow="Bank reconciliation" title="Import CSV" intro="Map the bank columns, review reference matches, then confirm. The importer never commits a guess." /></div></div><Panel><CsvImporter /></Panel></div>;
}
