import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PatientData {
  name: string;
  patientCode: string;
  patientId: string;
  age: number | string;
  sex: string;
  bloodGroup?: string;
  allergies?: string;
  knownConditions?: string;
}

interface ExaminationData {
  id: string;
  prediction: string;
  confidence: number;
  filename: string;
  gradcam?: string;
  createdAt: any;
}

export const generatePdfReport = async (patient: PatientData, exam: ExaminationData) => {
  // Create a hidden temporary container for rendering the PDF layout
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = 'Helvetica, Arial, sans-serif';
  container.style.padding = '40px';

  const dateStr = exam.createdAt?.toDate 
    ? exam.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  container.innerHTML = `
    <div style="border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h1 style="margin: 0; color: #2563eb; font-size: 28px; font-weight: bold; letter-spacing: -0.5px;">MedVision</h1>
        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Clinical Decision Support Report</p>
      </div>
      <div style="text-align: right; color: #64748b; font-size: 11px;">
        <p style="margin: 0;">Report Generated: ${new Date().toLocaleDateString()}</p>
        <p style="margin: 2px 0 0 0;">Exam Date: ${dateStr}</p>
      </div>
    </div>

    <!-- Patient Details -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 12px 0; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Patient Information</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; font-size: 13px;">
        <div><strong>Name:</strong> ${patient.name}</div>
        <div><strong>Patient Code:</strong> ${patient.patientCode}</div>
        <div><strong>Patient ID:</strong> ${patient.patientId}</div>
        <div><strong>Age / Sex:</strong> ${patient.age} Yrs / ${patient.sex}</div>
        <div><strong>Blood Group:</strong> ${patient.bloodGroup || 'N/A'}</div>
        <div><strong>Allergies:</strong> ${patient.allergies || 'None'}</div>
      </div>
    </div>

    <!-- Diagnostic Findings -->
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 12px 0; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">AI Analysis Findings</h2>
      <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 16px;">
        <div style="padding: 12px 20px; border-radius: 6px; background-color: ${exam.confidence >= 0.40 ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${exam.confidence >= 0.40 ? '#fca5a5' : '#86efac'}; color: ${exam.confidence >= 0.40 ? '#991b1b' : '#166534'}; font-size: 16px; font-weight: bold;">
          ${exam.prediction}
        </div>
        <div style="font-size: 14px; color: #334155;">
          Model Confidence: <strong>${(exam.confidence * 100).toFixed(1)}%</strong>
        </div>
      </div>
    </div>

    <!-- Images Side-by-Side -->
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 12px 0; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Diagnostic Imagery & Visual Explainability</h2>
      <div style="display: flex; justify-content: center; gap: 24px;">
        ${exam.gradcam ? `
          <div style="text-align: center;">
            <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b; text-transform: uppercase;">Grad-CAM Heatmap Overlay</p>
            <img src="${exam.gradcam}" style="width: 260px; height: 260px; object-fit: contain; border: 1fr solid #cbd5e1; border-radius: 6px; background-color: #000;" />
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Doctor Notes & Disclaimer -->
    <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
      <h2 style="margin: 0 0 8px 0; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 1px;">Attending Physician Notes</h2>
      <div style="border: 1px dashed #cbd5e1; height: 80px; border-radius: 6px; margin-bottom: 20px;"></div>
      
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; font-size: 11px; color: #64748b;">
        <div>
          <p style="margin: 0 0 4px 0;">Physician Signature: ___________________________</p>
          <p style="margin: 0;">Date: ________________________</p>
        </div>
        <div style="max-width: 300px; text-align: right; font-size: 9px; color: #94a3b8; leading: 1.2;">
          <strong>Disclaimer:</strong> This automated report is generated by MedVision AI (DenseNet121) as clinical decision support only and does not constitute a final diagnosis.
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`MedVision_Report_${patient.name.replace(/\s+/g, '_')}_${exam.id.slice(0, 6)}.pdf`);
  } catch (error) {
    console.error('Failed to generate PDF report:', error);
  } finally {
    document.body.removeChild(container);
  }
};