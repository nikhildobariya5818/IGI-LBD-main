/* eslint-disable @typescript-eslint/no-explicit-any */

import { View, Text, StyleSheet, Image } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  
  // Left column (proportions and grading info)
  leftColumn: {
    position: "absolute",
    left: 20,
    top: 150,
    width: 300,
  },
  
  // Right column (report details and info)
  rightColumn: {
    position: "absolute",
    right: 20,
    top: 60,
    width: 300,
  },
  
  // Client name section
  clientNameSection: {
    position: "absolute",
    bottom: 30,
    left: 20,
    width: 400,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    padding: 8,
    borderRadius: 2,
  },

  // Section title
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#000",
  },

  // Section subtitle
  sectionSubtitle: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },

  // Data row
  dataRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    fontSize: 8,
    color: "#333",
  },

  // Label
  label: {
    fontWeight: "bold",
    color: "#000",
    flex: 1,
  },

  // Value
  value: {
    color: "#333",
    flex: 1,
    textAlign: "right",
  },

  // Divider
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
    marginVertical: 4,
  },

  // Client name highlight
  clientNameText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 2,
  },

  // Proportions diagram area
  proportionsArea: {
    position: "absolute",
    bottom: 80,
    left: 80,
    width: 120,
    height: 120,
    borderWidth: 0.5,
    borderColor: "#999",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  proportionsImage: {
    width: 100,
    height: 100,
  },

  // QR Code area
  qrcodeArea: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 80,
    height: 80,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  qrcodeImage: {
    width: 70,
    height: 70,
  },

  // Measurements section
  measurementsSection: {
    marginBottom: 4,
  },

  // Grading results section
  gradingSection: {
    marginBottom: 4,
  },

  // Additional info section
  additionalSection: {
    marginBottom: 4,
  },
})

interface IGIReportData {
  ReportNumber?: string
  ReportDate?: string
  CaratWeight?: string
  ColorGrade?: string
  ClarityGrade?: string
  CutGrade?: string
  ShapeandCuttingStyle?: string
  Measurements?: string
  Polish?: string
  Symmetry?: string
  Fluorescence?: string
  clientName?: string
  Images?: {
    Proportions?: string
    QRCode?: string
  }
  [key: string]: any
}

interface IGIReportContentProps {
  data: IGIReportData
}

const IGIReportContent: React.FC<IGIReportContentProps> = ({ data }) => {
  return (
    <View style={styles.container}>
      {/* LEFT COLUMN - Proportions and Basic Grading Info */}
      <View style={styles.leftColumn}>
        <Text style={styles.sectionTitle}>PROPORTIONS</Text>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Shape & Cutting</Text>
          <Text style={styles.value}>{data.ShapeandCuttingStyle || "N/A"}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Measurements</Text>
          <Text style={styles.value}>{data.Measurements || "N/A"}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>GRADING RESULTS</Text>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Carat Weight</Text>
          <Text style={styles.value}>{data.CaratWeight || "N/A"}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Color Grade</Text>
          <Text style={styles.value}>{data.ColorGrade || "N/A"}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Clarity Grade</Text>
          <Text style={styles.value}>{data.ClarityGrade || "N/A"}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Cut Grade</Text>
          <Text style={styles.value}>{data.CutGrade || "N/A"}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>ADDITIONAL GRADING INFO</Text>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Polish</Text>
          <Text style={styles.value}>{data.Polish || "N/A"}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Symmetry</Text>
          <Text style={styles.value}>{data.Symmetry || "N/A"}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Fluorescence</Text>
          <Text style={styles.value}>{data.Fluorescence || "N/A"}</Text>
        </View>
      </View>

      {/* RIGHT COLUMN - Report Details */}
      <View style={styles.rightColumn}>
        <Text style={styles.sectionTitle}>REPORT INFORMATION</Text>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Report Number</Text>
          <Text style={styles.value}>{data.ReportNumber || "N/A"}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Report Date</Text>
          <Text style={styles.value}>{data.ReportDate || "N/A"}</Text>
        </View>
      </View>

      {/* PROPORTIONS DIAGRAM */}
      {data.Images?.Proportions && (
        <View style={styles.proportionsArea}>
          <Image src={data.Images.Proportions} style={styles.proportionsImage} />
        </View>
      )}

      {/* CLIENT NAME SECTION */}
      {data.clientName && (
        <View style={styles.clientNameSection}>
          <Text style={styles.clientNameText}>Client: {data.clientName}</Text>
          <Text style={{ fontSize: 7, color: "#666" }}>
            LBD Diamonds Report - Generated {new Date().toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* QR CODE */}
      {data.Images?.QRCode && (
        <View style={styles.qrcodeArea}>
          <Image src={data.Images.QRCode} style={styles.qrcodeImage} />
        </View>
      )}
    </View>
  )
}

export default IGIReportContent
