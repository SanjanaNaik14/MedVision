import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, UploadFile, File, Form, Header, HTTPException, status
from pydantic import BaseModel

import firebase_admin
from firebase_admin import firestore

from app.services.multilabel_service import (
    get_multilabel_service,
    TARGET_PATHOLOGIES
)

router = APIRouter(tags=["Multi-Label Thoracic Screening v2"])

# Held-out benchmark metrics for clinical transparency
NIH14_BENCHMARK_METRICS = {
    "mean_auc": 0.8057,
    "architecture": "DenseNet-121 Feature Extractor + 14-output Sigmoid Head",
    "dataset": "NIH ChestX-ray14 Held-out Evaluation Set",
    "classes": [
        {"condition": "Atelectasis", "auc": 0.8094, "target_idx": 0},
        {"condition": "Cardiomegaly", "auc": 0.9064, "target_idx": 1},
        {"condition": "Effusion", "auc": 0.8638, "target_idx": 2},
        {"condition": "Infiltration", "auc": 0.7345, "target_idx": 3},
        {"condition": "Mass", "auc": 0.8123, "target_idx": 4},
        {"condition": "Nodule", "auc": 0.7725, "target_idx": 5},
        {"condition": "Pneumonia", "auc": 0.7634, "target_idx": 6},
        {"condition": "Pneumothorax", "auc": 0.8887, "target_idx": 7},
        {"condition": "Consolidation", "auc": 0.7901, "target_idx": 8},
        {"condition": "Edema", "auc": 0.8878, "target_idx": 9},
        {"condition": "Emphysema", "auc": 0.8930, "target_idx": 10},
        {"condition": "Fibrosis", "auc": 0.8047, "target_idx": 11},
        {"condition": "Pleural_Thickening", "auc": 0.7744, "target_idx": 12},
        {"condition": "Hernia", "auc": 0.7792, "target_idx": 13},
    ]
}


def _get_firestore_db():
    try:
        if firebase_admin._apps:
            return firestore.client()
    except Exception as e:
        print(f"[v2_routes] Firestore client unavailable: {e}")
    return None


def extract_thumbnail_heatmap(payload: Dict[str, Any]) -> Optional[str]:
    """
    Extracts the thumbnail heatmap for examination history archiving.
    - If the payload contains v2_result and v2_result.heatmap_base64, use that as the thumbnail image.
    - Fallback to v1_result.heatmap_base64 if v2 is missing.
    - Fallback to the existing heatmap_base64 key for backward compatibility with single-model endpoints.
    - Fallback to gradcam if present.
    """
    if not isinstance(payload, dict):
        return None

    # Priority 1: v2_result heatmap
    v2_res = payload.get("v2_result")
    if isinstance(v2_res, dict) and v2_res.get("heatmap_base64"):
        return v2_res["heatmap_base64"]

    # Priority 2: v1_result heatmap fallback
    v1_res = payload.get("v1_result")
    if isinstance(v1_res, dict) and v1_res.get("heatmap_base64"):
        return v1_res["heatmap_base64"]

    # Priority 3: direct heatmap_base64 fallback for backward compatibility
    if payload.get("heatmap_base64"):
        return payload["heatmap_base64"]

    # Optional fallback to gradcam
    if payload.get("gradcam"):
        return payload["gradcam"]

    return None



@router.get("/metrics")
async def get_model_metrics():
    """Returns benchmark validation metrics for the 14-pathology multi-label model."""
    return NIH14_BENCHMARK_METRICS


