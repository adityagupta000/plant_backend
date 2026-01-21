"""
FIXED Standalone PyTorch Inference Script
CRITICAL FIXES:
1. MATCHES training exactly - efficientnet_b2 (NOT efficientnetv2_b2)
2. Uses TIMM (not torchvision)
3. Recreates EXACT classifier architecture
4. Proper error handling
"""

import sys
import json
import os
import cv2
import torch
import torch.nn as nn
import numpy as np
import warnings
warnings.filterwarnings('ignore')

# ============================================================================
# CONFIGURATION - MATCHES TRAINING EXACTLY
# ============================================================================

CONFIG = {
    'image': {
        'size': 224,
        'normalize_mean': [0.485, 0.456, 0.406],
        'normalize_std': [0.229, 0.224, 0.225],
        'max_pixel_value': 255.0
    },
   'classes': [
    "Healthy",
    "Pest_Fungal",
    "Pest_Bacterial",
    "Pest_Insect",
    "Nutrient_Nitrogen",
    "Nutrient_Potassium",
    "Water_Stress",
    "Not_Plant"
],
    'model': {
        'name': 'efficientnet_b2',
        'dropout': 0.2,
        'num_classes': 8
    }
}

MODEL_PATH = os.getenv('MODEL_PATH', './models/best_model.pth')
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

_model = None
_transform = None


# ============================================================================
# MODEL DEFINITION - EXACT MATCH TO TRAINING
# ============================================================================

class PlantHealthModel(nn.Module):
    """
    CRITICAL FIX: Recreates EXACT architecture from training
    Uses efficientnet_b2 (NOT efficientnetv2_b2)
    """
    def __init__(self, model_name='efficientnet_b2', num_classes=7, dropout=0.2):
        super(PlantHealthModel, self).__init__()
        
        # CRITICAL: Use TIMM (not torchvision)
        try:
            import timm
        except ImportError:
            raise ImportError("TIMM is required: pip install timm==0.9.16")
        
        # CRITICAL: Normalize model name (remove tf_ prefix if present)
        timm_model_name = model_name.replace('tf_', '')
        
        # Load base model (EXACT match to training)
        self.base_model = timm.create_model(
            timm_model_name, 
            pretrained=False, 
            num_classes=0  # Remove head
        )
        
        feature_dim = self.base_model.num_features
        
        # CRITICAL: EXACT classifier architecture from training
        self.classifier = nn.Sequential(
            nn.BatchNorm1d(feature_dim),
            nn.Dropout(dropout),
            nn.Linear(feature_dim, 512),
            nn.ReLU(inplace=True),
            
            nn.BatchNorm1d(512),
            nn.Dropout(dropout * 0.5),
            nn.Linear(512, 256),
            nn.ReLU(inplace=True),
            
            nn.BatchNorm1d(256),
            nn.Dropout(dropout * 0.3),
            nn.Linear(256, num_classes)
        )
    
    def forward(self, x):
        features = self.base_model(x)
        output = self.classifier(features)
        return output


def load_model(model_path, device):
    """
    FIXED: Load model with exact architecture matching training
    Handles both old and new PyTorch checkpoint formats
    """
    # Create model with EXACT architecture from training
    model = PlantHealthModel(
        model_name=CONFIG['model']['name'],
        num_classes=CONFIG['model']['num_classes'],
        dropout=CONFIG['model']['dropout']
    )
    
    # Load checkpoint with safe_globals for PyTorch >= 2.6
    try:
        # Try with safe_globals (PyTorch >= 2.6)
        import numpy as np
        safe_globals = [
            np.dtype, np.int64, np.float32, np.float64, 
            np.bool_, np.core.multiarray.scalar
        ]
        
        with torch.serialization.safe_globals(safe_globals):
            checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    except (AttributeError, TypeError):
        # Fallback for older PyTorch
        checkpoint = torch.load(model_path, map_location=device)
    
    # Handle different checkpoint formats
    if isinstance(checkpoint, dict):
        if 'model_state_dict' in checkpoint:
            model.load_state_dict(checkpoint['model_state_dict'])
            epoch = checkpoint.get('epoch', 'unknown')
            best_metric = checkpoint.get('best_metric', 'unknown')
        elif 'state_dict' in checkpoint:
            model.load_state_dict(checkpoint['state_dict'])
            epoch = 'unknown'
            best_metric = 'unknown'
        else:
            # Assume checkpoint is state_dict
            model.load_state_dict(checkpoint)
            epoch = 'unknown'
            best_metric = 'unknown'
    else:
        raise ValueError("Unexpected checkpoint format")
    
    model = model.to(device)
    model.eval()
    
    # GPU optimizations
    if device.type == 'cuda':
        torch.backends.cudnn.benchmark = True
        if hasattr(torch.backends.cuda.matmul, 'allow_tf32'):
            torch.backends.cuda.matmul.allow_tf32 = True
        if hasattr(torch.backends.cudnn, 'allow_tf32'):
            torch.backends.cudnn.allow_tf32 = True
    
    return model, {'epoch': epoch, 'best_metric': best_metric}


def get_transform():
    """Backend-safe normalization (matches training exactly)"""
    mean = np.array(CONFIG['image']['normalize_mean'], dtype=np.float32)
    std = np.array(CONFIG['image']['normalize_std'], dtype=np.float32)
    max_pixel = CONFIG['image']['max_pixel_value']

    def transform(img):
        img = img.astype(np.float32) / max_pixel
        img = (img - mean) / std
        img = torch.from_numpy(img).permute(2, 0, 1)
        return img

    return transform

