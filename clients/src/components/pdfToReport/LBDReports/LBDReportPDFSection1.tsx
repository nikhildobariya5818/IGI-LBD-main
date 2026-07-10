/* eslint-disable @typescript-eslint/no-explicit-any */
import { View, Text } from "@react-pdf/renderer";
import { baseFont, commonStyles } from "../PDFStyles";

export default function LBDReportPDFSection1({ data }: any) {
  const report = data.GIANATURALDIAMONDGRADINGREPORT || {};
  const grading = data.GRADINGRESULTS || {};
  const additional = data.ADDITIONALGRADINGINFORMATION || {};

  return (
    <View style={{ left: "5px" }}>
      {/* Report Date */}
      {data.ReportDate && (
        <Text
          style={{
            fontFamily: baseFont,
            fontWeight: "normal",
            fontSize: 9,
            color: "#333",
            marginBottom: "4px",
            letterSpacing: "-0.20",
          }}
        >
          {data.ReportDate}
        </Text>
      )}

      {/* Client Name */}
      <View style={commonStyles.fieldRow}>
        <Text style={commonStyles.fieldLabel}>Client Name</Text>
        <View style={commonStyles.separator} />
        <Text style={commonStyles.fieldValue}>{data.clientName}</Text>
      </View>

      {/* IGI Report Number */}
      <View style={commonStyles.fieldRow}>
        <Text style={commonStyles.fieldLabel}>IGI Report Number</Text>
        <View style={commonStyles.separator} />
        <Text style={commonStyles.fieldValue}>
          {report.GIAReportNumber}
        </Text>
      </View>

      {/* Shape and Cutting Style */}
      <View style={commonStyles.fieldRow}>
        <Text style={commonStyles.fieldLabel}>Shape and Cutting Style</Text>
        <View style={commonStyles.separator} />
        <Text style={commonStyles.fieldValue}>
          {report.ShapeandCuttingStyle}
        </Text>
      </View>

      {/* Measurements */}
      <View style={commonStyles.fieldRow}>
        <Text style={commonStyles.fieldLabel}>Measurements</Text>
        <View style={commonStyles.separator} />
        <Text style={commonStyles.fieldValue}>{report.Measurements}</Text>
      </View>

      {/* Carat Weight */}
      <View style={commonStyles.fieldRow}>
        <Text style={commonStyles.fieldLabel}>Carat Weight</Text>
        <View style={commonStyles.separator} />
        <Text style={commonStyles.fieldValue}>{grading.CaratWeight}</Text>
      </View>

      {/* Color Grade */}
      <View style={commonStyles.fieldRow}>
        <Text style={commonStyles.fieldLabel}>Color Grade</Text>
        <View style={commonStyles.separator} />
        <Text style={commonStyles.fieldValue}>{grading.ColorGrade}</Text>
      </View>

      {/* Clarity Grade */}
      <View style={commonStyles.fieldRow}>
        <Text style={commonStyles.fieldLabel}>Clarity Grade</Text>
        <View style={commonStyles.separator} />
        <Text style={commonStyles.fieldValue}>{grading.ClarityGrade}</Text>
      </View>

      {/* Cut Grade */}
      <View style={commonStyles.fieldRow}>
        <Text style={commonStyles.fieldLabel}>Cut Grade</Text>
        <View style={commonStyles.separator} />
        <Text style={commonStyles.fieldValue}>{grading.CutGrade}</Text>
      </View>

      {/* Polish */}
      <View style={commonStyles.fieldRow}>
        <Text style={commonStyles.fieldLabel}>Polish</Text>
        <View style={commonStyles.separator} />
        <Text style={commonStyles.fieldValue}>{additional.polish}</Text>
      </View>

      {/* Symmetry */}
      <View style={commonStyles.fieldRow}>
        <Text style={commonStyles.fieldLabel}>Symmetry</Text>
        <View style={commonStyles.separator} />
        <Text style={commonStyles.fieldValue}>{additional.symmetry}</Text>
      </View>

      {/* Fluorescence */}
      <View style={commonStyles.fieldRow}>
        <Text style={commonStyles.fieldLabel}>Fluorescence</Text>
        <View style={commonStyles.separator} />
        <Text style={commonStyles.fieldValue}>{additional.fluorescence}</Text>
      </View>
    </View>
  );
}
