import os
import shutil
import pandas as pd
from sklearn.model_selection import train_test_split
from tqdm import tqdm

# Define paths
RAW_DIR = 'data/raw'
PROCESSED_DIR = 'data/processed'
IMG_SOURCE = os.path.join(RAW_DIR, 'stage_2_train_images')
IMG_DEST = os.path.join(PROCESSED_DIR, 'images')

# Create necessary directories
os.makedirs(IMG_DEST, exist_ok=True)

print("Loading dataset labels...")
labels = pd.read_csv(os.path.join(RAW_DIR, 'stage_2_train_labels.csv'))

# Find the maximum Target value for each patient (1 means pneumonia, 0 means normal)
# This prevents splitting identical patients across different sets
patients = labels.groupby('patientId')['Target'].max().reset_index()

print("Splitting patients safely (preventing data leakage)...")
# Select exactly 2000 unique patients, preserving the ratio of normal vs pneumonia
subset_patients, _ = train_test_split(
    patients, train_size=2000, stratify=patients['Target'], random_state=42
)

# Split those 2000 into: 70% Train, 15% Validation, 15% Test
train_pts, temp_pts = train_test_split(
    subset_patients, train_size=0.7, stratify=subset_patients['Target'], random_state=42
)
val_pts, test_pts = train_test_split(
    temp_pts, test_size=0.5, stratify=temp_pts['Target'], random_state=42
)

# Filter the original label data to only include our selected patients
train_labels = labels[labels['patientId'].isin(train_pts['patientId'])]
val_labels = labels[labels['patientId'].isin(val_pts['patientId'])]
test_labels = labels[labels['patientId'].isin(test_pts['patientId'])]

# Save the new leak-free CSVs
train_labels.to_csv(os.path.join(PROCESSED_DIR, 'train_labels.csv'), index=False)
val_labels.to_csv(os.path.join(PROCESSED_DIR, 'val_labels.csv'), index=False)
test_labels.to_csv(os.path.join(PROCESSED_DIR, 'test_labels.csv'), index=False)

print(f"Copying {len(subset_patients)} images to the processed folder...")
# Copy only the physical .dcm files we need
for pid in tqdm(subset_patients['patientId']):
    src = os.path.join(IMG_SOURCE, f"{pid}.dcm")
    dst = os.path.join(IMG_DEST, f"{pid}.dcm")
    if os.path.exists(src):
        shutil.copy2(src, dst)

print("\nSubset creation complete! The processed/ folder is ready for PyTorch.")