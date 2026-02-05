
import { AnalysisResult, DiagnosticStatus, ActiveStory } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type jsPDFWithAutoTable = any;

const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

const downloadFile = (content: string, filename: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const generatePdfReport = (data: AnalysisResult, snapshots?: string[]) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  const date = new Date().toLocaleDateString();

  // --- Header Banner (Enterprise Navy) ---
  doc.setFillColor(15, 23, 42); // Navy
  doc.rect(0, 0, 210, 40, 'F');

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255); 
  doc.setFont('helvetica', 'bold');
  doc.text("CLINICAL AUDIT REPORT", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(180, 83, 9); // Gold
  doc.setFont('helvetica', 'normal');
  doc.text(`ComplianceTest.net | Date: ${date} | Ref: ${sanitizeFilename(data.documentTitle).substring(0,20)}`, 14, 28);

  // --- Score Badge ---
  doc.setFillColor(255, 255, 255); 
  doc.roundedRect(160, 10, 35, 20, 2, 2, 'F');
  
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42); 
  doc.text("INTEGRITY SCORE", 164, 16);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  if (data.complianceScore >= 80) doc.setTextColor(180, 83, 9); 
  else if (data.complianceScore >= 50) doc.setTextColor(217, 119, 6); 
  else doc.setTextColor(220, 38, 38); 
  doc.text(`${data.complianceScore}/100`, 170, 24);

  // --- Document Info ---
  let currentY = 50;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text("Audit Target:", 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.documentTitle, 50, currentY);
  currentY += 10;

  // --- Summary Box ---
  doc.setFillColor(248, 250, 252); 
  doc.setDrawColor(226, 232, 240); 
  doc.roundedRect(14, currentY, 182, 35, 2, 2, 'FD');
  
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); 
  doc.setFont('helvetica', 'bold');
  doc.text("EXECUTIVE SUMMARY", 18, currentY + 8);
  
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); 
  doc.setFont('helvetica', 'normal');
  const splitSummary = doc.splitTextToSize(data.summary, 170);
  doc.text(splitSummary, 18, currentY + 16);

  currentY += 45;

  // --- Findings Table ---
  const tableBody = data.items.map(item => [
    item.status.replace('_', ' '),
    item.priority || '-',
    item.title,
    item.description + (item.recommendation ? `\n\nREMEDIATION: ${item.recommendation}` : '')
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['STATUS', 'PRIORITY', 'MANIFEST NODE', 'DETAILS & REMEDIATION']],
    body: tableBody,
    theme: 'grid',
    headStyles: { 
        fillColor: [15, 23, 42], 
        textColor: 255, 
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left'
    },
    styles: {
        fontSize: 9,
        cellPadding: 4,
        overflow: 'linebreak'
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 25 },
      1: { cellWidth: 20 },
      2: { fontStyle: 'bold', cellWidth: 40 }, 
      3: { cellWidth: 'auto' } 
    }
  });

  // --- Visual Audit Snapshots ---
  if (snapshots && snapshots.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("VISUAL AUDIT EVIDENCE", 14, 20);
    
    let imgY = 30;
    snapshots.forEach((snap, idx) => {
      if (imgY > 240) {
        doc.addPage();
        imgY = 20;
      }
      try {
        doc.addImage(`data:image/jpeg;base64,${snap}`, 'JPEG', 14, imgY, 80, 60);
        doc.setFontSize(8);
        doc.text(`Snapshot Ref: ${idx + 1} | Time: ${new Date().toLocaleTimeString()}`, 100, imgY + 10);
        imgY += 70;
      } catch (e) {
        console.error("PDF Image Error", e);
      }
    });
  }

  doc.save(`Clinical_Audit_${sanitizeFilename(data.documentTitle)}.pdf`);
};