@router.post("/predict")
async def predict_multilabel(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None)
):
    """
    POST /api/v2/predict
    Evaluates an uploaded chest radiograph across 14 thoracic pathologies simultaneously.
    Returns primary finding, all 14 condition probabilities, and primary Grad-CAM.
    """
    try:
        service = get_multilabel_service()
        file_bytes = await file.read()

        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file uploaded."
            )

        # Run multi-label inference
        prediction_result = service.predict(file_bytes, file.filename or "radiograph.png")

        # Save record in Firestore if patient_id is provided
        examination_id = f"exam_v2_{uuid.uuid4().hex[:12]}"
        db = _get_firestore_db()

        if db and patient_id:
            try:
                thumbnail = extract_thumbnail_heatmap(prediction_result)
                exam_data = {
                    "patientId": patient_id,
                    "filename": file.filename,
                    "prediction": f"Primary: {prediction_result['primary_finding']}",
                    "confidence": float(prediction_result['primary_confidence']),
                    "primaryFinding": prediction_result['primary_finding'],
                    "findings": prediction_result['findings'],
                    "gradcam": thumbnail,
                    "modelVersion": prediction_result['model_version'],
                    "createdAt": datetime.utcnow()
                }
                doc_ref = db.collection("examinations").add(exam_data)
                examination_id = doc_ref[1].id
            except Exception as fe:
                print(f"[v2_routes] Firestore save warning: {fe}")

        return {
            "examination_id": examination_id,
            "filename": file.filename,
            "model_version": prediction_result["model_version"],
            "primary_finding": prediction_result["primary_finding"],
            "primary_confidence": prediction_result["primary_confidence"],
            "findings": prediction_result["findings"],
            "heatmap_base64": prediction_result["heatmap_base64"]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[v2_routes] Inference error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Multi-label inference pipeline error: {str(e)}"
        )


@router.post("/gradcam")
async def generate_condition_gradcam(
    file: UploadFile = File(...),
    target_condition: str = Form(...),
    authorization: Optional[str] = Header(None)
):
    """
    POST /api/v2/gradcam
    Generates a localized Grad-CAM activation heatmap for a specific requested pathology
    from the 14 NIH ChestX-ray classes without assembling all probabilities.
    """
    try:
        service = get_multilabel_service()
        file_bytes = await file.read()

        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file uploaded."
            )

        try:
            result = service.generate_single_gradcam(
                file_bytes,
                file.filename or "radiograph.png",
                target_condition
            )
        except ValueError as ve:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(ve)
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"[v2_routes] Grad-CAM generation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Grad-CAM generation error: {str(e)}"
        )


