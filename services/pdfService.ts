import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Job } from '../types';

export const generateJobPDF = (job: Job) => {
  const doc = new jsPDF();

  // --- Config ---
  const margin = 15;
  let yPos = 20;
  const pageWidth = doc.internal.pageSize.width;

  // --- Header ---
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text("TallerPro AI", margin, yPos);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Informe de Reparación / Parte de Trabajo", margin, yPos + 6);

  // Status Badge (Simulated with text)
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Estado: ${job.status.toUpperCase()}`, 150, yPos);
  doc.text(`Fecha: ${new Date(job.createdAt).toLocaleDateString()}`, 150, yPos + 6);

  yPos += 25;

  // --- Vehicle Info Table ---
  autoTable(doc, {
    startY: yPos,
    head: [['Matrícula', 'Marca', 'Modelo', 'Color', 'Tipo']],
    body: [[
      job.carDetails?.plate || '-',
      job.carDetails?.make || '-',
      job.carDetails?.model || '-',
      job.carDetails?.color || '-',
      job.repairType || '-'
    ]],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] }, // Blue header
    styles: { fontSize: 10, cellPadding: 3 }
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  // --- Intake Image (Thumbnail) ---
  // Adding images to PDF increases size, we add a small intake thumb if exists
  if (job.intakeImage) {
    try {
        // Keep aspect ratio roughly
        doc.addImage(`data:image/jpeg;base64,${job.intakeImage}`, 'JPEG', margin, yPos, 50, 50);
        // Add text next to image
        doc.setFontSize(10);
        doc.text("Imagen de ingreso registrada.", margin + 60, yPos + 10);
        yPos += 60;
    } catch (e) {
        console.warn("Error adding image to PDF", e);
    }
  }

  // --- Damage List ---
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text("Detalle de Daños Detectados", margin, yPos);
  yPos += 5;

  const partsData = job.identifiedParts.map(part => [part, "Reparar / Pintar"]);
  
  if (partsData.length === 0) {
      partsData.push(["Sin daños específicos registrados", "-"]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Pieza / Zona', 'Intervención']],
    body: partsData,
    theme: 'striped',
    headStyles: { fillColor: [231, 76, 60] }, // Red header for damages
    styles: { fontSize: 10 }
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  // --- Observations ---
  doc.setFontSize(14);
  doc.text("Observaciones y Notas", margin, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const splitNotes = doc.splitTextToSize(job.manualNotes || "Sin observaciones adicionales.", 180);
  doc.text(splitNotes, margin, yPos);

  // --- Footer / Signature Area ---
  // Ensure signatures are at the bottom of the page
  const pageHeight = doc.internal.pageSize.height;
  let signatureY = pageHeight - 40;
  
  // If notes pushed yPos too far down, add a page for signatures, otherwise use bottom
  if (yPos > pageHeight - 50) {
    doc.addPage();
    signatureY = 40;
  }
  
  doc.setDrawColor(150);
  doc.line(margin, signatureY, 80, signatureY); // Line for signature
  doc.setFontSize(8);
  doc.text("Firma del Taller / Responsable", margin, signatureY + 5);

  doc.line(120, signatureY, 190, signatureY); // Line for client
  doc.text("Firma del Cliente", 120, signatureY + 5);

  doc.text(`Generado por TallerPro AI - ${new Date().toLocaleTimeString()}`, margin, pageHeight - 10);

  // --- PHOTOGRAPHIC ANNEX (New Page) ---
  if (job.damageImages && job.damageImages.length > 0) {
    doc.addPage();
    yPos = 20;

    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text("Anexo Fotográfico - Daños", margin, yPos);
    yPos += 15;

    const imgWidth = 80; // mm
    const imgHeight = 60; // mm
    const xGap = 15;
    const yGap = 15;

    job.damageImages.forEach((img, index) => {
        // Check if we need a new page for the next row
        if (yPos + imgHeight > pageHeight - margin) {
            doc.addPage();
            yPos = 20;
        }

        const isRightColumn = index % 2 !== 0;
        const xPos = isRightColumn ? margin + imgWidth + xGap : margin;

        try {
            doc.addImage(`data:image/jpeg;base64,${img}`, 'JPEG', xPos, yPos, imgWidth, imgHeight);
            
            // Border around image
            doc.setDrawColor(200);
            doc.rect(xPos, yPos, imgWidth, imgHeight);
            
            // Label
            doc.setFontSize(8);
            doc.text(`Foto ${index + 1}`, xPos, yPos + imgHeight + 5);

            // Move Y down only after completing a row (right column)
            if (isRightColumn) {
                yPos += imgHeight + yGap;
            }
        } catch (e) {
            console.warn("Could not add damage image to PDF", e);
        }
    });
  }

  // Save
  const fileName = `Parte_${job.carDetails?.plate || 'SinMatricula'}_${new Date().getTime()}.pdf`;
  doc.save(fileName);
};