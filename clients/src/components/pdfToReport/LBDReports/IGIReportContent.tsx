/* eslint-disable @typescript-eslint/no-explicit-any */
import { Page, View, StyleSheet } from "@react-pdf/renderer";
import LBDReportPDFSection1 from "./LBDReportPDFSection1";
import LBDReportPDFSection2 from "./LBDReportPDFSection2";
import LBDReportPDFSection3 from "./LBDReportPDFSection3";
import LBDReportPDFSection4 from "./LBDReportPDFSection4";
import LBDReportPDFSection5 from "./LBDReportPDFSection5";

const styles = StyleSheet.create({
  page: {
    width: 1008,
    height: 612,
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: "#fff",
    flexDirection: "column",
  },
  container: {
    flex: 1,
    flexDirection: "column",
  },
});

export default function IGIReportContent({ data, backgroundImage }: any) {
  return (
    <Page size={[1008, 612]} style={styles.page}>
      <View style={styles.container}>
        <LBDReportPDFSection1 data={data} />
        <LBDReportPDFSection2 data={data} />
        <LBDReportPDFSection3 data={data} />
        <LBDReportPDFSection4 data={data} />
        <LBDReportPDFSection5 data={data} />
      </View>
    </Page>
  );
}
