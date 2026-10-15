# MedVision — AI-Assisted Chest X-Ray Screening & Clinical Decision Support

MedVision is an end-to-end, web-based clinical decision support system (CDSS) designed to assist healthcare professionals by screening chest X-ray images for potential abnormalities (specifically pneumonia opacities) paired with real-time spatial Grad-CAM explainability.

> **Medical & Regulatory Disclaimer**: MedVision is strictly an educational tool and clinical decision-support prototype. It is **not** an FDA/CE cleared diagnostic device and must not be used as a substitute for professional medical advice, diagnosis, or radiologist assessment.

---

## Architecture Overview

MedVision is structured into decoupled components:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Vite + React 19 + TS)                   │
│  - Tailwind CSS v4, React Router v7                                    │
│  - Cinematic Landing Page (3D Anatomical Lungs, Deep Blue Frame)       │
│  - Clinical Workspace Shell (AppLayout + Unified Navbar)              │
│  - Direct Firestore SDK (Patients CRUD, Examination Timeline)          │
│  - Client-side Clinical PDF Engine (jspdf + html2canvas)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  Multipart/Form-Data (Image + Patient ID)
                  Bearer Token (Authorization Header)
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI + Python)                       │
│  - Uvicorn ASGI Server on http://127.0.0.1:8000                        │
│  - Image Pipeline: pydicom (16-bit DICOM) & PIL (PNG/JPEG)            │
│  - PyTorch Inference Engine (DenseNet121, MPS / CPU)                   │
│  - Explainability: Grad-CAM Hook on DenseBlock4 Denselayer16          │
│  - Firebase Admin SDK: Direct Firestore Exam Persistence               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA & PERSISTENCE                              │
│  - Firebase Authentication (Clinician Email/Password)                  │
│  - Cloud Firestore:                                                   │
│      ├── `/patients/{patientId}` (Demographics, Doctor UID)           │
│      └── `/examinations/{examId}` (Prediction, Confidence, Base64 CAM) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

1. **Cinematic & Clinical UI Redesign**:
   - High-contrast, deep-blue gradient landing page with subtle cyber-grid, rounded double-border frame, oversized typography, 3D anatomical lungs hero illustration, and restrained lime accents.
   - Clean, professional, and functional diagnostic workspace that presents AI inference metrics and Grad-CAM overlays clearly without distracting effects.
   - Unified persistent navigation (`AppLayout` & `Navbar`) linking the screening workspace, patient directory, and intake flows.

2. **Hospital-Ready Image Processing**:
   - Parses raw 16-bit DICOM files (`.dcm`) with min-max windowing normalization as well as standard PNG/JPEG fallbacks.

3. **High-Sensitivity Deep Learning**:
   - Fine-tuned **DenseNet121** convolutional neural network with BCE loss weighted ($3.0\times$) to penalize dangerous False Negatives in clinical settings.
   - Optimized decision threshold at **0.40** prioritizing sensitivity/recall.

4. **Grad-CAM Visual Explainability**:
   - Generates instant gradient-weighted class activation heatmaps hooked into DenseNet121's `denseblock4.denselayer16`, visually demonstrating the spatial regions driving model probability.

5. **Patient Directory & Longitudinal History**:
   - Complete patient lifecycle management with Firestore indexing, search filtering, and past scan timelines.

6. **One-Click Clinical PDF Diagnostic Reports**:
   - Instant PDF generation compiling patient demographics, AI findings, Grad-CAM overlays, and clinician signature blocks.

---

## 🛠️ Technology Stack

- **Machine Learning**: PyTorch, Torchvision, Scikit-learn, Pandas, NumPy, Pydicom, OpenCV (`cv2`)
- **Backend API**: FastAPI, Uvicorn, Python Multipart, Firebase Admin SDK
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router DOM v7, jsPDF, html2canvas
- **Authentication & Database**: Firebase Auth, Cloud Firestore

---

## 📊 Model Performance Metrics (RSNA Test Set)

- **ROC-AUC Score**: 0.8940
- **Accuracy**: 83.28%
- **Recall (Sensitivity)**: 74.07%
- **Precision**: 73.39%
- **Decision Cutoff**: 0.40

---

## 📂 Project Structure

```text
MedVision/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI server: /predict endpoint, Grad-CAM & Firestore persistence
│   │   └── models/
│   │       └── densenet121_pneumonia.pth  # Production PyTorch weights (~28.4 MB)
│   ├── firebase-credentials.json      # Firebase Admin service account key
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   │   └── anatomical_lungs_clinical.jpg # 3D anatomical lungs visual asset
│   │   ├── components/
│   │   │   ├── AppLayout.tsx          # Shared workspace layout & disclaimer banner
│   │   │   ├── Navbar.tsx             # Brand header, navigation links & session info
│   │   │   └── ProtectedRoute.tsx     # Firebase session route guard
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # Firebase Auth context provider
│   │   ├── pages/
│   │   │   ├── Landing.tsx            # Cinematic landing page
│   │   │   ├── Login.tsx              # Dark-themed clinician portal
│   │   │   ├── SignUp.tsx             # Clinical account registration
│   │   │   ├── Dashboard.tsx          # Diagnostic screening & Grad-CAM workspace
│   │   │   ├── PatientList.tsx        # Searchable patient directory
│   │   │   ├── AddPatient.tsx         # New patient registration form
│   │   │   └── PatientProfile.tsx     # Demographics, scan history & PDF export
│   │   ├── services/
│   │   │   ├── firebase.ts            # Client Firebase initialization
│   │   │   └── patientService.ts      # Firestore patient data helpers
│   │   └── utils/
│   │       └── generatePdfReport.ts   # Client-side PDF export utility
│   ├── index.html                     # HTML entry with Plus Jakarta Sans & Inter
│   └── package.json
│
├── ml/
│   ├── data/                          # RSNA dataset splits
│   ├── src/
│   │   ├── dataset.py                 # PyTorch Dataset for DICOM loading
│   │   ├── train.py                   # Model training script
│   │   └── evaluate.py                # Model evaluation metrics
│   └── make_subset.py                 # Patient-level stratified split script
│
├── docs/
│   └── HANDOFF.md                     # Technical architecture & UI redesign handoff notes
└── README.md
```

---

## ⚙️ How to Run Locally

### 1. Backend (FastAPI)
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Runs at: `http://127.0.0.1:8000`

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Runs at: `http://localhost:5173` (or `http://localhost:5174`)

---

## 🔮 Future Roadmap
- Containerize application with Docker for orchestrated GCP/AWS cloud deployment.
- Integrate multi-label classification (e.g., Atelectasis, Cardiomegaly, Effusion, Infiltration).
- Implement backend JWT token validation (`auth.verify_id_token()`).