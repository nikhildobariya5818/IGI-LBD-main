// // import { Image, StyleSheet, View } from "@react-pdf/renderer"
// // import type { LBDImageReportData } from "./IGIReportContent"

// // const styles = StyleSheet.create({ image: { width: "100%", height: "100%" } })

// // /** Third extracted panel: API response `images.page3`. */
// // export default function LBDReportPDFSection3({ data }: { data: LBDImageReportData }) {
// //   const imageUrl = data.image_urls?.page3 || data.images?.page3
// //   return typeof imageUrl === "string" ? <Image src={imageUrl} style={[styles.image,{left:1,top:3}]} /> : <View />
// // }


// // import { Image, StyleSheet, View } from "@react-pdf/renderer"
// // import type { LBDImageReportData } from "./IGIReportContent"

// // const styles = StyleSheet.create({ image: { width: "100%", height: "100%" } })

// // /** First extracted panel: API response `images.page1`. */
// // export default function LBDReportPDFSection1({ data }: { data: LBDImageReportData }) {
// //   const imageUrl = data.image_urls?.page1 || data.images?.page1
// //   return typeof imageUrl === "string" ? <Image src={imageUrl} style={[styles.image,{left:15,top:5}]} /> : <View />
// // }



// // import { Image, StyleSheet, View } from "@react-pdf/renderer";
// // import type { LBDImageReportData } from "./IGIReportContent";

// // const styles = StyleSheet.create({
// //   container: {
// //     position: "relative",
// //     width: "100%",
// //     height: "100%",
// //   },

// //   image: {
// //     width: "100%",
// //     height: "100%",
// //     position: "absolute",
// //     left: 1,
// //     top: 3,
// //   },

// //   overlay: {
// //     position: "absolute",
// //     top: 0,
// //     left: 0,
// //     right: 0,
// //     bottom: 0,
// //   },
// // });

// // interface Props {
// //   data: LBDImageReportData;

// //   /**
// //    * 0 = original image
// //    * 100 = completely white
// //    *
// //    * Recommended:
// //    * 15-25 = Slightly brighter
// //    * 30-40 = Medium brighter
// //    * 50-70 = Very bright
// //    * 80 = Extremely bright
// //    */
// //   lightness?: number;
// // }

// // export default function LBDReportPDFSection1({
// //   data,
// //   lightness = 48, // 70-80% lighter
// // }: Props) {
// //   const imageUrl =  data.images?.page3;

// //   if (typeof imageUrl !== "string") {
// //     return <View />;
// //   }

// //   const opacity = Math.max(0, Math.min(lightness / 100, 0.8));

// //   return (
// //     <View style={styles.container}>
// //       <Image src={imageUrl} style={styles.image} />

// //       <View
// //         style={[
// //           styles.overlay,
// //           {
// //             backgroundColor: "#FFFFFF",
// //             opacity,
// //           },
// //         ]}
// //       />
// //     </View>
// //   );
// // }




// import { Image, StyleSheet, View, Text, Font } from "@react-pdf/renderer";
// import type { LBDImageReportData } from "./IGIReportContent";

// export const baseFont = "AVGARDD_2";
// export const IBMPlexSansFont = "Helvetica-Bold";

// Font.register({
//   family: baseFont,
//   src: "/fonts/AVGARDN_2.ttf",
// });

// Font.register({
//   family: IBMPlexSansFont,
//   src: "/fonts/Helvetica-Bold.ttf",
// });


// const styles = StyleSheet.create({
//   container: {
//     position: "relative",
//     width: "100%",
//     height: "100%",
//   },

//   image: {
//     width: "100%",
//     height: "100%",
//     position: "absolute",
//     left: 1,
//     top: 3,
//   },

//   overlay: {
//     position: "absolute",
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//   },
//   row: {
//       flexDirection: "row",
//       justifyContent: "space-between",
//       alignItems: "flex-start",
//       top: 560,
//       width: "90%",
//       left:"20px"
//     },
  
//     label: {
//       // width: "44%",
//       fontFamily: baseFont,
//       fontSize: 6,
//       color: "#111",
//       left:"25px"
//     },
  
//     value: {
//       // width: "54%",
//       fontFamily: baseFont,
//       fontSize: 6,
//       textAlign: "left",
//       color: "#111",
//       right: "18px"
//     },
// });

// interface Props {
//   data: LBDImageReportData;

//   /**
//    * 0 = original image
//    * 100 = completely white
//    *
//    * Recommended:
//    * 15-25 = Slightly brighter
//    * 30-40 = Medium brighter
//    * 50-70 = Very bright
//    * 80 = Extremely bright
//    */
//   lightness?: number;
// }