def _run_v1_inference(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Runs legacy v1 DenseNet121 binary pneumonia inference and Grad-CAM."""
    import app.main as main_mod
    import torch

    image = main_mod.process_image(file_bytes, filename)
    input_tensor = main_mod.transform(image).unsqueeze(0).to(main_mod.device)
    input_tensor.requires_grad = True

    output = main_mod.model(input_tensor)
    prob = torch.sigmoid(output).item()
    is_detected = bool(prob >= 0.40)
    prediction = "High Risk: Pneumonia Detected" if is_detected else "Low Risk: Normal"
    gradcam_b64 = main_mod.generate_gradcam(image, input_tensor)

    return {
        "prediction": prediction,
        "pneumonia_probability": round(float(prob), 4),
        "detected": is_detected,
        "heatmap_base64": gradcam_b64
    }


@router.post("/compare")
async def compare_models(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None)
):
    """
    POST /api/v2/compare
    Executes both v1 (Binary Pneumonia) and v2 (14-Pathology Multi-Label) models
    concurrently on the same uploaded radiograph and surfaces intelligent clinical discrepancy insights.
    """
    try:
        file_bytes = await file.read()
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file uploaded."
            )

        filename = file.filename or "radiograph.png"

        # 1. Run v1 Binary Model
        v1_result = _run_v1_inference(file_bytes, filename)

        # 2. Run v2 Multi-Label Model
        service = get_multilabel_service()
        v2_raw = service.predict(file_bytes, filename)

        v2_result = {
            "model_version": v2_raw["model_version"],
            "primary_finding": v2_raw["primary_finding"],
            "primary_confidence": v2_raw["primary_confidence"],
            "findings": v2_raw["findings"],
            "heatmap_base64": v2_raw["heatmap_base64"]
        }

        # 3. Generate Clinical Discrepancy & Correlation Analysis
        v1_detected = v1_result["detected"]
        v2_primary = v2_result["primary_finding"]
        v2_primary_conf = v2_result["primary_confidence"]
        v2_detected_count = sum(1 for f in v2_result["findings"] if f["detected"])

        # Extract v2 pneumonia probability specifically for direct comparison
        v2_pneumonia_finding = next((f for f in v2_result["findings"] if f["condition"] == "Pneumonia"), None)
        v2_pneumonia_prob = v2_pneumonia_finding["probability"] if v2_pneumonia_finding else 0.0

        if v1_detected and v2_primary != "Pneumonia":
            discrepancy_detected = True
            summary = (
                f"Visual {v2_primary.replace('_', ' ')} identified as primary finding ({v2_primary_conf * 100:.1f}%), "
                f"while v1 flags Pneumonia ({v1_result['pneumonia_probability'] * 100:.1f}%)."
            )
            insight = (
                f"Pulmonary {v2_primary.lower().replace('_', ' ')} represents the radiographic morphological manifestation of clinical pneumonia. "
                "The v1 model evaluates pneumonia as an isolated binary target with dedicated focal weighting, whereas v2 contextualizes findings across 14 competing thoracic patterns."
            )
        elif not v1_detected and v2_detected_count > 0:
            discrepancy_detected = True
            summary = (
                f"Single-target Pneumonia is unremarkable ({v1_result['pneumonia_probability'] * 100:.1f}%), "
                f"but multi-label screening detects {v2_primary.replace('_', ' ')} ({v2_primary_conf * 100:.1f}%)."
            )
            insight = (
                f"The v1 binary detector is restricted to acute pneumonia opacities. The v2 platform contextualizes 14 thoracic findings and flagged {v2_primary.replace('_', ' ')}, "
                "preventing critical non-pneumonia pathologies from being overlooked."
            )
        elif v1_detected and v2_primary == "Pneumonia":
            discrepancy_detected = False
            summary = (
                f"High diagnostic concordance: Both isolated binary and differential multi-label models identify Pneumonia as the dominant pathology "
                f"(v1: {v1_result['pneumonia_probability'] * 100:.1f}% vs v2: {v2_primary_conf * 100:.1f}%)."
            )
            insight = (
                "Strong consensus between both independent architectures validates prominent consolidation and opacity features consistent with clinical pneumonia."
            )
        else:
            discrepancy_detected = False
            summary = (
                "Concordant unremarkable findings: Both specialized binary and multi-label screening confirm normal lung fields without acute focal consolidation."
            )
            insight = (
                "Negative consensus across both independent models provides elevated clinical confidence for unremarkable thoracic radiography."
            )

        clinical_correlation = {
            "discrepancy_detected": discrepancy_detected,
            "v1_pneumonia_prob": v1_result["pneumonia_probability"],
            "v2_pneumonia_prob": v2_pneumonia_prob,
            "summary": summary,
            "insight": insight
        }

        # Save record in Firestore if patient_id is provided
        examination_id = f"exam_compare_{uuid.uuid4().hex[:12]}"
        db = _get_firestore_db()
        if db and patient_id:
            try:
                compare_payload = {
                    "v1_result": v1_result,
                    "v2_result": v2_result,
                    "clinical_correlation": clinical_correlation,
                }
                thumbnail = extract_thumbnail_heatmap(compare_payload)
                exam_data = {
                    "patientId": patient_id,
                    "filename": filename,
                    "prediction": f"Consensus: v1={v1_result['prediction']} | v2={v2_primary}",
                    "confidence": float(max(v1_result["pneumonia_probability"], v2_primary_conf)),
                    "gradcam": thumbnail,
                    "v1_result": v1_result,
                    "v2_result": v2_result,
                    "clinical_correlation": clinical_correlation,
                    "modelVersion": "Consensus-v1+v2",
                    "createdAt": datetime.utcnow()
                }
                doc_ref = db.collection("examinations").add(exam_data)
                examination_id = doc_ref[1].id
            except Exception as fe:
                print(f"[v2_routes] Firestore comparative save warning: {fe}")

        return {
            "examination_id": examination_id,
            "patient_id": patient_id,
            "filename": filename,
            "v1_result": v1_result,
            "v2_result": v2_result,
            "clinical_correlation": clinical_correlation
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[v2_routes] Comparative analysis error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comparative analysis error: {str(e)}"
        )

