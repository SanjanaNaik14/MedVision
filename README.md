# MedVision — AI-Assisted Chest X-Ray Screening

MedVision is a web-based clinical decision support prototype designed to assist healthcare professionals by screening chest X-ray images for potential abnormalities (e.g., pneumonia).

> **Medical & Regulatory Disclaimer**: MedVision is strictly an educational tool and decision-support prototype. It is **not** a diagnostic device and must not be used as a substitute for professional medical advice, diagnosis, or treatment.

---

## Architecture Overview

MedVision is structured into three isolated, decoupled components:
[ Frontend: React + TS + Tailwind ]
|
+---> [ Auth / Persistence: Firebase ]
|
[ Backend: FastAPI (Inference) ] <---> [ ML Engine: PyTorch / DenseNet121 ]


- **Frontend**: Built with React, TypeScript, Tailwind CSS, and React Router. Managed via Vite.
- **Authentication & Storage**: Secured via Firebase Auth (Email/Password) with environment-isolated configurations.
- **Backend**: FastAPI serving lightweight REST API endpoints for model inference.
- **ML Pipeline**: PyTorch-based Deep Learning pipeline (DenseNet121 backbone) trained on patient-split RSNA Pneumonia Detection Challenge data.

---

## Project Structure

```text
MedVision/
├── backend/            # FastAPI REST API & model inference code
│   ├── app/
│   ├── requirements.txt
│   └── venv/
├── frontend/           # React + TypeScript + Tailwind CSS UI
│   ├── src/
│   │   ├── context/    # React Context (AuthContext)
│   │   ├── pages/      # Views (Login, Dashboard)
│   │   └── services/   # External integrations (Firebase)
│   ├── .env            # Private environment configuration
│   └── package.json
├── ml/                 # PyTorch model training & dataset pipelines
│   ├── data/
│   │   ├── raw/        # RSNA dataset storage
│   │   └── processed/  # Leak-free patient-split subsets
│   ├── requirements.txt
│   └── venv/
└── README.md

Setup & Running Locally
1. Frontend

cd frontend
npm install
npm run dev

2. Backend
Bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload


3. Machine Learning Environment
Bash
cd ml
source venv/bin/activate
pip install -r requirements.txt

Dataset & Machine Learning Strategy

Dataset: https://www.kaggle.com/c/rsna-pneumonia-detection-challenge

Leakage Prevention: To prevent data leakage, dataset splits (Train/Validation/Test) are strictly partitioned at the Patient ID level rather than image level




LAST UPDATE: 8 oct 10:19 pm
MedVision is an end-to-end, full-stack artificial intelligence application designed to assist in screening chest X-rays for pneumonia. It bridges the gap between raw data science and production engineering by integrating a PyTorch deep learning model with a FastAPI backend and a React dashboard.

🚀 Key Features

Medical Image Processing: Natively parses raw 16-bit DICOM files (standard hospital format) as well as standard JPEG/PNG fallbacks.

AI Diagnostic Inference: Utilizes a custom-trained DenseNet121 convolutional neural network to predict the probability of pneumonia opacities.

Clinical Prioritization: Employs a weighted loss function and optimized decision thresholds to prioritize Recall (Sensitivity), minimizing dangerous False Negatives in a clinical setting.

Secure Dashboard: Features Firebase authentication and a minimalist, responsive React/Tailwind UI to deliver AI decision-support metrics clearly.

🛠️ Technology Stack

Machine Learning: PyTorch, Torchvision, Scikit-learn, Pandas, NumPy

Backend API: FastAPI, Uvicorn, Python, Pydicom (for DICOM parsing)

Frontend: React (TypeScript), Vite, Tailwind CSS, React Router

Authentication: Firebase Auth

🧠 Model Architecture & Training

Base Model: DenseNet121 (pretrained on ImageNet, fine-tuned for binary classification).

Dataset: Subset of the Kaggle RSNA Pneumonia Detection Challenge dataset (strictly partitioned to prevent data leakage).

Loss Function: BCEWithLogitsLoss with a pos_weight of 3.0 to heavily penalize the model for missing positive pneumonia cases.

Decision Threshold: Adjusted to 0.40 to maximize clinical sensitivity while mitigating the effects of domain shift (e.g., 8-bit JPEG compression loss).

Performance Metrics (Unseen Test Set)

ROC-AUC Score: 0.8940

Accuracy: 83.28%

Recall (Sensitivity): 74.07%

Precision: 73.39%

📂 Project Structure

MedVision/
│
├── ml/                     # Machine Learning Pipeline
│   ├── data/               # Raw and processed DICOMs/CSVs
│   ├── models/             # Saved PyTorch weights (.pth)
│   └── src/                # Training, evaluation, and dataset scripts
│
├── backend/                # FastAPI Server
│   ├── app/                
│   │   ├── main.py         # API endpoints and inference logic
│   │   └── models/         # Copied model weights for production
│   └── venv/               # Backend Python environment
│
└── frontend/               # React Dashboard
    ├── src/
    │   ├── components/     # UI components
    │   ├── context/        # Firebase AuthContext
    │   └── pages/          # Login and Dashboard pages
    └── package.json


⚙️ How to Run Locally

1. Start the Backend (FastAPI)

Open a terminal, navigate to the backend directory, activate the virtual environment, and start the server:

cd MedVision/backend
source venv/bin/activate
uvicorn app.main:app --reload


The API will run on http://127.0.0.1:8000

2. Start the Frontend (React/Vite)

Open a separate terminal, navigate to the frontend directory, and start the Vite development server:

cd MedVision/frontend
npm run dev


The dashboard will be available at http://localhost:5173

🔮 Future Roadmap

Visual Explainability: Implement Grad-CAM to generate thermal heatmaps on X-rays, highlighting the exact regions the model used to make its prediction.

Cloud Deployment: Containerize the application using Docker and deploy to AWS/GCP for public access.