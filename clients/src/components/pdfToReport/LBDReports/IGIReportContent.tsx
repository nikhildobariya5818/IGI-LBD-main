/* eslint-disable @typescript-eslint/no-explicit-any */
import { View, Page, Image, StyleSheet } from "@react-pdf/renderer";
import LBDReportPDFSection1 from "./LBDReportPDFSection1";
import LBDReportPDFSection2 from "./LBDReportPDFSection2";
import LBDReportPDFSection3 from "./LBDReportPDFSection3";
import LBDReportPDFSection4 from "./LBDReportPDFSection4";
import LBDReportPDFSection5 from "./LBDReportPDFSection5";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    position: "relative",
    width: "1008px",
    height: "612px",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0.3,
    zIndex: 0,
  },
  contentWrapper: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    height: "100%",
  },
  section: {
    marginBottom: 15,
  },
});

export default function IGIReportContent({ data, backgroundImage }: any) {
  return (
    <Page size={[1008, 612]} style={styles.page}>
      {/* Background Image */}
      {backgroundImage && (
        <Image
          src={backgroundImage}
          style={styles.backgroundImage}
        />
      )}

      {/* Main Content */}
      <View style={styles.contentWrapper}>
        {/* Section 1: Data */}
        <View style={styles.section}>
          <LBDReportPDFSection1 data={data} />
        </View>

        {/* Section 2: Clarity Characteristics Image */}
        <View style={styles.section}>
          <LBDReportPDFSection2 data={data} />
        </View>

        {/* Section 3: Color Clarity Chart Image */}
        <View style={styles.section}>
          <LBDReportPDFSection3 data={data} />
        </View>

        {/* Section 4: Additional Data */}
        <View style={styles.section}>
          <LBDReportPDFSection4 data={data} />
        </View>

        {/* Section 5: QR Code & Proportions */}
        <View style={styles.section}>
          <LBDReportPDFSection5 data={data} />
        </View>
      </View>
    </Page>
  );
}
