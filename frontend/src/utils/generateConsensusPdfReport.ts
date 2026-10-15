import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { type ComparativeAnalysisResult } from '../types/multilabel';

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

export const generateConsensusPdfReport = async (
  patient: PatientData,
  result: ComparativeAnalysisResult
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

  // Format base64 images
  const v1Heatmap = result.v1_result.heatmap_base64 || '';
  const v1Clean = v1Heatmap.startsWith('data:image')
    ? v1Heatmap
    : (v1Heatmap ? `data:image/png;base64,${v1Heatmap}` : '');

  const v2Heatmap = result.v2_result.heatmap_base64 || '';
  const v2Clean = v2Heatmap.startsWith('data:image')
    ? v2Heatmap
    : (v2Heatmap ? `data:image/png;base64,${v2Heatmap}` : '');

  console.log('Consensus PDF Heatmap URIs: v1=', v1Clean.length, 'v2=', v2Clean.length);

  // Top 3 differential findings from v2
  const topFindings = [...result.v2_result.findings]
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);

  const topFindingsHtml = topFindings
    .map(
      (f, idx) => `
        <tr style="border-bottom: 1px solid #f1f5f9; font-size: 11px;">
          <td style="padding: 5px 8px; font-weight: 600; color: #163b5c;">${idx + 1}. ${f.condition.replace('_', ' ')}</td>
          <td style="padding: 5px 8px; text-align: center;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; ${
              f.detected
                ? 'background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5;'
                : 'background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0;'
            }">
              ${f.detected ? 'DETECTED' : 'UNREMARKABLE'}
            </span>
          </td>
          <td style="padding: 5px 8px; text-align: right; font-family: monospace; font-weight: 700; color: #163b5c;">
            ${(f.probability * 100).toFixed(1)}%
          </td>
        </tr>
      `
    )
    .join('');

  const isDiscrepant = result.clinical_correlation.discrepancy_detected;

  container.innerHTML = `
    <!-- Header -->
    <div style="border-bottom: 2px solid #163b5c; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h1 style="margin: 0; color: #163b5c; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">MedVision</h1>
        <p style="margin: 3px 0 0 0; color: #315d7d; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600;">
          Dual-Model Consensus & Clinical Discrepancy Evaluation Report
        </p>
      </div>
      <div style="text-align: right; color: #64748b; font-size: 10px;">
        <p style="margin: 0; font-family: monospace;">Pipeline: Consensus (DenseNet121 v1 + v2)</p>
        <p style="margin: 2px 0 0 0;">Exam ID: ${result.examination_id.slice(0, 14)}</p>
        <p style="margin: 2px 0 0 0;">Date: ${dateStr}</p>
      </div>
    </div>

    <!-- Patient Context Card -->
    <div style="background-color: #f8fafc; border: 1px solid #d9e2ea; border-radius: 6px; padding: 12px 16px; margin-bottom: 18px;">
      <h2 style="margin: 0 0 8px 0; font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; font-weight: 700;">
        Patient Profile & Source Radiograph
      </h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 12px;">
        <div><strong>Name:</strong> ${patient.name}</div>
        <div><strong>Patient Code:</strong> ${patient.patientCode}</div>
        <div><strong>Age / Sex:</strong> ${patient.age} Y / ${patient.sex}</div>
        <div><strong>Blood Group:</strong> ${patient.bloodGroup || 'N/A'}</div>
        <div><strong>Known Allergies:</strong> ${patient.allergies || 'None recorded'}</div>
        <div><strong>Filename:</strong> ${result.filename}</div>
      </div>
    </div>

    <!-- Dual-Model Comparison Matrix -->
    <div style="display: flex; gap: 14px; margin-bottom: 18px;">
      <!-- v1 Specialized Binary Target Card -->
      <div style="flex: 1; border: 1px solid #d0dfeb; background: #eaf1f6; border-radius: 6px; padding: 12px;">
        <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #315d7d; display: block;">
          Model 1: Specialized Binary Detector
        </span>
        <div style="font-size: 15px; font-weight: 800; color: #163b5c; margin-top: 4px;">
          Pneumonia: ${(result.v1_result.pneumonia_probability * 100).toFixed(1)}%
        </div>
        <div style="font-size: 11px; font-weight: 600; color: ${result.v1_result.detected ? '#991b1b' : '#166534'}; margin-top: 2px;">
          ${result.v1_result.detected ? 'HIGH RISK (Sensitivity Threshold ≥40%)' : 'NORMAL / UNREMARKABLE (<40%)'}
        </div>
        <p style="margin: 4px 0 0 0; font-size: 9px; color: #64748b;">
          Architecture: DenseNet-121 Binary Head • Focus: Acute Focal Opacity
        </p>
      </div>

      <!-- v2 Differential Multi-Target Card -->
      <div style="flex: 1; border: 1px solid #d0dfeb; background: #eaf1f6; border-radius: 6px; padding: 12px;">
        <span style="font-size: 9px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #315d7d; display: block;">
          Model 2: Differential Screening Platform (14 Classes)
        </span>
        <div style="font-size: 15px; font-weight: 800; color: #163b5c; margin-top: 4px;">
          Top Finding: ${result.v2_result.primary_finding.replace('_', ' ')} (${(result.v2_result.primary_confidence * 100).toFixed(1)}%)
        </div>
        <div style="font-size: 11px; font-weight: 600; color: #163b5c; margin-top: 2px;">
          Contextualized Differential Spectrum
        </div>
        <p style="margin: 4px 0 0 0; font-size: 9px; color: #64748b;">
          Architecture: DenseNet-121 14-Sigmoid Head • Test Mean AUC: 0.8057
        </p>
      </div>
    </div>

    <!-- Intelligent Clinical Discrepancy & Correlation Banner -->
    <div style="background: ${isDiscrepant ? '#fffbeb' : '#f0fdf4'}; border: 1px solid ${isDiscrepant ? '#fde68a' : '#86efac'}; border-radius: 6px; padding: 14px 16px; margin-bottom: 18px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-size: 10px; font-mono; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: ${isDiscrepant ? '#92400e' : '#166534'};">
          ${isDiscrepant ? '⚠ Radiological vs. Etiological Correlation Alert' : '✓ High Concordance Agreement'}
        </span>
        <span style="padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; ${
          isDiscrepant ? 'background: #fef3c7; color: #92400e; border: 1px solid #f59e0b;' : 'background: #dcfce7; color: #166534; border: 1px solid #4ade80;'
        }">
          ${isDiscrepant ? 'DISCREPANCY INSIGHT' : 'CONSENSUS VERIFIED'}
        </span>
      </div>
      <div style="font-size: 12px; font-weight: 700; color: #163b5c; margin-bottom: 4px;">
        ${result.clinical_correlation.summary}
      </div>
      <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.45;">
        ${result.clinical_correlation.insight}
      </p>
    </div>

    <!-- Side-by-Side Dual Explainability Heatmaps -->
    <div style="margin-bottom: 18px;">
      <h3 style="margin: 0 0 8px 0; font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
        Side-by-Side Explainability Heatmaps
      </h3>
      <div style="display: flex; gap: 16px; justify-content: center;">
        <!-- Left: v1 Grad-CAM Placeholder -->
        <div style="flex: 1; text-align: center;">
          <div style="font-size: 10px; font-weight: 700; color: #163b5c; margin-bottom: 4px;">
            v1 Model: Pneumonia Focal Localization
          </div>
          <div id="consensus-cam-v1" style="width: 220px; height: 220px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px;"></div>
          <p style="margin: 4px 0 0 0; font-size: 9px; color: #64748b;">Target: Pneumonia (${(result.v1_result.pneumonia_probability * 100).toFixed(1)}%)</p>
        </div>

        <!-- Right: v2 Grad-CAM Placeholder -->
        <div style="flex: 1; text-align: center;">
          <div style="font-size: 10px; font-weight: 700; color: #163b5c; margin-bottom: 4px;">
            v2 Model: ${result.v2_result.primary_finding.replace('_', ' ')} Primary Localization
          </div>
          <div id="consensus-cam-v2" style="width: 220px; height: 220px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px;"></div>
          <p style="margin: 4px 0 0 0; font-size: 9px; color: #64748b;">Target: ${result.v2_result.primary_finding.replace('_', ' ')} (${(result.v2_result.primary_confidence * 100).toFixed(1)}%)</p>
        </div>
      </div>
    </div>

    <!-- Top Differential Spectrum Table -->
    <div style="margin-bottom: 18px;">
      <h3 style="margin: 0 0 6px 0; font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
        Leading Differential Candidates (Multi-Label Spectrum)
      </h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1.5px solid #cbd5e1; font-size: 9px; text-transform: uppercase; color: #64748b;">
            <th style="padding: 4px 8px; text-align: left;">Pathology Candidate</th>
            <th style="padding: 4px 8px; text-align: center;">Threshold Status</th>
            <th style="padding: 4px 8px; text-align: right;">Model Probability</th>
          </tr>
        </thead>
        <tbody>
          ${topFindingsHtml}
        </tbody>
      </table>
    </div>

    <!-- Attending Physician Notes & Signature Block -->
    <div style="border-top: 1px solid #e2e8f0; padding-top: 14px;">
      <h3 style="margin: 0 0 6px 0; font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
        Attending Physician Clinical Notes & Final Determination
      </h3>
      <div style="border: 1px dashed #cbd5e1; height: 50px; border-radius: 4px; margin-bottom: 12px;"></div>

      <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: #64748b;">
        <div>
          <p style="margin: 0 0 4px 0;">Physician Signature: ___________________________</p>
          <p style="margin: 0;">Date: ________________________</p>
        </div>
        <div style="max-width: 330px; text-align: right; font-size: 8px; color: #94a3b8; line-height: 1.3;">
          <strong>Clinical Decision Protocol:</strong> MedVision Dual-Model Consensus synthesizes independent binary and multi-label deep learning networks to surface morphological vs. etiological discrepancies. Findings must be validated by a licensed physician before clinical intervention.
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

    // 1. Add background structure
    doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // 2. Overlay v1 Grad-CAM directly onto #consensus-cam-v1 coordinates
    const p1 = container.querySelector('#consensus-cam-v1') as HTMLElement | null;
    if (p1 && v1Clean) {
      const containerRect = container.getBoundingClientRect();
      const p1Rect = p1.getBoundingClientRect();
      const pxToMm = pdfWidth / containerRect.width;

      const xPos1 = (p1Rect.left - containerRect.left) * pxToMm;
      const yPos1 = (p1Rect.top - containerRect.top) * pxToMm;
      const w1 = p1Rect.width * pxToMm;
      const h1 = p1Rect.height * pxToMm;

      doc.addImage(v1Clean, 'PNG', xPos1, yPos1, w1, h1, undefined, 'FAST');
    }

    // 3. Overlay v2 Grad-CAM directly onto #consensus-cam-v2 coordinates
    const p2 = container.querySelector('#consensus-cam-v2') as HTMLElement | null;
    if (p2 && v2Clean) {
      const containerRect = container.getBoundingClientRect();
      const p2Rect = p2.getBoundingClientRect();
      const pxToMm = pdfWidth / containerRect.width;

      const xPos2 = (p2Rect.left - containerRect.left) * pxToMm;
      const yPos2 = (p2Rect.top - containerRect.top) * pxToMm;
      const w2 = p2Rect.width * pxToMm;
      const h2 = p2Rect.height * pxToMm;

      doc.addImage(v2Clean, 'PNG', xPos2, yPos2, w2, h2, undefined, 'FAST');
    }

    doc.save(`MedVision_Consensus_${patient.name.replace(/\s+/g, '_')}_${result.examination_id.slice(0, 6)}.pdf`);
  } catch (error) {
    console.error('Failed to generate Consensus PDF report:', error);
  } finally {
    document.body.removeChild(container);
  }
};
