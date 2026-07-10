/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  imageWrapper: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 200,
  },
  colorChartImage: {
    width: 280,
    height: 180,
    objectFit: "contain",
  },
});

export default function LBDReportPDFSection3({ data }: any) {
  const imageSrc = data?.color_clarity_chart_full || data?.Images?.color_clarity_chart_full;
  
  // Only render if image source exists and is a valid string
  if (!imageSrc || typeof imageSrc !== 'string') {
    return (
      <View style={styles.imageWrapper}>
        <View />
      </View>
    );
  }

  return (
    <View style={styles.imageWrapper}>
      <Image
        src={imageSrc}
        style={styles.colorChartImage}
      />
    </View>
  );
}
