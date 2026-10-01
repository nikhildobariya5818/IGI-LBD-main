// import { Image, StyleSheet, View } from "@react-pdf/renderer"
// import type { LBDImageReportData } from "./IGIReportContent"

// const styles = StyleSheet.create({ image: { width: "100%", height: "100%" } })

// /** Fourth extracted panel: API response `images.page4`. */
// export default function LBDReportPDFSection4({ data }: { data: LBDImageReportData }) {
//   const imageUrl = data.image_urls?.page4 || data.images?.page4
//   return typeof imageUrl === "string" ? <Image src={imageUrl} style={[styles.image,{left:1,top:4}]} /> : <View />
// }


import { Image, StyleSheet, View } from "@react-pdf/renderer";
import type { LBDImageReportData } from "./IGIReportContent";

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    height: "100%",
  },

  image: {
    width: "100%",
    height: "100%",
    position: "absolute",
    left: 1,
    top: 4,
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

interface Props {
  data: LBDImageReportData;

  /**
   * 0 = original image
   * 100 = completely white
   *
   * Recommended:
   * 15-25 = Slightly brighter
   * 30-40 = Medium brighter
   * 50-70 = Very bright
   * 80 = Extremely bright
   */
  lightness?: number;
}

export default function LBDReportPDFSection4({
  data,
  lightness = 55, // 70-80% lighter
}: Props) {
  // const imageUrl =  data.images?.page4;
  const imageUrl = data.image_urls?.page4 || data.images?.page4;

  if (typeof imageUrl !== "string") {
    return <View />;
  }

  const opacity = Math.max(0, Math.min(lightness / 100, 0.8));

  return (
    <View style={styles.container}>
      <Image src={imageUrl} style={styles.image} />

      <View
        style={[
          styles.overlay,
          {
            backgroundColor: "#FFFFFF",
            opacity,
          },
        ]}
      />
    </View>
  );
}