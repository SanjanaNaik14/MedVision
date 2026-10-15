# MedVision — AI-Assisted Chest Radiograph Screening & Clinical Decision Support

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.115-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/ML-PyTorch_2.x-EE4C2C.svg?logo=pytorch&logoColor=white)](https://pytorch.org)
[![React](https://img.shields.io/badge/Frontend-React_19_+_TypeScript-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Bundler-Vite_8-646CFF.svg?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Firebase](https://img.shields.io/badge/Cloud-Firebase_Auth_%26_Firestore-FFCA28.svg?logo=firebase&logoColor=black)](https://firebase.google.com)

MedVision is an end-to-end, web-based clinical decision support system (CDSS) prototype designed to assist healthcare professionals in screening digital chest radiographs (DICOM, PNG, JPEG). The platform couples deep convolutional neural networks (DenseNet-121) with gradient-weighted visual explainability (Grad-CAM), multi-pathology differential analysis, patient longitudinal history, and clinical PDF report generation.

> **Medical & Regulatory Disclaimer**: MedVision is strictly an educational research prototype and clinical decision-support tool. It is **not** an FDA-cleared, CE-marked, or clinically validated diagnostic medical device. It does not provide medical diagnoses or establish treatment plans. All model outputs and visual overlays must be validated by a certified radiologist or licensed medical professional before making any clinical decisions.

---

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Key Features](#2-key-features)
- [3. AI Models & Inference Pipelines](#3-ai-models--inference-pipelines)
  - [3.1 Model Architectures](#31-model-architectures)
  - [3.2 The 14 Supported Thoracic Findings](#32-the-14-supported-thoracic-findings)
  - [3.3 Preprocessing & Inference Workflow](#33-preprocessing--inference-workflow)
  - [3.4 Interpretation of Sigmoid Scores](#34-interpretation-of-sigmoid-scores)
- [4. Model Evaluation & Benchmark Metrics](#4-model-evaluation--benchmark-metrics)
  - [4.1 RSNA Binary Pneumonia Model](#41-rsna-binary-pneumonia-model)
  - [4.2 NIH ChestX-ray14 Multi-Label Model](#42-nih-chestx-ray14-multi-label-model)
- [5. Technology Stack](#5-technology-stack)
- [6. System Architecture](#6-system-architecture)
- [7. Project Structure](#7-project-structure)
- [8. Prerequisites & Installation](#8-prerequisites--installation)
- [9. Environment Configuration](#9-environment-configuration)
- [10. Running the Application](#10-running-the-application)
- [11. API Documentation](#11-api-documentation)
- [12. Database & Data Flow](#12-database--data-flow)
- [13. Model Checkpoints & Datasets](#13-model-checkpoints--datasets)
- [14. Testing & Troubleshooting](#14-testing--troubleshooting)
- [15. Limitations & Responsible Use](#15-limitations--responsible-use)
- [16. Future Roadmap](#16-future-roadmap)

---

## 1. Project Overview

Chest radiography is the most widely performed diagnostic imaging examination worldwide. However, high-volume clinical workflows and shortages of specialized radiologists can create interpretation bottlenecks. In emergency and primary care environments, preliminary algorithmic triage can assist clinicians in identifying acute conditions and prioritizing urgent scans.

MedVision addresses this challenge by providing:
- **Rapid Initial Screening**: Instant inference on chest radiographs using calibrated neural network backbones.
- **Visual Explainability**: Transparent Grad-CAM localization so clinicians can verify anatomical regions driving model predictions.
- **Differential Context**: Multi-label thoracic screening across 14 distinct radiological patterns to prevent premature closure on a single diagnosis.
- **Dual-Model Comparative Review**: Concurrent evaluation comparing focused single-target models with comprehensive multi-target screening to surface discrepancies between visual tissue patterns (e.g., Infiltration) and clinical diagnoses (e.g., Pneumonia).

---

## 2. Key Features

- **Triple Screening Modes in Dashboard**:
  - `Mode 1 — Pneumonia Screening (v1 Baseline)`: High-sensitivity binary classification for pneumonia detection with dedicated Grad-CAM overlay.
  - `Mode 2 — Comprehensive Thoracic Screening (14 Findings - v2)`: 14-pathology multi-label screening with primary finding identification and dynamic condition-specific Grad-CAM heatmaps.
  - `Mode 3 — Comparative Dual-Model View (Second Opinion)`: Parallel inference executing v1 and v2 simultaneously on the same uploaded radiograph, featuring side-by-side PACS viewers, a diagnostic matrix, and automated clinical correlation alerts.
- **Hospital-Ready Format Support**: Native parsing of 16-bit medical DICOM (`.dcm`) files via `pydicom` with min-max window normalization, alongside standard PNG and JPEG formats.
- **Interactive Spatial Explainability**: Dual-hooked Grad-CAM layers highlighting spatial regions of interest directly on the anatomical scan. In Mode 2, clinicians can interactively select any of the 14 conditions to generate class-specific overlays on demand.
- **Patient Directory & Lifecycle Management**:
  - Longitudinal patient registry indexed by clinician identity.
  - Examination timeline tracking past scans, confidence scores, and archived Grad-CAM overlays.
  - Safe record deletion endpoint and UI action with confirmation dialog and instant state synchronization.
- **Three Specialized Clinical PDF Generators**:
  - Single-condition binary pneumonia diagnostic summary.
  - 14-finding differential thoracic report with risk stratification bars and heatmap visualization.
  - Dual-model consensus second-opinion report summarizing comparative findings and clinical correlation insights.
- **Responsive Clinical Design System**: Professional dark/slate palette (`#163B5C`, `#315D7D`, `#0B131C`, `#EAF1F6`), responsive navigation, session route guards, and accessible typography.

---

## 3. AI Models & Inference Pipelines

### 3.1 Model Architectures

MedVision incorporates two distinct deep learning pipelines based on the **DenseNet-121** (Densely Connected Convolutional Networks) architecture:

1. **v1 Specialized Binary Pneumonia Model (`densenet121_pneumonia.pth`)**:
   - **Backbone**: DenseNet-121 feature extractor.
   - **Classification Head**: Single linear output (`in_features=1024 -> out_features=1`) passed through a sigmoid activation function.
   - **Loss Function & Weighting**: Binary Cross Entropy with positive sample weight ($3.0\times$) penalizing False Negatives.
   - **Calibrated Decision Cutoff**: Set at **0.40** to maximize recall/sensitivity in triage workflows.
   - **Grad-CAM Hook**: Registered on `model.features.denseblock4.denselayer16.conv2`.

2. **v2 NIH 14-Pathology Multi-Label Model (`densenet121_multilabel14.pth`)**:
   - **Backbone**: DenseNet-121 feature extractor.
   - **Classification Head**: Multi-label linear layer (`in_features=1024 -> out_features=14`) producing independent raw logits for each thoracic pathology.
   - **Loss Function**: Multi-label Binary Cross Entropy (`BCEWithLogitsLoss`).
   - **Multi-Label Decision Cutoff**: Default binary flag threshold set at **0.50** per condition.
   - **Primary Finding**: Determined by $\operatorname{argmax}(\sigma(\mathbf{z}))$, selecting the finding with the highest activation score.
   - **Grad-CAM Hook**: Registered on `model.features.norm5` (the final batch normalization layer preceding global average pooling).

### 3.2 The 14 Supported Thoracic Findings

The multi-label model evaluates 14 thoracic findings defined by the NIH ChestX-ray14 dataset. The class indices and label names are strictly ordered as follows:

| Index | Pathology Class | Clinical Description |
|:---:|:---|:---|
| **0** | `Atelectasis` | Partial or complete collapse of the lung or lung lobe |
| **1** | `Cardiomegaly` | Enlargement of the cardiac silhouette beyond normal cardiothoracic ratio |
| **2** | `Effusion` | Abnormal accumulation of fluid within the pleural cavity |
| **3** | `Infiltration` | Radiographic substance denser than air (fluid, pus, blood) in lung parenchyma |
| **4** | `Mass` | Pulmonary lesion greater than 3 cm in diameter |
| **5** | `Nodule` | Discrete pulmonary opacity less than or equal to 3 cm in diameter |
| **6** | `Pneumonia` | Inflammatory consolidation of lung tissue commonly of infectious etiology |
| **7** | `Pneumothorax` | Presence of air or gas in the cavity between lungs and chest wall |
| **8** | `Consolidation` | Solidification of lung tissue resulting from alveolar fluid accumulation |
| **9** | `Edema` | Accumulation of fluid in lung tissues and air spaces, often cardiogenic |
| **10** | `Emphysema` | Permanent enlargement of airspaces distal to terminal bronchioles |
| **11** | `Fibrosis` | Scarring and thickening of lung interstitium |
| **12** | `Pleural_Thickening` | Fibrous thickening of the lung apical or costal pleura |
| **13** | `Hernia` | Diaphragmatic or thoracic herniation of abdominal viscera |

### 3.3 Preprocessing & Inference Workflow

Every uploaded radiograph is processed through the following deterministic pipeline:

```text
[Input Radiograph File]
         │
         ├── .dcm (DICOM)  ──► pydicom extracts 16-bit pixel array ──► Min-Max Windowing (0-255 uint8)
         └── .png / .jpg   ──► PIL decodes image bytes
         │
         ▼
[PIL Image (RGB)]
         │
         ├── Resize to 224 × 224 pixels (Bilinear interpolation)
         ├── Convert to PyTorch Tensor: shape [3, 224, 224], range [0.0, 1.0]
         └── Normalize with ImageNet statistics:
               mean = [0.485, 0.456, 0.406]
               std  = [0.229, 0.224, 0.225]
         │
         ▼
[Input Tensor (1, 3, 224, 224)]
         │
         ├── Forward pass through DenseNet-121 backbone
         ├── Raw Logits z ──► Sigmoid activation σ(z) ──► Output Scores [0.0, 1.0]
         └── Backpropagation from target class score ──► Gradients & Activations
               ├── Global Average Pooling of gradients -> channel weights
               ├── Linear combination with feature maps -> ReLU
               └── Jet colormap overlay onto original radiograph (40% CAM, 60% scan)
```

### 3.4 Interpretation of Sigmoid Scores

> [!IMPORTANT]
> **Sigmoid outputs are raw model activation scores, NOT automatically calibrated clinical probabilities.**
>
> In multi-label deep learning models trained with Binary Cross-Entropy, each output node produces an independent score $\sigma(z_i) = \frac{1}{1 + e^{-z_i}} \in (0, 1)$. These scores represent the model's relative feature activation for that class, conditioned on the training dataset distribution. They do **not** reflect Bayesian posterior probabilities of disease presence in a real-world clinical population, nor have they undergone Platt scaling or isotonic regression across prospective clinical cohorts.

---

## 4. Model Evaluation & Benchmark Metrics

### 4.1 RSNA Binary Pneumonia Model

The binary pneumonia model was evaluated on the held-out test split of the RSNA Pneumonia Detection Challenge dataset:

| Metric | Evaluated Score | Note / Operational Context |
|:---|:---:|:---|
| **ROC-AUC** | **0.8940** | Discriminative ability across binary classes |
| **Recall (Sensitivity)** | **74.07%** | Optimized at the 0.40 operating cutoff to mitigate False Negatives |
| **Precision** | **73.39%** | Positive predictive value at 0.40 operating cutoff |
| **F1-Score** | **73.73%** | Harmonic mean of precision and recall |
| **Overall Accuracy** | **83.28%** | Fraction of correct classifications on test split |
| **Operating Cutoff** | **0.40** | Lowered from 0.50 based on 3.0× False Negative loss weighting |

### 4.2 NIH ChestX-ray14 Multi-Label Model

The multi-label model checkpoint (`densenet121_multilabel14.pth`) was evaluated on a reconstructed test evaluation set derived from the NIH ChestX-ray14 dataset comprising **2,135 images across 550 patients**:

| Finding (Pathology) | Target Index | Evaluated ROC-AUC |
|:---|:---:|:---:|
| **Cardiomegaly** | 1 | **0.9064** |
| **Emphysema** | 10 | **0.8930** |
| **Pneumothorax** | 7 | **0.8887** |
| **Edema** | 9 | **0.8878** |
| **Effusion** | 2 | **0.8638** |
| **Mass** | 4 | **0.8123** |
| **Atelectasis** | 0 | **0.8094** |
| **Fibrosis** | 11 | **0.8047** |
| **Consolidation** | 8 | **0.7901** |
| **Hernia** | 13 | **0.7792** |
| **Pleural Thickening** | 12 | **0.7744** |
| **Nodule** | 5 | **0.7725** |
| **Pneumonia** | 6 | **0.7634** |
| **Infiltration** | 3 | **0.7345** |
| **Mean ROC-AUC** | — | **0.8057** |

> [!NOTE]
> **Evaluation Scope & Constraints**:
> - The reported mean ROC-AUC of **0.8057** was computed across the 13 findings with calculable AUC on this reconstructed split.
> - Exact identity between this evaluation split and the original official NIH split has **not been independently verified**.
> - These offline retrospective numbers do **not** constitute prospective clinical validation. Performance may vary significantly when deployed across different imaging hardware, patient demographics, or disease prevalences.

---

## 5. Technology Stack

### Frontend Application
- **Framework**: React 19 (`^19.2.8`), TypeScript (`~6.0.2`), Vite 8 (`^8.3.0`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite ^4.3.3`)
- **Routing**: React Router DOM v7 (`^7.18.4`)
- **Reporting & Visualization**: `jspdf` (`^4.2.1`), `html2canvas` (`^1.4.1`)
- **Authentication Client**: Firebase JS SDK (`^13.0.0`)

### Backend Services & Machine Learning
- **Framework**: FastAPI (`>=0.115.0`), ASGI Server: Uvicorn (`>=0.30.0`)
- **ML Framework**: PyTorch (`>=2.1.0`), Torchvision (`>=0.16.0`)
- **Data & Medical Imaging**: Pydicom (`>=2.4.4`), Pillow (`>=10.0.0`), OpenCV (`opencv-python`), NumPy, Pandas, Scikit-learn
- **Cloud Administration**: Firebase Admin SDK (`firebase-admin`)

### Cloud Infrastructure
- **Authentication**: Firebase Authentication (Email/Password session handling with JWTs)
- **Database**: Cloud Firestore (NoSQL document store for clinical data)

---

## 6. System Architecture

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT TIER (React 19 + Vite)                        │
│                                                                                  │
│   Landing Page (3D Visuals) ──► Clinician Auth (Login/Signup via Firebase Auth)  │
│                                           │                                      │
│                                           ▼                                      │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                        Screening Workspace (Dashboard)                   │   │
│   │  [Mode 1: Pneumonia v1]   [Mode 2: 14 Findings v2]   [Mode 3: Consensus] │   │
│   └──────────────────────────────────────┬───────────────────────────────────┘   │
│                                          │                                       │
│   Patient Management Directory           │ PDF Reporting Engines                 │
│   (List, Intake Form, Profiles, Deletion)│ (v1 Single, v2 Multi, Dual-Consensus) │
└──────────────────────────────────────────┼───────────────────────────────────────┘
                                           │
                        HTTP Multipart Upload (Image + Patient ID)
                        Authorization: Bearer <Firebase_ID_Token>
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            API TIER (FastAPI + Uvicorn)                          │
│                                                                                  │
│   /predict, /api/v1/predict   ──► DenseNet-121 Binary Pneumonia Pipeline         │
│   /api/v2/predict             ──► DenseNet-121 14-Finding Multi-Label Pipeline   │
│   /api/v2/gradcam             ──► Dynamic Class-Specific Grad-CAM Generator      │
│   /api/v2/compare             ──► Parallel Consensus & Discrepancy Engine        │
│   /api/v2/metrics             ──► Model Benchmark Metadata                       │
│   /api/patients/{patient_id}  ──► Patient Deletion & Lifecycle Management        │
└──────────────────────────────────────────┬───────────────────────────────────────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       PERSISTENCE TIER (Google Cloud Firestore)                  │
│                                                                                  │
│   /patients/{patientId}       ──► Demographics, Clinical History, Doctor UID     │
│   /examinations/{examId}      ──► Predictions, Scores, Grad-CAM Base64 Overlay   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Project Structure

```text
MedVision/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── patient_routes.py         # DELETE /api/patients/{id} endpoint
│   │   │   └── v2_routes.py              # /api/v2 endpoints (predict, gradcam, compare, metrics)
│   │   ├── models/
│   │   │   ├── densenet121_multilabel14.pth  # Multi-label model checkpoint (~28.5 MB)
│   │   │   └── densenet121_pneumonia.pth     # Binary pneumonia checkpoint (~28.4 MB)
│   │   ├── services/
│   │   │   └── multilabel_service.py     # MultiLabelDenseNetService class & Grad-CAM hook
│   │   ├── utils/                        # Backend helper functions
│   │   └── main.py                       # FastAPI entrypoint, CORS, v1 predict & Firestore wiring
│   ├── firebase-credentials.example.json # Safe template for Firebase Admin SDK service account
│   └── requirements.txt                  # Backend Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   │   └── anatomical_lungs_clinical.jpg # Hero visual for landing page
│   │   ├── components/
│   │   │   ├── AppLayout.tsx             # Workspace layout with disclaimer banner & navbar
│   │   │   ├── ComparativeAnalysisView.tsx# Mode 3 dual-model comparison viewer & matrix
│   │   │   ├── MultiLabelFindings.tsx    # Mode 2 diagnostic results & interactive CAM selector
│   │   │   ├── MultiLabelScreening.tsx   # Standalone 14-finding screening component
│   │   │   ├── Navbar.tsx                # Global navigation bar & session status
│   │   │   └── ProtectedRoute.tsx        # Firebase Auth route guard
│   │   ├── context/
│   │   │   └── AuthContext.tsx           # Firebase authentication context provider
│   │   ├── pages/
│   │   │   ├── AddPatient.tsx            # Patient intake registration form
│   │   │   ├── Dashboard.tsx             # Main screening workspace (Modes 1, 2, and 3)
│   │   │   ├── Landing.tsx               # Public landing page with visual preview
│   │   │   ├── Login.tsx                 # Clinician authentication login page
│   │   │   ├── PatientList.tsx           # Searchable directory with deletion controls
│   │   │   ├── PatientProfile.tsx        # Patient demographics & examination history
│   │   │   └── SignUp.tsx                # Clinician account creation page
│   │   ├── services/
│   │   │   ├── firebase.ts               # Client-side Firebase SDK initialization
│   │   │   └── patientService.ts         # Firestore patient CRUD helpers
│   │   ├── types/
│   │   │   └── multilabel.ts             # TypeScript interfaces for v2 & consensus data
│   │   ├── utils/
│   │   │   ├── generateConsensusPdfReport.ts   # Dual-model second opinion PDF generator
│   │   │   ├── generateMultiLabelPdfReport.ts  # 14-finding differential PDF generator
│   │   │   └── generatePdfReport.ts            # Binary pneumonia PDF generator
│   │   ├── App.tsx                       # Main application router
│   │   ├── index.css                     # Tailwind CSS v4 styling rules
│   │   └── main.tsx                      # Vite React entry point
│   ├── .env.example                      # Safe template for client Firebase environment variables
│   ├── package.json                      # Frontend dependencies & build scripts
│   └── vite.config.ts                    # Vite configuration with React & Tailwind plugins
│
├── ml/
│   ├── data/
│   │   └── processed/
│   │       ├── test_labels.csv           # RSNA test split ground truth labels
│   │       ├── train_labels.csv          # RSNA training labels
│   │       └── val_labels.csv            # RSNA validation labels
│   ├── models/                           # Mirror directory for ML training checkpoints
│   ├── src/
│   │   ├── dataset.py                    # PyTorch Dataset for DICOM loading
│   │   ├── evaluate.py                   # Model evaluation script for RSNA test split
│   │   └── train.py                      # Training script for binary pneumonia model
│   ├── make_subset.py                    # Stratified patient-level subset generator
│   └── requirements.txt                  # Machine learning training dependencies
│
└── README.md                             # Comprehensive project documentation
```

---

## 8. Prerequisites & Installation

### System Requirements
- **Python**: Version `3.10` or higher (tested on Python `3.13`)
- **Node.js**: Version `18.0` or higher (tested on Node `20+`)
- **Package Managers**: `pip` and `npm`

### Step 1: Clone Repository
```bash
git clone https://github.com/SanjanaNaik14/MedVision.git
cd MedVision
```

### Step 2: Backend Environment Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install opencv-python firebase-admin scikit-learn pandas
cd ..
```

### Step 3: Frontend Environment Setup
```bash
cd frontend
npm install
cd ..
```

---

## 9. Environment Configuration

### Frontend Configuration (`frontend/.env`)
Create a `.env` file inside the `frontend/` directory by copying the provided example template:

```bash
cp frontend/.env.example frontend/.env
```

Populate the environment variables with your Firebase project configuration (located in the Firebase Console under **Project Settings > General > Your apps**):

| Variable Name | Description | Source |
|:---|:---|:---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | Firebase Console > Project Settings |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication Domain | Firebase Console > Project Settings |
| `VITE_FIREBASE_PROJECT_ID` | Google Cloud / Firebase Project ID | Firebase Console > Project Settings |
| `VITE_FIREBASE_STORAGE_BUCKET` | Cloud Storage Bucket URL | Firebase Console > Project Settings |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Cloud Messaging Sender ID | Firebase Console > Project Settings |
| `VITE_FIREBASE_APP_ID` | Firebase Web Application ID | Firebase Console > Project Settings |

### Backend Configuration (`backend/firebase-credentials.json`)
The backend FastAPI service uses the Firebase Admin SDK for Firestore database persistence:

1. In the **Firebase Console**, navigate to **Project Settings > Service accounts**.
2. Click **Generate new private key** and download the credentials file.
3. Place the file at `backend/firebase-credentials.json`.
4. A sanitized reference schema is provided in `backend/firebase-credentials.example.json`.

> [!CAUTION]
> Never commit `firebase-credentials.json` or `.env` files to version control. Both files contain private keys and are excluded via `.gitignore`.

---

## 10. Running the Application

### 1. Launch the Backend API
From the project root:
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- **Base URL**: `http://127.0.0.1:8000`
- **Interactive OpenAPI Documentation**: `http://127.0.0.1:8000/docs`
- **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`

### 2. Launch the Frontend Development Server
In a separate terminal:
```bash
cd frontend
npm run dev
```
- **Local Application URL**: `http://localhost:5173` (or `http://localhost:5174`)

---

## 11. API Documentation

All endpoints expect either multipart form data (for inference uploads) or JSON payloads.

### 1. Binary Pneumonia Screening (v1)
- **Endpoint**: `POST /predict` (alias: `POST /api/v1/predict`)
- **Content-Type**: `multipart/form-data`
- **Headers**: `Authorization: Bearer <token>` (optional)
- **Form Fields**:
  - `file`: Binary image file (`.dcm`, `.png`, `.jpg`)
  - `patient_id`: String (Firestore patient ID)
- **Response** (`200 OK`):
  ```json
  {
    "examination_id": "exam_abc123456789",
    "filename": "chest_xray.png",
    "prediction": "High Risk: Pneumonia Detected",
    "confidence": 0.8421,
    "gradcam": "data:image/png;base64,iVBORw0KGgo..."
  }
  ```

### 2. 14-Pathology Multi-Label Screening (v2)
- **Endpoint**: `POST /api/v2/predict`
- **Content-Type**: `multipart/form-data`
- **Headers**: `Authorization: Bearer <token>` (optional)
- **Form Fields**:
  - `file`: Binary image file (`.dcm`, `.png`, `.jpg`)
  - `patient_id`: String (optional)
- **Response** (`200 OK`):
  ```json
  {
    "examination_id": "exam_v2_9876543210ab",
    "filename": "chest_xray.png",
    "model_version": "v2.0-densenet121-nih14",
    "primary_finding": "Infiltration",
    "primary_confidence": 0.6412,
    "findings": [
      { "condition": "Atelectasis", "class_index": 0, "probability": 0.1245, "detected": false },
      { "condition": "Cardiomegaly", "class_index": 1, "probability": 0.0412, "detected": false },
      { "condition": "Infiltration", "class_index": 3, "probability": 0.6412, "detected": true }
    ],
    "heatmap_base64": "data:image/png;base64,iVBORw0KGgo..."
  }
  ```

### 3. Dynamic Condition-Specific Grad-CAM
- **Endpoint**: `POST /api/v2/gradcam`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: Binary image file (`.dcm`, `.png`, `.jpg`)
  - `target_condition`: String (e.g., `"Cardiomegaly"`, `"Consolidation"`, or class index `"1"`)
- **Response** (`200 OK`):
  ```json
  {
    "target_condition": "Cardiomegaly",
    "class_index": 1,
    "heatmap_base64": "data:image/png;base64,iVBORw0KGgo..."
  }
  ```

### 4. Dual-Model Comparative "Second Opinion"
- **Endpoint**: `POST /api/v2/compare`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: Binary image file (`.dcm`, `.png`, `.jpg`)
  - `patient_id`: String (optional)
- **Response** (`200 OK`):
  ```json
  {
    "examination_id": "exam_compare_456789abcdef",
    "patient_id": "PAT-10293",
    "filename": "scan.png",
    "v1_result": {
      "prediction": "High Risk: Pneumonia Detected",
      "pneumonia_probability": 0.7812,
      "detected": true,
      "heatmap_base64": "data:image/png;base64,..."
    },
    "v2_result": {
      "model_version": "v2.0-densenet121-nih14",
      "primary_finding": "Infiltration",
      "primary_confidence": 0.6124,
      "findings": [...],
      "heatmap_base64": "data:image/png;base64,..."
    },
    "clinical_correlation": {
      "discrepancy_detected": true,
      "v1_pneumonia_prob": 0.7812,
      "v2_pneumonia_prob": 0.1421,
      "summary": "Visual Infiltration identified as primary finding (61.2%), while v1 flags Pneumonia (78.1%).",
      "insight": "Pulmonary infiltration represents the radiographic morphological manifestation of clinical pneumonia. The v1 model evaluates pneumonia as an isolated binary target with dedicated focal weighting, whereas v2 contextualizes findings across 14 competing thoracic patterns."
    }
  }
  ```

### 5. Multi-Label Model Metrics
- **Endpoint**: `GET /api/v2/metrics`
- **Response** (`200 OK`): Returns benchmark validation metadata and individual class AUCs.

### 6. Delete Patient Record
- **Endpoint**: `DELETE /api/patients/{patient_id}`
- **Path Parameters**: `patient_id` (Firestore document ID or generated `patientId`)
- **Response** (`200 OK`):
  ```json
  {
    "status": "success",
    "message": "Patient deleted"
  }
  ```
- **Error Responses**: `404 Not Found` if patient does not exist; `503` if Firestore is offline.

---

## 12. Database & Data Flow

MedVision uses Cloud Firestore with two core collections:

### 1. `/patients/{patientId}`
Represents registered patient records created by clinicians.
- `id`: Firestore generated auto-ID
- `patientId`: Human-readable identifier (e.g., `PAT-58392`)
- `patientCode`: Clinical/Hospital chart number (e.g., `HOS-2026-001`)
- `name`: Patient full name
- `age`: Number (years)
- `sex`: `"Male"` | `"Female"` | `"Other"`
- `bloodGroup`: String (e.g., `"O+"`)
- `allergies`: String notes
- `knownConditions`: String notes
- `doctorId`: Firebase Auth UID of the clinician
- `createdAt`: Firestore Timestamp

### 2. `/examinations/{examId}`
Stores screening examinations and AI-generated inferences.
- `patientId`: Reference to parent patient document
- `filename`: Uploaded radiograph filename
- `prediction`: Text summary of AI classification
- `confidence`: Maximum finding score or pneumonia probability
- `gradcam`: Data URI base64 string of the primary activation heatmap
- `modelVersion`: Model identifier (e.g., `"DenseNet121-v1"`, `"v2.0-densenet121-nih14"`, `"Consensus-v1+v2"`)
- `v1_result`: (Optional, stored for consensus scans) Nested dictionary containing v1 results
- `v2_result`: (Optional, stored for consensus scans) Nested dictionary containing v2 results
- `clinical_correlation`: (Optional) Discrepancy analysis summary and insight
- `createdAt`: UTC Datetime

---

## 13. Model Checkpoints & Datasets

### Checkpoint Files
The backend looks for weights in `backend/app/models/`:
1. `backend/app/models/densenet121_pneumonia.pth` (~28.4 MB): Fine-tuned weights on the RSNA Pneumonia Detection dataset.
2. `backend/app/models/densenet121_multilabel14.pth` (~28.5 MB): Weights trained on the NIH ChestX-ray14 dataset.

### Datasets Used
- **RSNA Pneumonia Detection Challenge**: Sourced from Kaggle / NIH, comprising frontal chest radiographs annotated for pneumonia opacities and bounding boxes.
- **NIH ChestX-ray14**: Curated by the NIH Clinical Center, containing 112,120 frontal-view X-ray images from 30,805 unique patients labeled with 14 thoracic disease categories.

> [!NOTE]
> Training datasets and large model files are excluded from git. If setting up a fresh development clone, verify that `.pth` checkpoints exist in `backend/app/models/` before starting the server.

---

## 14. Testing & Troubleshooting

### 1. Automated Frontend Build Test
To verify zero TypeScript compilation errors and production bundle integrity:
```bash
cd frontend
npm run build
```
This runs `tsc -b && vite build`.

### 2. Standalone RSNA Model Evaluation
To evaluate the binary pneumonia model against the local RSNA test split:
```bash
cd ml
source venv/bin/activate
python src/evaluate.py
```

### 3. Backend Endpoint Sanity Verification
You can test the backend inference and deletion endpoints using Python's TestClient:
```bash
cd backend
source venv/bin/activate
python -c "
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
resp = client.get('/api/v2/metrics')
assert resp.status_code == 200
print('Metrics Endpoint OK:', resp.json()['mean_auc'])
"
```

### Common Troubleshooting Scenarios

| Issue | Cause | Resolution |
|:---|:---|:---|
| **`FileNotFoundError: Multi-label model weights not found`** | Checkpoint missing in `backend/app/models/` | Ensure `densenet121_multilabel14.pth` is present in `backend/app/models/`. |
| **`ModuleNotFoundError: No module named 'pydicom'`** | Missing medical imaging dependency | Run `pip install pydicom Pillow` in the backend virtual environment. |
| **`Firestore client unavailable`** | Missing `firebase-credentials.json` | Ensure valid service account JSON is placed at `backend/firebase-credentials.json`. |
| **CORS errors on API calls** | Frontend origin mismatch | Ensure backend `origins` list in `main.py` includes your frontend port (e.g., `http://localhost:5173` or `5174`). |
| **Solid black box in PDF export** | Render timing issue with `html2canvas` | Use the updated PDF utilities (`generateMultiLabelPdfReport.ts` and `generateConsensusPdfReport.ts`) which draw images directly via `doc.addImage()`. |

---

## 15. Limitations & Responsible Use

1. **Not a Diagnostic Device**: MedVision is engineered exclusively as a clinical decision-support and educational tool. It does not possess medical certification (CE Class IIa/IIb or FDA 510(k)).
2. **Distribution Shifts**: Deep learning models trained on specific datasets (e.g., NIH or RSNA) may exhibit performance degradation when encountering variations in patient posture (AP vs. PA views), pediatric anatomy, portable bedside units, medical hardware (pacemakers, catheters), or imaging artifacts.
3. **No Independent Clinical Validation**: The retrospective metrics reported herein reflect offline test sets and do not guarantee diagnostic accuracy in real-time emergency room or clinical ward settings.
4. **Mandatory Human-in-the-Loop**: All AI findings must be independently corroborated by clinical history, physical examination, and radiologist review before instituting medical interventions.

---

## 16. Future Roadmap

- [ ] **Docker Containerization**: Compose configuration bundling FastAPI, PyTorch, and Nginx for reproducible container deployment.
- [ ] **Prospective Clinical Trials**: Validation against multi-institutional, diverse radiology cohorts.
- [ ] **DICOM PACS Networking**: Native DIMSE (C-STORE, C-FIND) and DICOMweb (WADO-RS, STOW-RS) integration for PACS integration.
- [ ] **Score Calibration**: Implement temperature scaling and isotonic regression to calibrate output scores to true clinical posterior probabilities.
- [ ] **Automated Radiology Text Reports**: Integration with clinical language models for automated structured draft report generation.

---

## License

This project is released under the **MIT License**. Dataset usage remains subject to the respective terms of the **RSNA Pneumonia Detection Challenge** and the **NIH Clinical Center**.