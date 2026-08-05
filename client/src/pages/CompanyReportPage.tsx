/**
 * CompanyReportPage — wrapper that loads the default event and renders CompanyReport.
 */
import { trpc } from "@/lib/trpc";
import CompanyReport from "@/pages/CompanyReport";
import { Loader2 } from "lucide-react";

export default function CompanyReportPage() {
  const { data: event, isLoading } = trpc.event.getDefault.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f5ef] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#c8bfb0]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#f8f5ef] flex items-center justify-center">
        <p className="text-[#b0a89e] text-sm">Evento não encontrado.</p>
      </div>
    );
  }

  return <CompanyReport eventId={event.id} />;
}
