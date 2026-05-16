"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { ReportColumn, ReportRow } from "@/lib/reports";
import { formatCell } from "./formatters";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 32,
    paddingBottom: 48,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#2D2D2D",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#1565C0",
    paddingBottom: 10,
    marginBottom: 14,
  },
  brandLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: { width: 32, height: 32, objectFit: "contain" },
  companyName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1565C0",
  },
  headerRight: { textAlign: "right" },
  reportTitle: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  reportMeta: { fontSize: 8, color: "#666", marginTop: 2 },
  table: {
    borderWidth: 0.5,
    borderColor: "#E5E5E5",
    borderRadius: 2,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F4F4F4",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F0",
  },
  th: {
    padding: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#555",
  },
  td: { padding: 4, fontSize: 8 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#999",
  },
});

type Props = {
  logoUrl: string;
  companyName: string;
  reportTitle: string;
  reportSubtitle: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  generatedAt: string;
};

export function ReportPdfDocument(props: Props) {
  const colWidth = 100 / props.columns.length;
  return (
    <Document
      title={`${props.companyName} — ${props.reportTitle}`}
      author={props.companyName}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.brandLeft}>
            {props.logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not DOM img
              <Image src={props.logoUrl} style={styles.logo} />
            ) : null}
            <Text style={styles.companyName}>{props.companyName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportTitle}>{props.reportTitle}</Text>
            <Text style={styles.reportMeta}>{props.reportSubtitle}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow} fixed>
            {props.columns.map((c) => (
              <Text
                key={c.key}
                style={[
                  styles.th,
                  {
                    width: `${colWidth}%`,
                    textAlign:
                      c.align === "right"
                        ? "right"
                        : c.align === "center"
                          ? "center"
                          : "left",
                  },
                ]}
              >
                {c.label}
              </Text>
            ))}
          </View>
          {props.rows.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.td, { width: "100%", textAlign: "center", color: "#999" }]}>
                No data
              </Text>
            </View>
          ) : (
            props.rows.map((row, idx) => (
              <View
                key={idx}
                style={[
                  styles.tableRow,
                  { backgroundColor: idx % 2 === 0 ? "white" : "#FAFAFA" },
                ]}
                wrap={false}
              >
                {props.columns.map((c) => (
                  <Text
                    key={c.key}
                    style={[
                      styles.td,
                      {
                        width: `${colWidth}%`,
                        textAlign:
                          c.align === "right"
                            ? "right"
                            : c.align === "center"
                              ? "center"
                              : "left",
                      },
                    ]}
                  >
                    {formatCell(row[c.key], c.format)}
                  </Text>
                ))}
              </View>
            ))
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>Generated {props.generatedAt}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
