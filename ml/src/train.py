import os
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import transforms, models
from dataset import RSNAXRayDataset
from tqdm import tqdm

def train_model():
    if torch.cuda.is_available():
        device = torch.device('cuda')
    elif torch.backends.mps.is_available():
        device = torch.device('mps')
    else:
        device = torch.device('cpu')
    print(f"Using device: {device}")

    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

    train_dataset = RSNAXRayDataset(
        csv_file='data/processed/train_labels.csv',
        img_dir='data/processed/images',
        transform=train_transform
    )
    val_dataset = RSNAXRayDataset(
        csv_file='data/processed/val_labels.csv',
        img_dir='data/processed/images',
        transform=val_transform
    )

    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False, num_workers=2)

    model = models.densenet121(weights=models.DenseNet121_Weights.DEFAULT)
    num_ftrs = model.classifier.in_features
    model.classifier = nn.Linear(num_ftrs, 1)
    model = model.to(device)

    # ---------------------------------------------------------
    # NEW ARCHITECTURE UPDATE: Weighted Loss Function
    # We assign a weight of 3.0 to positive (pneumonia) cases.
    # This penalizes the model 3x harder for a False Negative.
    # ---------------------------------------------------------
    pos_weight = torch.tensor([3.0]).to(device)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)

    epochs = 5
    best_val_loss = float('inf')

    print("\nStarting Model Training with Class Weights...")
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        for images, targets in tqdm(train_loader, desc=f"Epoch {epoch+1}/{epochs} [Train]"):
            images, targets = images.to(device), targets.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)

        epoch_train_loss = running_loss / len(train_dataset)

        model.eval()
        val_loss = 0.0
        correct = 0
        total = 0

        with torch.no_grad():
            for images, targets in tqdm(val_loader, desc=f"Epoch {epoch+1}/{epochs} [Val]"):
                images, targets = images.to(device), targets.to(device)
                outputs = model(images)
                loss = criterion(outputs, targets)

                val_loss += loss.item() * images.size(0)
                preds = torch.sigmoid(outputs) >= 0.5
                correct += (preds == targets).sum().item()
                total += targets.size(0)

        epoch_val_loss = val_loss / len(val_dataset)
        val_acc = correct / total

        print(f"\nEpoch {epoch+1}/{epochs} -> Train Loss: {epoch_train_loss:.4f} | Val Loss: {epoch_val_loss:.4f} | Val Acc: {val_acc * 100:.2f}%")

        if epoch_val_loss < best_val_loss:
            best_val_loss = epoch_val_loss
            torch.save(model.state_dict(), 'models/densenet121_pneumonia.pth')
            print(f"--> Saved new weighted model to models/densenet121_pneumonia.pth")

    print("\nTraining complete!")

if __name__ == "__main__":
    train_model()