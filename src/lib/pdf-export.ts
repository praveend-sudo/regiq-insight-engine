import jsPDF from "jspdf";
import type { ChatTurn } from "./mock-data";

export function exportChatToPdf(turns: ChatTurn[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  // Header
  doc.setFillColor(91, 33, 182);
  doc.rect(0, 0, pageW, 60, "F");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Reg", margin, 40);
  const regW = doc.getTextWidth("Reg");
  doc.setTextColor(23, 195, 232);
  doc.text("IQ", margin + regW, 40);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Compliance Chat Export", pageW - margin, 38, { align: "right" });

  y = 90;
  doc.setTextColor(30, 27, 75);

  const ensure = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  turns.forEach((t, idx) => {
    ensure(60);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(91, 33, 182);
    doc.text(`Q${idx + 1}. ${t.question}`, margin, y, { maxWidth: pageW - margin * 2 });
    const qLines = doc.splitTextToSize(t.question, pageW - margin * 2).length;
    y += qLines * 14 + 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 60);
    const sumLines = doc.splitTextToSize(t.answer.summary, pageW - margin * 2);
    ensure(sumLines.length * 12 + 20);
    doc.text(sumLines, margin, y);
    y += sumLines.length * 12 + 6;

    t.answer.bullets.forEach((b) => {
      const bl = doc.splitTextToSize("• " + b, pageW - margin * 2 - 12);
      ensure(bl.length * 12);
      doc.text(bl, margin + 10, y);
      y += bl.length * 12;
    });
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text(`Confidence: ${t.answer.confidence}%`, margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 100);
    doc.setFontSize(9);
    doc.text("Sources: " + t.answer.citations.map((c) => `${c.issuer} ${c.section}`).join(" | "),
      margin, y, { maxWidth: pageW - margin * 2 });
    y += 24;

    // Divider
    doc.setDrawColor(220, 220, 235);
    doc.line(margin, y, pageW - margin, y);
    y += 16;
  });

  doc.save(`RegIQ-Chat-${new Date().toISOString().slice(0, 10)}.pdf`);
}
