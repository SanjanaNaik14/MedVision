from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image
import io
import pydicom
import numpy as np
import cv2
import base64
from datetime import datetime

# Firebase Admin SDK

import firebase_admin
from firebase_admin import credentials, firestore

app = FastAPI(title="MedVision API")


origins = [
    "http://localhost:5173",
    "http://localhost:5174", 
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase Admin App with explicit Service Account credentials
if not firebase_admin._apps:
    cred = credentials.Certificate("firebase-credentials.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

print("Loading PyTorch model...")
device = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')

# 1. Load DenseNet121 Architecture
model = models.densenet121(weights=None)
num_ftrs = model.classifier.in_features
model.classifier = nn.Linear(num_ftrs, 1)

model.load_state_dict(torch.load("app/models/densenet121_pneumonia.pth", map_location=device, weights_only=True))
model = model.to(device)
model.eval()
print("Model loaded successfully!")

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def process_image(file_bytes: bytes, filename: str) -> Image.Image:
    if filename.lower().endswith('.dcm'):
        dicom = pydicom.dcmread(io.BytesIO(file_bytes))
        pixel_array = dicom.pixel_array
        if np.max(pixel_array) > 0:
            pixel_array = (pixel_array - np.min(pixel_array)) / np.max(pixel_array) * 255.0
            pixel_array = pixel_array.astype(np.uint8)
        else:
            pixel_array = np.zeros(pixel_array.shape, dtype=np.uint8)
        return Image.fromarray(pixel_array).convert("RGB")
    else:
        return Image.open(io.BytesIO(file_bytes)).convert("RGB")

def generate_gradcam(pil_image: Image.Image, input_tensor: torch.Tensor) -> str:
    """Generates Grad-CAM visual heatmap overlay on the input image."""
    gradients = []
    activations = []

    def save_gradient(grad):
        gradients.append(grad)

    def forward_hook(module, input, output):
        activations.append(output)
        output.register_hook(save_gradient)

    # Hook into DenseNet121's last dense block layer
    target_layer = model.features.denseblock4.denselayer16
    hook = target_layer.register_forward_hook(forward_hook)

    # Forward pass
    output = model(input_tensor)
    model.zero_grad()
    
    # Backward pass for the class score
    output.backward()
    hook.remove()

    # Extract gradients and activations
    grads = gradients[0].cpu().data.numpy()[0]
    acts = activations[0].cpu().data.numpy()[0]

    # Calculate channel weights based on gradient importance
    weights = np.mean(grads, axis=(1, 2))
    cam = np.zeros(acts.shape[1:], dtype=np.float32)

    for i, w in enumerate(weights):
        cam += w * acts[i, :, :]

    # Apply ReLU to retain positive influence only
    cam = np.maximum(cam, 0)
    cam = cv2.resize(cam, (224, 224))
    if np.max(cam) > 0:
        cam = cam / np.max(cam)

    # Convert to color heatmap
    heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
    
    # Original image array
    orig_img = np.array(pil_image.resize((224, 224)))
    orig_img = cv2.cvtColor(orig_img, cv2.COLOR_RGB2BGR)

    # Overlay heatmap onto X-ray image (40% heatmap, 60% original image)
    overlay = cv2.addWeighted(orig_img, 0.6, heatmap, 0.4, 0)

    # Convert overlay to PNG Base64 string for direct rendering in React
    _, buffer = cv2.imencode('.png', overlay)
    base64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/png;base64,{base64_str}"

@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    authorization: str = Header(None)
):
    try:
        file_bytes = await file.read()
        image = process_image(file_bytes, file.filename)
        
        input_tensor = transform(image).unsqueeze(0).to(device)
        input_tensor.requires_grad = True

        # Run model prediction
        output = model(input_tensor)
        probability = torch.sigmoid(output).item()
        
        prediction = "High Risk: Pneumonia Detected" if probability >= 0.40 else "Low Risk: Normal"
        
        # Generate visual Grad-CAM heatmap
        gradcam_b64 = generate_gradcam(image, input_tensor)

        # Save Record in Firestore
        exam_data = {
            "patientId": patient_id,
            "filename": file.filename,
            "prediction": prediction,
            "confidence": float(probability),
            "gradcam": gradcam_b64,
            "modelVersion": "DenseNet121-v1",
            "createdAt": datetime.utcnow()
        }
        
        doc_ref = db.collection("examinations").add(exam_data)

        return {
            "examination_id": doc_ref[1].id,
            "filename": file.filename,
            "prediction": prediction,
            "confidence": float(probability),
            "gradcam": gradcam_b64
        }

    except Exception as e:
        print(f"Inference error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))