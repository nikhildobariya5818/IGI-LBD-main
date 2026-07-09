/* eslint-disable jsx-a11y/alt-text */
import { BASE_URL } from "../../../lib/axiosClient";
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function InvoicePDFSection5({ data }: { data: any }) {
    const report = data.GIANATURALDIAMONDGRADINGREPORT || {};
    
    return (
        <View style={styles.container}>
            {/* QR Code */}
            <View style={styles.qrContainer}>
                <Image
                    src={`${BASE_URL}/files/${report.GIAReportNumber}/qrcode.png?t=${Date.now()}`}
                    style={styles.qrImage}
                />
            </View>

            {/* Barcode and number */}
            <View style={styles.barcodeRow}>
                <Image
                    src={`${BASE_URL}/files/${report.GIAReportNumber}/barcode10.png?t=${Date.now()}`}
                    style={styles.barcodeImage}
                />
                <Text style={styles.barcodeText}>
                    {data?.BARCODE10?.number ?? ""}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 420, // space from previous section (adjust if needed)
        alignItems: "center",
    },
    qrContainer: {
        width: 60,
        height: 59,
        marginBottom: '29px',
        marginLeft: 143,
        // backgroundColor: 'red'
    },
    qrImage: {
        width: "100%",
        height: "100%",
        objectFit: "contain",
        // backgroundColor: 'red' 
    },
    barcodeRow: {
        flexDirection: "row",
        marginLeft: 15,
        top:1,
        // alignItems: "center",
        // justifyContent: "center",
        gap: 4,
    },
    barcodeImage: {
        width: 98,
        height: 8,
        // objectFit: "contain",
    },
    barcodeText: {
        marginLeft: 5,
        marginTop: '1.40px',
        fontSize: "8.80",
        fontFamily: "OCR",
        color: "#000",
    },
});
