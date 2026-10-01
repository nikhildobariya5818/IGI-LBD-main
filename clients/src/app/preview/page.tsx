"use client";

import dynamic from "next/dynamic";
import IGIReportPDF from "@/components/pdfToReport/LBDReports/IGIReportPDF";
import type { LBDImageReportData } from "@/components/pdfToReport/LBDReports/IGIReportContent";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const lbdSampleData: LBDImageReportData = {
  page_width: 4200,
  page_height: 2550,
  cache_bust: Date.now(),
  image_urls: {
    page2: `${API_BASE_URL}/output/page2.png`,
    page3: `${API_BASE_URL}/output/page3.png`,
  },
};

const LBDPreviewPage = () => {
  return <IGIReportPDF data={lbdSampleData} backgroundImage="/igi-report-template.jpg" />;
};

export default dynamic(() => Promise.resolve(LBDPreviewPage), { ssr: false });
