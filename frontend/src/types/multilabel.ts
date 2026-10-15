export interface FindingItem {
  condition: string;
  class_index: number;
  probability: number;
  detected: boolean;
}

export interface MultiLabelPredictionResult {
  examination_id: string;
  filename: string;
  model_version: string;
  primary_finding: string;
  primary_confidence: number;
  findings: FindingItem[];
  heatmap_base64: string;
}

export interface BenchmarkClassMetric {
  condition: string;
  auc: number;
  target_idx: number;
}

export interface BenchmarkMetrics {
  mean_auc: number;
  architecture: string;
  dataset: string;
  classes: BenchmarkClassMetric[];
}

export interface V1ComparisonResult {
  prediction: string;
  pneumonia_probability: number;
  detected: boolean;
  heatmap_base64: string;
}

export interface ClinicalCorrelation {
  discrepancy_detected: boolean;
  v1_pneumonia_prob?: number;
  v2_pneumonia_prob?: number;
  summary: string;
  insight: string;
}

export interface ComparativeAnalysisResult {
  examination_id: string;
  patient_id?: string;
  filename: string;
  v1_result: V1ComparisonResult;
  v2_result: {
    model_version?: string;
    primary_finding: string;
    primary_confidence: number;
    findings: FindingItem[];
    heatmap_base64: string;
  };
  clinical_correlation: ClinicalCorrelation;
}

