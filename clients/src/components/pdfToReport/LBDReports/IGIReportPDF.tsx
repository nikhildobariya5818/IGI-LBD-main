/* eslint-disable @typescript-eslint/no-explicit-any */

import { Document, PDFViewer, Font } from "@react-pdf/renderer"
import IGIReportContent from "./IGIReportContent"

// Register fonts
const dinProRegular = "/fonts/DINPro-Light_13935.ttf"
const dinProBold = "/fonts/DINPro-Medium_13936.ttf"

Font.register({
  family: "DINPro",
  fonts: [
    {
      src: dinProRegular,
      fontWeight: "normal",
    },
    {
      src: dinProBold,
      fontWeight: "bold",
    },
  ],
})

Font.register({
  family: "OCR",
  src: "/fonts/OCR-a___.ttf",
})

Font.register({
  family: "Helvetica-Light",
  src: "/fonts/Helvetica-Light.ttf",
  fontWeight: "light",
})

Font.registerHyphenationCallback((word) => {
  return [word]
})

interface IGIReportPDFProps {
  data: any
  clientName?: string
  backgroundImage?: string
}

const IGIReportPDF: React.FC<IGIReportPDFProps> = ({ data, clientName, backgroundImage }) => {
  return (
    <PDFViewer style={{ width: "100%", height: "100vh" }}>
      <Document>
        <IGIReportContent 
          data={{ ...data, clientName }} 
          backgroundImage={backgroundImage || "/images/igi-report-template.jpg"}
        />
      </Document>
    </PDFViewer>
  )
}

export default IGIReportPDF
