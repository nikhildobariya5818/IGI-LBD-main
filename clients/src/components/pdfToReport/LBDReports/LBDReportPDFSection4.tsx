/* eslint-disable @typescript-eslint/no-explicit-any */
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { baseFont, commonStyles } from "../PDFStyles";

const styles = StyleSheet.create({
  fieldLabel: {
    fontFamily: baseFont,
    fontWeight: "normal",
    fontSize: 9,
    color: "#333",
    letterSpacing: "-0.20",
  },
  fieldValue: {
    fontFamily: baseFont,
    fontWeight: "bold",
    fontSize: 9,
    color: "#4B4B4D",
    textAlign: "right",
    letterSpacing: "-0.20",
  },
  separator: {
    flexGrow: 1,
    borderBottom: "1px dotted #686869",
    marginHorizontal: "3px",
    height: 10,
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: "3.5px",
    width: "100%",
  },
  sectionTitle: {
    fontFamily: baseFont,
    fontWeight: "bold",
    fontSize: 11,
    color: "#333",
    marginTop: 15,
    marginBottom: 8,
    letterSpacing: "-0.20",
  },
});

export default function LBDReportPDFSection4({ data }: any) {
  const additional = data.ADDITIONALGRADINGINFORMATION || {};
  const report = data.GIANATURALDIAMONDGRADINGREPORT || {};

  return (
    <View style={{ left: "5px" }}>
      {/* Additional Information Section */}
      <Text style={styles.sectionTitle}>Additional Grading Information</Text>

      {/* Comments if available */}
      {additional.comments && (
        <View style={commonStyles.fieldRow}>
          <Text style={styles.fieldLabel}>Comments</Text>
          <View style={styles.separator} />
          <Text style={styles.fieldValue}>{additional.comments}</Text>
        </View>
      )}

      {/* Key Characteristics */}
      <View style={commonStyles.fieldRow}>
        <Text style={styles.fieldLabel}>Type</Text>
        <View style={styles.separator} />
        <Text style={styles.fieldValue}>{data.reportType || "Natural Diamond"}</Text>
      </View>

      {/* Report Information */}
      <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Report Information</Text>

      <View style={commonStyles.fieldRow}>
        <Text style={styles.fieldLabel}>Report Date</Text>
        <View style={styles.separator} />
        <Text style={styles.fieldValue}>{data.ReportDate}</Text>
      </View>

      <View style={commonStyles.fieldRow}>
        <Text style={styles.fieldLabel}>Lab Grown</Text>
        <View style={styles.separator} />
        <Text style={styles.fieldValue}>{report.isLabGrown ? "Yes" : "No"}</Text>
      </View>
    </View>
  );
}
