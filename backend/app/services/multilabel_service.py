import os
import io
import base64
from pathlib import Path
from typing import Dict, Any, Union, Optional, List

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np
import cv2
import pydicom

# Target pathologies (exact index order specified by requirements)
TARGET_PATHOLOGIES = [
    "Atelectasis",          # 0
    "Cardiomegaly",        # 1
    "Effusion",            # 2
    "Infiltration",        # 3
    "Mass",                # 4
    "Nodule",              # 5
    "Pneumonia",           # 6
    "Pneumothorax",        # 7
    "Consolidation",       # 8
    "Edema",               # 9
    "Emphysema",           # 10
    "Fibrosis",            # 11
    "Pleural_Thickening",  # 12
    "Hernia",              # 13
]

PATHOLOGY_INDEX_MAP = {name.lower().replace(" ", "_"): i for i, name in enumerate(TARGET_PATHOLOGIES)}


class MultiLabelDenseNetService:
    """
    Dedicated service layer for DenseNet121 14-output Multi-Label Thoracic Pathology Detection
    with Class-Specific Grad-CAM Localization.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.device = torch.device('cuda' if torch.cuda.is_available() else ('mps' if torch.backends.mps.is_available() else 'cpu'))
        print(f"[MultiLabelService] Initializing on device: {self.device}")

        # Standard ImageNet transform
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        # Resolve weights file path
        if model_path is None:
            # Check standard locations
            candidate_paths = [
                Path(__file__).resolve().parent.parent / "models" / "densenet121_multilabel14.pth",
                Path("app/models/densenet121_multilabel14.pth"),
                Path("backend/app/models/densenet121_multilabel14.pth"),
                Path("ml/models/densenet121_multilabel14.pth"),
            ]
            for cp in candidate_paths:
                if cp.exists():
                    model_path = str(cp)
                    break

        if not model_path or not os.path.exists(model_path):
            raise FileNotFoundError(f"Multi-label model weights not found at: {model_path}")

        print(f"[MultiLabelService] Loading weights from: {model_path}")

        # Instantiate DenseNet121 architecture without pretrained weights
        self.model = models.densenet121(weights=None)
        num_ftrs = self.model.classifier.in_features
        # Replace 1000-class head with 14-output classification head
        self.model.classifier = nn.Linear(num_ftrs, len(TARGET_PATHOLOGIES))

        # Load weights with device fallback
        state_dict = torch.load(model_path, map_location=self.device, weights_only=True)
        self.model.load_state_dict(state_dict)
        self.model = self.model.to(self.device)
        self.model.eval()
        print("[MultiLabelService] Model loaded and ready in eval mode.")

    def process_image(self, file_bytes: bytes, filename: str) -> Image.Image:
        """Decodes DICOM (.dcm) or standard RGB image bytes into a PIL RGB Image."""
        if filename.lower().endswith('.dcm'):
            dicom = pydicom.dcmread(io.BytesIO(file_bytes))
            pixel_array = dicom.pixel_array.astype(np.float32)
            p_min = np.min(pixel_array)
            p_max = np.max(pixel_array)
            if p_max > p_min:
                pixel_array = (pixel_array - p_min) / (p_max - p_min) * 255.0
                pixel_array = pixel_array.astype(np.uint8)
            else:
                pixel_array = np.zeros(pixel_array.shape, dtype=np.uint8)
            return Image.fromarray(pixel_array).convert("RGB")
        else:
            return Image.open(io.BytesIO(file_bytes)).convert("RGB")

    def generate_gradcam(self, pil_image: Image.Image, input_tensor: torch.Tensor, class_idx: int) -> str:
        """
        Generates class-specific Grad-CAM visual heatmap overlay for DenseNet121.
        Hooks into the final convolutional/feature representation layer (features.norm5).
        """
        gradients = []
        activations = []

        def save_gradient(grad):
            gradients.append(grad)

        def forward_hook(module, input, output):
            activations.append(output)
            output.register_hook(save_gradient)

        # Hook to DenseNet121's final feature normalization layer before pooling
        target_layer = self.model.features.norm5
        hook = target_layer.register_forward_hook(forward_hook)

        try:
            self.model.zero_grad()
            output = self.model(input_tensor)
            score = output[0, class_idx]
            score.backward(retain_graph=True)
        finally:
            hook.remove()

        if not gradients or not activations:
            raise RuntimeError(f"Grad-CAM hook failed to capture gradients/activations for class {class_idx}")

        grads = gradients[0].cpu().data.numpy()[0]
        acts = activations[0].cpu().data.numpy()[0]

        # Global average pooling on gradients to calculate channel importance weights
        weights = np.mean(grads, axis=(1, 2))
        cam = np.zeros(acts.shape[1:], dtype=np.float32)

        for i, w in enumerate(weights):
            cam += w * acts[i, :, :]

        # Apply ReLU to retain positive influence
        cam = np.maximum(cam, 0)
        cam = cv2.resize(cam, (224, 224))
        max_val = np.max(cam)
        if max_val > 0:
            cam = cam / max_val

        # Create JET colormap heatmap
        heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)

        # Original image resized to 224x224
        orig_img = np.array(pil_image.resize((224, 224)))
        orig_img = cv2.cvtColor(orig_img, cv2.COLOR_RGB2BGR)

        # Overlay heatmap onto X-ray (40% heatmap, 60% original image)
        overlay = cv2.addWeighted(orig_img, 0.6, heatmap, 0.4, 0)

        _, buffer = cv2.imencode('.png', overlay)
        base64_str = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/png;base64,{base64_str}"

    def parse_condition_index(self, target_condition: Union[str, int]) -> int:
        """Parses condition string or index into valid integer index (0-13)."""
        if isinstance(target_condition, int):
            if 0 <= target_condition < len(TARGET_PATHOLOGIES):
                return target_condition
            raise ValueError(f"Condition index {target_condition} out of range [0, 13]")

        condition_str = str(target_condition).strip()
        if condition_str.isdigit():
            idx = int(condition_str)
            if 0 <= idx < len(TARGET_PATHOLOGIES):
                return idx
            raise ValueError(f"Condition index {idx} out of range [0, 13]")

        norm_str = condition_str.lower().replace(" ", "_").replace("-", "_")
        if norm_str in PATHOLOGY_INDEX_MAP:
            return PATHOLOGY_INDEX_MAP[norm_str]

        # Fuzzy / fallback match
        for key, idx in PATHOLOGY_INDEX_MAP.items():
            if norm_str in key or key in norm_str:
                return idx

        raise ValueError(f"Unknown pathology condition '{target_condition}'. Available: {TARGET_PATHOLOGIES}")

    def predict(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Runs full 14-pathology multi-label screening and returns structured results
        including primary finding, all 14 condition probabilities, and primary Grad-CAM.
        """
        image = self.process_image(file_bytes, filename)
        input_tensor = self.transform(image).unsqueeze(0).to(self.device)
        input_tensor.requires_grad = True

        # Forward pass
        logits = self.model(input_tensor)
        probs = torch.sigmoid(logits)[0].detach().cpu().numpy()

        findings: List[Dict[str, Any]] = []
        max_prob = -1.0
        primary_idx = 0

        for i, pathology in enumerate(TARGET_PATHOLOGIES):
            prob = float(probs[i])
            if prob > max_prob:
                max_prob = prob
                primary_idx = i

            findings.append({
                "condition": pathology,
                "class_index": i,
                "probability": round(prob, 4),
                "detected": bool(prob >= 0.50)
            })

        primary_finding = TARGET_PATHOLOGIES[primary_idx]

        # Generate Grad-CAM for the highest-confidence finding
        heatmap_b64 = self.generate_gradcam(image, input_tensor, primary_idx)

        return {
            "model_version": "v2.0-densenet121-nih14",
            "filename": filename,
            "primary_finding": primary_finding,
            "primary_index": primary_idx,
            "primary_confidence": round(max_prob, 4),
            "findings": findings,
            "heatmap_base64": heatmap_b64
        }

    def generate_single_gradcam(self, file_bytes: bytes, filename: str, target_condition: Union[str, int]) -> Dict[str, Any]:
        """
        Generates Grad-CAM for a specific requested condition without full metric assembly.
        """
        class_idx = self.parse_condition_index(target_condition)
        condition_name = TARGET_PATHOLOGIES[class_idx]

        image = self.process_image(file_bytes, filename)
        input_tensor = self.transform(image).unsqueeze(0).to(self.device)
        input_tensor.requires_grad = True

        heatmap_b64 = self.generate_gradcam(image, input_tensor, class_idx)

        return {
            "condition": condition_name,
            "class_index": class_idx,
            "heatmap_base64": heatmap_b64
        }


# Global lazy-initialized singleton
_service_instance: Optional[MultiLabelDenseNetService] = None

def get_multilabel_service() -> MultiLabelDenseNetService:
    global _service_instance
    if _service_instance is None:
        _service_instance = MultiLabelDenseNetService()
    return _service_instance