def initialize_model():
    """Load model once and cache"""
    global _model, _transform
    
    if _model is not None:
        return
    
    # Find model file
    if not os.path.exists(MODEL_PATH):
        alt_paths = [
            './models/model_final.pth',
            './saved_models/best_model.pth',
            './saved_models/model_final.pth'
        ]
        
        model_path = None
        for alt_path in alt_paths:
            if os.path.exists(alt_path):
                model_path = alt_path
                break
        
        if model_path is None:
            raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
    else:
        model_path = MODEL_PATH
    
    _model, info = load_model(model_path, DEVICE)
    _transform = get_transform()


# ============================================================================
# PREPROCESSING - EXACT MATCH TO TRAINING
# ============================================================================

def preprocess_image(image_path):
    """EXACT preprocessing from training"""
    img = cv2.imread(image_path)
    
    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")
    
    # BGR to RGB
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Resize (EXACT interpolation as training)
    img_size = CONFIG['image']['size']
    img = cv2.resize(img, (img_size, img_size), interpolation=cv2.INTER_LANCZOS4)
    
    # Apply transform
    img = _transform(img)
    img = img.unsqueeze(0)
    
    return img


# ============================================================================
# PREDICTION
# ============================================================================

def parse_class_name(class_name):
    """Parse category and subtype"""
    if class_name.startswith("Pest_"):
        return "Pest", class_name.replace("Pest_", "")
    elif class_name.startswith("Nutrient_"):
        return "Nutrient Deficiency", class_name.replace("Nutrient_", "")
    elif class_name == "Healthy":
        return "Healthy", None
    elif class_name == "Water_Stress":
        return "Water Stress", None     
    elif class_name == "Not_Plant": 
        return "Invalid Input", None
    else:
        return class_name, None


def get_confidence_level(confidence):
    """Confidence level from backend constants"""
    if confidence >= 0.85:
        return "Very High"
    elif confidence >= 0.70:
        return "High"
    elif confidence >= 0.55:
        return "Moderate"
    else:
        return "Low"


def generate_explanation(predicted_class, confidence, conf_level):
    """Generate explanation"""
    explanations = {
        "Healthy": "Plant appears healthy. No visible issues detected.",
        "Pest_Fungal": "Fungal infection detected. Look for powdery spots, mold, or discoloration. Treatment: fungicide.",
        "Pest_Bacterial": "Bacterial infection detected. Water-soaked lesions or wilting. Treatment: copper-based spray.",
        "Pest_Insect": "Insect damage detected. Holes, chewed edges, or insect presence. Treatment: insecticide or natural predators.",
        "Nutrient_Nitrogen": "Nitrogen deficiency detected. Yellowing of older leaves, stunted growth. Treatment: nitrogen fertilizer.",
        "Nutrient_Potassium": "Potassium deficiency detected. Leaf edge browning, weak stems. Treatment: potassium fertilizer.",
        "Water_Stress": "Water stress detected. Wilting or dry soil. Treatment: adjust watering schedule.",
        "Not_Plant": "This is not a plant image. Please upload a clear image of a plant leaf for disease detection."
    }
    
    explanation = explanations.get(
        predicted_class,
        f"Plant classified as {predicted_class}."
    )
    
    explanation += f" Confidence level: {conf_level} ({confidence*100:.1f}%)."
    
    if conf_level == "Low":
        explanation += " Manual inspection recommended for confirmation."
    
    return explanation


@torch.no_grad()
def predict(image_path):
    """Run inference"""
    initialize_model()
    
    # Preprocess
    img = preprocess_image(image_path)
    img = img.to(DEVICE)
    
    # Forward pass
    outputs = _model(img)
    probabilities = torch.softmax(outputs, dim=1)[0]
    probabilities = probabilities.cpu().numpy()
    
    # Prediction
    predicted_idx = np.argmax(probabilities)
    predicted_class = CONFIG['classes'][predicted_idx]
    confidence = float(probabilities[predicted_idx])
    
    # Parse
    category, subtype = parse_class_name(predicted_class)
    confidence_level = get_confidence_level(confidence)
    
    # All probabilities
    all_probs = [
        {
            "class": CONFIG['classes'][i],
            "confidence": float(probabilities[i]),
            "confidence_percentage": float(probabilities[i] * 100)
        }
        for i in range(len(CONFIG['classes']))
    ]
    all_probs.sort(key=lambda x: x['confidence'], reverse=True)
    
    # Explanation
    explanation = generate_explanation(predicted_class, confidence, confidence_level)
    
    # Result
    result = {
        "predicted_class": predicted_class,
        "category": category,
        "subtype": subtype,
        "confidence": confidence,
        "confidence_percentage": confidence * 100,
        "confidence_level": confidence_level,
        "all_probabilities": all_probs,
        "explanation": explanation,
        "model_version": "v1.0.0",
        "model_name": "efficientnet_b2"
    }
    
    return result


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main entry point"""
    try:
        if len(sys.argv) < 2:
            raise ValueError("No image path provided")
        
        image_path = sys.argv[1]
        
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")
        
        # Run prediction
        result = predict(image_path)
        
        # Output JSON
        print(json.dumps({
            "success": True,
            "data": result
        }))
    
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()