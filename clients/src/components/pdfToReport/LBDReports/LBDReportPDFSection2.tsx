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
  clarityImage: {
    width: 280,
    height: 180,
    objectFit: "contain",
  },
});

export default function LBDReportPDFSection2({ data }: any) {
  return (
    <View style={styles.imageWrapper}>
      {data.clarity_characteristics_full && (
        <Image
          src={data.clarity_characteristics_full}
          style={styles.clarityImage}
        />
      )}
    </View>
  );
}
