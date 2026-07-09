/* eslint-disable jsx-a11y/alt-text */
import { BASE_URL } from "../../../lib/axiosClient";
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function InvoicePDFSection5({ data }: { data: any }) {
    const report = data.GIANATURALDIAMONDGRADINGREPORT || {};
    return (
        <>
            {/* Grading Scales — centered */}
            <View style={styles.scalesContainer}>
                <Image
                    src="grading-scales.png"
                    style={styles.scalesContainerImage}
                />
            </View>

            <View style={styles.container}>
                {/* Paragraph + QR Code side by side row */}
                <View style={styles.qrParagraphRow}>
                    {/* Left: paragraph image */}
                    <Image
                        src="qr-paragraph.png"
                        style={styles.qrparagraphImage}
                    />
                    {/* Right: QR code */}
                    <Image
                        src={`${BASE_URL}/files/${report.GIAReportNumber}/qrcode.png?t=${Date.now()}`}
                        style={styles.qrImage}
                    />
                </View>

                {/* Barcode and number — unchanged */}
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
        </>
    );
}

const styles = StyleSheet.create({
    /* ✅ Full width row, children centered horizontally */
    scalesContainer: {
        width: "100%",
        alignItems: "center",       // centers image horizontally
        justifyContent: "center",
        marginTop: 16,
    },
    scalesContainerImage: {
        width: "90%",               // adjust to taste — controls how wide the image appears
        marginLeft:20
    },

    container: {
        marginTop: 126,
        alignItems: "center",

    },

    qrParagraphRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },

    qrparagraphImage: {
        width: 120,
        height: 55,
        marginLeft: 34,
    },

    qrImage: {
        width: 60,
        height: 60,
    },

    barcodeRow: {
        flexDirection: "row",
        marginLeft: 10,//40
        gap: 4,
        marginTop: 18,
    },
    barcodeImage: {
        width: 98,
        height: 8,
    },
    barcodeText: {
        marginLeft: 1,
        fontSize: "8.80",
        fontFamily: "OCR",
        color: "#000",
    },
});