import os
import pandas as pd
import pydicom
import numpy as np
from PIL import Image
import torch
from torch.utils.data import Dataset

class RSNAXRayDataset(Dataset):
    def __init__(self, csv_file, img_dir, transform=None):
        """
        Args:
            csv_file (string): Path to the csv file with annotations.
            img_dir (string): Directory with all the images.
            transform (callable, optional): Optional transform to be applied on a sample.
        """
        self.labels_df = pd.read_csv(csv_file)
        self.img_dir = img_dir
        self.transform = transform

    def __len__(self):
        return len(self.labels_df)

    def __getitem__(self, idx):
        # 1. Get patient ID and ground truth label
        row = self.labels_df.iloc[idx]
        patient_id = row['patientId']
        target = torch.tensor(row['Target'], dtype=torch.float32)

        # 2. Load the DICOM image
        img_path = os.path.join(self.img_dir, f"{patient_id}.dcm")
        dicom = pydicom.dcmread(img_path)
        pixel_array = dicom.pixel_array

        # 3. Normalize pixel array to 0-255 (DICOMs are often 12-bit or 16-bit)
        if np.max(pixel_array) > 0:
            pixel_array = pixel_array - np.min(pixel_array)
            pixel_array = pixel_array / np.max(pixel_array)
            pixel_array = (pixel_array * 255).astype(np.uint8)
        else:
            pixel_array = np.zeros(pixel_array.shape, dtype=np.uint8)
        
        # 4. Convert to RGB PIL Image (DenseNet121 expects 3 color channels)
        image = Image.fromarray(pixel_array).convert("RGB")

        # 5. Apply any torchvision transforms (resizing, normalization, etc.)
        if self.transform:
            image = self.transform(image)

        # We return the tensor image and an extra dimension for the target so BCELoss accepts it
        return image, target.unsqueeze(0)

# Quick local test to verify it works
if __name__ == "__main__":
    from torchvision import transforms
    
    # Standard ImageNet transforms required by DenseNet
    test_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
    ])
    
    # Instantiate the dataset
    # Change these two lines in src/dataset.py:
    dataset = RSNAXRayDataset(
        csv_file='data/processed/train_labels.csv',
        img_dir='data/processed/images',
        transform=test_transform
    )
    
    img, label = dataset[0]
    print(f"Dataset loaded successfully!")
    print(f"Image Tensor Shape: {img.shape}")
    print(f"Label Tensor: {label}")