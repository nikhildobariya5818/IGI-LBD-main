import ReportProcessor from "@/components/pdfToReport/ReportProcessor";
import { Toaster } from "@/components/ui/sonner"
export default function Home() {
  return (
    <>
      <Toaster />
      <ReportProcessor />
    </>
  );
}
