import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { type MultiLabelPredictionResult } from '../types/multilabel';

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

export const generateMultiLabelPdfReport = async (
  patient: PatientData,
  result: MultiLabelPredictionResult,
  activeConditionName?: string,
  activeHeatmap?: string
) => {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '820px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = 'Helvetica, Arial, sans-serif';
  container.style.padding = '36px';

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Sort findings descending by probability
  const sortedFindings = [...result.findings].sort((a, b) => b.probability - a.probability);
  const detectedCount = sortedFindings.filter((f) => f.detected).length;

  // Format heatmap base64 with valid data URI prefix and log length for diagnostics
  const heatmapBase64 = activeHeatmap || result.heatmap_base64 || '';
  const formattedImage = heatmapBase64.startsWith('data:image')
    ? heatmapBase64
    : (heatmapBase64 ? `data:image/png;base64,${heatmapBase64}` : '');
  
  console.log('PDF Heatmap URI length:', formattedImage?.length);
  const conditionVisualized = activeConditionName || result.primary_finding;

  const findingsRowsHtml = sortedFindings
    .map((f, idx) => {
      const pct = (f.probability * 100).toFixed(1);
      const isDetected = f.detected;
      const barColor = isDetected ? '#dc2626' : f.probability >= 0.3 ? '#d97706' : '#94a3b8';
      const badgeBg = isDetected ? '#fef2f2' : '#f8fafc';
      const badgeBorder = isDetected ? '#fca5a5' : '#e2e8f0';
      const badgeColor = isDetected ? '#991b1b' : '#64748b';
      const badgeText = isDetected ? 'DETECTED' : 'UNREMARKABLE';

      return `
        <tr style="border-bottom: 1px solid #f1f5f9; font-size: 11px;">
          <td style="padding: 6px 8px; font-weight: 600; color: #163b5c;">${idx + 1}. ${f.condition.replace('_', ' ')}</td>
          <td style="padding: 6px 8px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 9px; background: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${badgeColor};">
              ${badgeText}
            </span>
          </td>
          <td style="padding: 6px 8px; width: 140px;">
            <div style="background: #e2e8f0; height: 7px; border-radius: 4px; overflow: hidden; width: 100%;">
              <div style="background: ${barColor}; height: 100%; width: ${Math.min(f.probability * 100, 100)}%;"></div>
            </div>
          </td>
          <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: 700; color: #163b5c;">
            ${pct}%
          </td>
        </tr>
      `;
    })
    .join('');

  container.innerHTML = `
    <!-- Header -->
    <div style="border-bottom: 2px solid #163b5c; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h1 style="margin: 0; color: #163b5c; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">MedVision</h1>
        <p style="margin: 3px 0 0 0; color: #315d7d; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600;">
          Comprehensive Multi-Pathology Thoracic Screening Report
        </p>
      </div>
      <div style="text-align: right; color: #64748b; font-size: 10px;">
        <p style="margin: 0; font-family: monospace;">Model: ${result.model_version}</p>
        <p style="margin: 2px 0 0 0;">Exam ID: ${result.examination_id.slice(0, 14)}</p>
        <p style="margin: 2px 0 0 0;">Date: ${dateStr}</p>
      </div>
    </div>

    <!-- Patient Context Card -->
    <div style="background-color: #f8fafc; border: 1px solid #d9e2ea; border-radius: 6px; padding: 12px 16px; margin-bottom: 18px;">
      <h2 style="margin: 0 0 8px 0; font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; font-weight: 700;">
        Patient Demographics & Clinical Profile
      </h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 12px;">
        <div><strong>Name:</strong> ${patient.name}</div>
        <div><strong>Patient Code:</strong> ${patient.patientCode}</div>
        <div><strong>Age / Sex:</strong> ${patient.age} Y / ${patient.sex}</div>
        <div><strong>Blood Group:</strong> ${patient.bloodGroup || 'N/A'}</div>
        <div><strong>Known Allergies:</strong> ${patient.allergies || 'None recorded'}</div>
        <div><strong>Source File:</strong> ${result.filename}</div>
      </div>
    </div>

    <!-- Primary Finding Summary Banner -->
    <div style="background: ${result.primary_confidence >= 0.5 ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${result.primary_confidence >= 0.5 ? '#fca5a5' : '#86efac'}; border-radius: 6px; padding: 12px 16px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: ${result.primary_confidence >= 0.5 ? '#991b1b' : '#166534'};">
          Primary Radiographic Finding
        </span>
        <div style="font-size: 18px; font-weight: 800; color: ${result.primary_confidence >= 0.5 ? '#991b1b' : '#166534'}; margin-top: 2px;">
          ${result.primary_finding.replace('_', ' ')}: ${(result.primary_confidence * 100).toFixed(1)}% Confidence
        </div>
      </div>
      <div style="text-align: right;">
        <span style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; background: #ffffff; border: 1px solid #cbd5e1; color: #163b5c;">
          ${detectedCount} of 14 Pathologies Flagged (≥50%)
        </span>
      </div>
    </div>

    <!-- Dual Layout: Findings Table + Grad-CAM Heatmap -->
    <div style="display: flex; gap: 16px; margin-bottom: 18px;">
      <!-- Table of 14 Pathologies (Left) -->
      <div style="flex: 1.2;">
        <h3 style="margin: 0 0 6px 0; font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
          Complete 14-Finding Probability Spectrum
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1.5px solid #cbd5e1; font-size: 9px; text-transform: uppercase; color: #64748b;">
              <th style="padding: 4px 8px; text-align: left;">Pathology Condition</th>
              <th style="padding: 4px 8px; text-align: center;">Status</th>
              <th style="padding: 4px 8px; text-align: left;">Confidence Bar</th>
              <th style="padding: 4px 8px; text-align: right;">Prob</th>
            </tr>
          </thead>
          <tbody>
            ${findingsRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- Grad-CAM Imagery Area (Right) -->
      <div style="flex: 0.8; text-align: center; border-left: 1px solid #e2e8f0; padding-left: 16px;">
        <h3 style="margin: 0 0 6px 0; font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
          Grad-CAM Explainability Overlay
        </h3>
        <p style="margin: 0 0 8px 0; font-size: 10px; color: #315d7d; font-weight: 600;">
          Target: ${conditionVisualized.replace('_', ' ')}
        </p>
        <div id="cam-placeholder" style="width: 220px; height: 220px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px;"></div>
        <p style="margin: 6px 0 0 0; font-size: 9px; color: #64748b;">DenseNet-121 Norm5 Activation Heatmap</p>
      </div>
    </div>

    <!-- Benchmark Verification Reference -->
    <div style="background: #f1f5f9; border-radius: 4px; padding: 8px 12px; margin-bottom: 18px; font-size: 10px; color: #475569; display: flex; justify-content: space-between; align-items: center;">
      <span><strong>Model Verification:</strong> DenseNet-121 multi-label architecture evaluated on held-out test data.</span>
      <span style="font-family: monospace; font-weight: 700; color: #163b5c;">Held-out Test Set Mean ROC-AUC: 0.8057</span>
    </div>

    <!-- Attending Physician Notes & Signature Block -->
    <div style="border-top: 1px solid #e2e8f0; padding-top: 14px;">
      <h3 style="margin: 0 0 6px 0; font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
        Attending Physician Clinical Notes & Correlation
      </h3>
      <div style="border: 1px dashed #cbd5e1; height: 60px; border-radius: 4px; margin-bottom: 14px;"></div>

      <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: #64748b;">
        <div>
          <p style="margin: 0 0 4px 0;">Physician Signature: ___________________________</p>
          <p style="margin: 0;">Date: ________________________</p>
        </div>
        <div style="max-width: 320px; text-align: right; font-size: 8px; color: #94a3b8; line-height: 1.3;">
          <strong>Clinical Protocol:</strong> MedVision AI v2 multi-pathology screening provides clinical decision support. All automated findings must be independently validated by a licensed physician before definitive diagnostic or therapeutic decisions.
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
    });
    const imgData = canvas.toDataURL('image/png');

    const doc = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // 1. Render the HTML background (text, tables, headers, signatures, borders)
    doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // 2. Direct jsPDF image overlay at exact placeholder coordinates (avoids html2canvas black box issue)
    const placeholder = container.querySelector('#cam-placeholder') as HTMLElement | null;
    if (placeholder && formattedImage) {
      const cleanBase64 = formattedImage.startsWith('data:image')
        ? formattedImage
        : `data:image/png;base64,${formattedImage}`;

      const containerRect = container.getBoundingClientRect();
      const placeholderRect = placeholder.getBoundingClientRect();

      const pxToMm = pdfWidth / containerRect.width;
      const xPos = (placeholderRect.left - containerRect.left) * pxToMm;
      const yPos = (placeholderRect.top - containerRect.top) * pxToMm;
      const width = placeholderRect.width * pxToMm;
      const height = placeholderRect.height * pxToMm;

      doc.addImage(cleanBase64, 'PNG', xPos, yPos, width, height, undefined, 'FAST');
    }

    doc.save(`MedVision_MultiPathology_${patient.name.replace(/\s+/g, '_')}_${result.examination_id.slice(0, 6)}.pdf`);
  } catch (error) {
    console.error('Failed to generate Multi-Label PDF report:', error);
  } finally {
    document.body.removeChild(container);
  }
};