// function Row({
//   label,
//   value,
//   style,
// }: {
//   label: string;
//   value?: any;
//   style?: any;
// }) {
//   if (!value) return null;

//   return (
//     <View style={[styles.row, style]}>
//       <Text style={styles.label}>{label}</Text>
//       <Text style={styles.value}>{value}</Text>
//     </View>
//   );
// }

// export default function LBDReportPDFSection1({
//   data,
//   lightness = 40, // 70-80% lighter
// }: Props) {
//   const imageUrl = data.image_urls?.page3 || data.images?.page3;

//   if (typeof imageUrl !== "string") {
//     return <View />;
//   }

//   const opacity = Math.max(0, Math.min(lightness / 100, 0.8));

//   return (
//     <View style={styles.container}>
//       <Image src={imageUrl} style={styles.image} />

//       <View
//         style={[
//           styles.overlay,
//           {
//             backgroundColor: "#FFFFFF",
//             opacity,
//           },
//         ]}
//       />
//       <Row
//         label="© IGI 2020, International Gemological Institute"
//         value="FD - 10 20"
//       />
//     </View>
//   );
// }


import { Image, StyleSheet, View, Text, Font } from "@react-pdf/renderer";
import type { LBDImageReportData } from "./IGIReportContent";

export const baseFont = "AVGARDD_2";
export const IBMPlexSansFont = "Helvetica-Bold";

Font.register({
  family: baseFont,
  src: "/fonts/AVGARDN_2.ttf",
});

Font.register({
  family: IBMPlexSansFont,
  src: "/fonts/Helvetica-Bold.ttf",
});

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    height: "100%",
  },

  // Top half clip window
  halfTop: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "50%",
    overflow: "hidden",
  },

  // Bottom half clip window
  halfBottom: {
    position: "absolute",
    top: "50%",
    left: 0,
    width: "100%",
    height: "50%",
    overflow: "hidden",
  },

  // Full-size image placed inside the TOP clip window (shows rows 0–50%)
  imageInTop: {
    position: "absolute",
    top: 1, // fine-tune horizontal offset like your original "left:1, top:3"
    left: 1,
    width: "100%",
    height: "200%", // 200% of half-height wrapper = full image height
  },

  // Full-size image placed inside the BOTTOM clip window (shows rows 50–100%)
  imageInBottom: {
    position: "absolute",
    top: "-100%", // shift image up by one wrapper-height to reveal bottom half
    left: 1,
    width: "100%",
    height: "200%",
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    top: 570,
    width: "90%",
    left: "20px",
  },

  label: {
    fontFamily: baseFont,
    fontSize: 6,
    color: "#111",
    left: "25px",
  },

  value: {
    fontFamily: baseFont,
    fontSize: 6,
    textAlign: "left",
    color: "#111",
    right: "18px",
  },
});

interface Props {
  data: LBDImageReportData;

  /**
   * lightness 0  -> opacity 0    -> original image (no white blend)
   * lightness 40 -> opacity 0.5  -> 50% blend with white
   * lightness 80 -> opacity 1    -> fully white
   */
  topLightness?: number;
  bottomLightness?: number;
}

function lightnessToOpacity(lightness: number) {
  return Math.max(0, Math.min(lightness / 80, 1));
}

function Row({
  label,
  value,
  style,
}: {
  label: string;
  value?: any;
  style?: any;
}) {
  if (!value) return null;

  return (
    <View style={[styles.row, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function LBDReportPDFSection1({
  data,
  topLightness = 0,   // top half: original image
  bottomLightness = 30, // bottom half: 50% white blend
}: Props) {
  const imageUrl = data.image_urls?.page3 || data.images?.page3;

  if (typeof imageUrl !== "string") {
    return <View />;
  }

  const topOpacity = lightnessToOpacity(topLightness);
  const bottomOpacity = lightnessToOpacity(bottomLightness);

  return (
    <View style={styles.container}>
      {/* TOP HALF - original */}
      <View style={styles.halfTop}>
        <Image src={imageUrl} style={styles.imageInTop} />
        {topOpacity > 0 && (
          <View
            style={[
              styles.overlay,
              { backgroundColor: "#FFFFFF", opacity: topOpacity },
            ]}
          />
        )}
      </View>

      {/* BOTTOM HALF - lightened */}
      <View style={styles.halfBottom}>
        <Image src={imageUrl} style={styles.imageInBottom} />
        {bottomOpacity > 0 && (
          <View
            style={[
              styles.overlay,
              { backgroundColor: "#FFFFFF", opacity: bottomOpacity },
            ]}
          />
        )}
      </View>

      <Row
        label="© IGI 2020, International Gemological Institute"
        value="FD - 10 20"
      />
    </View>
  );
}