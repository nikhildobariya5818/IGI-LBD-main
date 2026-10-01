/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import { View, Text, StyleSheet, Font, Image } from "@react-pdf/renderer";


export const baseFont = "AVGARDD_2";
export const HBMPlexSansFont = "Helvetica-Bold";

Font.register({
  family: baseFont,
  src: "/fonts/AVGARDN_2.ttf",
});

Font.register({
  family: HBMPlexSansFont,
  src: "/fonts/Helvetica-Bold.ttf",
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    paddingTop: 6,
    paddingLeft: 8,
    paddingRight: 8,
    fontFamily: baseFont,
  },

  reportDate: {
    fontFamily: baseFont,
    fontSize: 4.5,
    bottom: 7,
    right: 5.5
  },

  reportNo: {
    fontFamily: baseFont,
    fontSize: 4.5,
    bottom: 7,
    right: 5.5
  },

  shape: {
    fontFamily: baseFont,
    fontSize: 4.5,
    bottom: 6,
    right: 5.5
  },

  measurement: {
    fontFamily: baseFont,
    fontSize: 4.5,
    bottom: 1,
    right: 5.5
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    bottom: 2,
    right: 4.5,
    marginBottom: 2,
    // width: "100%",
  },

  label: {
    fontFamily: baseFont,
    fontSize: 4.5,
    // right:5.5
  },

  value: {
    fontFamily: baseFont,
    fontSize: 4.5,
    textAlign: "right",
    left: 9.5
  },
  inscriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 7,
    width: "100%",
    right: "6px"
  },

  logo: {
    width: 6,
    height: 4,
    left:6
  },

  inscriptionValue: {
    flexDirection: "row",
    fontFamily: baseFont,
    fontSize: 8.5,
    textAlign: "left",
    color: "#111",
    left: "3px"
  },

});

function Row({
  label,
  value,
}: {
  label: string;
  value?: any;
}) {
  if (!value) return null;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>

      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function InscriptionRow({
  value,
}: {
  value?: string;
}) {
  if (!value) return null;

  return (
    <View style={styles.inscriptionRow}>
      <Text style={styles.label}>Inscription(s)</Text>

      <View style={styles.inscriptionValue}>
        <Image
          src="/IGI-logo.png"   // Change to your actual image path
          style={styles.logo}
        />
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

export default function LBDReportPDFSection5({ data }: any) {
  const value = data.data || data;

  const formattedComments = value.comments
    ? value.comments
      .trim()
      .replace(/HEARTS\s*&\s*ARROWS/i, "\nHEARTS & ARROWS")
      .replace(
        /This Laboratory Grown Diamond was\s*created by\s*/i,
        "\nThis Laboratory Grown Diamond was\ncreated by "
      )
      .replace(
        /Chemical Vapor Deposition\s*\(CVD\)\s*growth process\./i,
        "Chemical Vapor Deposition\n(CVD) growth process."
      )
      .replace(/Type\s*IIa/i, "\nType IIa")
      .trim()
    : "";

  const clarityShortForm = (clarity: string) => {
    if (!clarity) return "";

    const clarityMap: Record<string, string> = {
      "FLAWLESS": "FL",
      "INTERNALLY FLAWLESS": "I.F",
      "INTERNALLY FLAWLESS (IF)": "I.F",

      "VERY VERY SLIGHTLY INCLUDED 1": "VVS1",
      "VERY VERY SLIGHTLY INCLUDED 2": "VVS2",
      "VERY VERY SLIGHTLY INCLUDED ONE": "VVS1",
      "VERY VERY SLIGHTLY INCLUDED TWO": "VVS2",

      "VERY SLIGHTLY INCLUDED 1": "VS1",
      "VERY SLIGHTLY INCLUDED 2": "VS2",
      "VERY SLIGHTLY INCLUDED ONE": "VS1",
      "VERY SLIGHTLY INCLUDED TWO": "VS2",

      "SLIGHTLY INCLUDED 1": "SI1",
      "SLIGHTLY INCLUDED 2": "SI2",
      "SLIGHTLY INCLUDED ONE": "SI1",
      "SLIGHTLY INCLUDED TWO": "SI2",

      "INCLUDED 1": "I1",
      "INCLUDED 2": "I2",
      "INCLUDED 3": "I3",
      "INCLUDED ONE": "I1",
      "INCLUDED TWO": "I2",
      "INCLUDED THREE": "I3",
    };

    const normalized = clarity
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();

    return clarityMap[normalized] || clarity;
  };

  return (
    <View style={styles.container}>

      <Text style={styles.reportDate}>
        {value.report_date}
      </Text>

      <Text style={styles.reportNo}>
        IGI Report No {value.report_number}
      </Text>

      <Text style={styles.shape}>
        {value.shape_and_cutting_style}
      </Text>

      <Text style={styles.measurement}>
        {value.measurements?.toUpperCase()}
      </Text>

      <Row label="Carat Weight" value={value.carat_weight} />
      <Row label="Color Grade" value={value.color_grade} />

      <View style={{ marginBottom: 3 }}></View>

      <Row
        label="Clarity Grade"
        value={clarityShortForm(value.clarity_grade)}
      />

      <Row label="Cut Grade" value={value.cut_grade} />

      <Row label="Depth" value={value.depth_percent} />

      <Row label="Table" value={value.table_percent} />

      <Row label="Girdle" value={value.girdle} />

      <View style={{ marginBottom: 7 }}></View>

      <Row label="Culet" value={value.culet} />

      <Row label="Polish" value={value.polish} />

      <Row label="Symmetry" value={value.symmetry} />

      <Row label="Fluorescence" value={value.fluorescence} />

      <InscriptionRow value={value.inscriptions} />

      {formattedComments && (
        <View
          style={{
            right: 4.5,
            top: 3,
            width: 120,
          }}
        >
          <Text
            style={{
              fontFamily: baseFont,
              fontSize: 4.5,
            }}
          >
            <Text
              style={{
                fontFamily: baseFont,
                fontSize: 4.5,
              }}
            >
              Comments:
            </Text>
            {" \n"}
            {formattedComments}
          </Text>
        </View>
      )}

    </View>
  );
}