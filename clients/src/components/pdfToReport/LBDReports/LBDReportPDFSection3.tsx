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
  return (
    <View style={styles.imageWrapper}>
      {data.color_clarity_chart_full && (
        <Image
          src={data.color_clarity_chart_full}
          style={styles.colorChartImage}
        />
      )}
    </View>
  );
}
