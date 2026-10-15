import torch
import numpy as np
import pandas as pd
from torch.utils.data import DataLoader
from torchvision import transforms, models
import torch.nn as nn
from dataset import RSNAXRayDataset
from sklearn.metrics import (
    accuracy_score, 
    precision_score, 
    recall_score, 
    f1_score, 
    roc_auc_score, 
    confusion_matrix, 
    classification_report
)

def evaluate_model():
    # Setup device
    if torch.cuda.is_available():
        device = torch.device('cuda')
    elif torch.backends.mps.is_available():
        device = torch.device('mps')
    else:
        device = torch.device('cpu')
    print(f"Evaluating model on device: {device}")

    # Validation/Test transforms (no random data augmentation)
    test_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

    # Load the unseen Test Set
    test_dataset = RSNAXRayDataset(
        csv_file='data/processed/test_labels.csv',
        img_dir='data/processed/images',
        transform=test_transform
    )
    test_loader = DataLoader(test_dataset, batch_size=16, shuffle=False)

    # Rebuild DenseNet121 architecture & load weights
    model = models.densenet121(weights=None)
    num_ftrs = model.classifier.in_features
    model.classifier = nn.Linear(num_ftrs, 1)
    
    model.load_state_dict(torch.load('models/densenet121_pneumonia.pth', map_location=device))
    model = model.to(device)
    model.eval()

    all_targets = []
    all_probs = []

    print("Running inference across the test dataset...")
    with torch.no_grad():
        for images, targets in test_loader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.sigmoid(outputs).cpu().numpy()
            
            all_probs.extend(probs)
            all_targets.extend(targets.numpy())

    all_targets = np.array(all_targets).flatten()
    all_probs = np.array(all_probs).flatten()
    all_preds = (all_probs >= 0.40).astype(int)

    # Compute Classification Metrics
    acc = accuracy_score(all_targets, all_preds)
    precision = precision_score(all_targets, all_preds, zero_division=0)
    recall = recall_score(all_targets, all_preds, zero_division=0)
    f1 = f1_score(all_targets, all_preds, zero_division=0)
    auc = roc_auc_score(all_targets, all_probs)
    cm = confusion_matrix(all_targets, all_preds)

    print("\n" + "="*45)
    print("      MEDVISION TEST SET EVALUATION METRICS    ")
    print("="*45)
    print(f" Accuracy           : {acc * 100:.2f}%")
    print(f" Precision          : {precision * 100:.2f}%")
    print(f" Recall (Sensitivity): {recall * 100:.2f}%")
    print(f" F1-Score           : {f1 * 100:.2f}%")
    print(f" ROC-AUC Score      : {auc:.4f}")
    print("="*45)
    print("\nConfusion Matrix:")
    print(f" True Negatives (Correct Normal)     : {cm[0][0]}")
    print(f" False Positives (False Alarm)      : {cm[0][1]}")
    print(f" False Negatives (Missed Pneumonia) : {cm[1][0]}")
    print(f" True Positives (Correct Pneumonia)  : {cm[1][1]}")
    print("="*45)

if __name__ == "__main__":
    evaluate_model()