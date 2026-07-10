/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  container: {
    marginTop: 15,
    alignItems: "center",
  },
  qrContainer: {
    width: 60,
    height: 60,
    marginBottom: 20,
    marginLeft: 20,
  },
  qrImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  proportionsContainer: {
    width: 180,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  proportionsImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  footerText: {
    fontSize: 8,
    color: "#999",
    marginTop: 15,
    textAlign: "center",
    fontFamily: "Helvetica-Light",
  },
});

export default function LBDReportPDFSection5({ data }: any) {
  const report = data.GIANATURALDIAMONDGRADINGREPORT || {};

  return (
    <View style={styles.container}>
      {/* QR Code */}
      {data.qrcode_image && (
        <View style={styles.qrContainer}>
          <Image
            src={data.qrcode_image}
            style={styles.qrImage}
          />
        </View>
      )}

      {/* Proportions Diagram */}
      {data.PROPORTIONS && (
        <View style={styles.proportionsContainer}>
          <Image
            src={data.PROPORTIONS}
            style={styles.proportionsImage}
          />
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footerText}>
        © IGI 2024, International Gemmological Institute
      </Text>
    </View>
  );
}
