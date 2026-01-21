"""
Secure Inference Server with Encrypted Model Loading
CRITICAL FIX: Ensure clean JSON output on stdout
"""

import sys
import json
import os
import cv2
import torch
import torch.nn as nn
import numpy as np
import warnings
import signal
from model_loader import SecureModelLoader

warnings.filterwarnings('ignore')

# Configuration
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

# Paths - use encrypted model
MODEL_PATH = os.getenv('MODEL_PATH', './saved_models/best_model.encrypted')
MODEL_KEY_PATH = os.getenv('MODEL_KEY_PATH', './secrets/model.key')
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
WORKER_ID = os.getenv('WORKER_ID', '0')

# Model Definition
class PlantHealthModel(nn.Module):
    def __init__(self, model_name='efficientnet_b2', num_classes=7, dropout=0.2):
        super(PlantHealthModel, self).__init__()
        
        try:
            import timm
        except ImportError:
            raise ImportError("TIMM is required: pip install timm==0.9.16")
        
        timm_model_name = model_name.replace('tf_', '')
        
        self.base_model = timm.create_model(
            timm_model_name,
            pretrained=False,
            num_classes=0
        )
        
        feature_dim = self.base_model.num_features
        
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

# Global state
_model = None
_transform = None

def load_model_securely():
    """Load encrypted model securely"""
    sys.stderr.write(f"🔐 Loading encrypted model from {MODEL_PATH}\n")
    sys.stderr.flush()
    
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Encrypted model not found: {MODEL_PATH}")
    
    if not os.path.exists(MODEL_KEY_PATH):
        raise FileNotFoundError(f"Encryption key not found: {MODEL_KEY_PATH}")
    
    # Load securely
    loader = SecureModelLoader(MODEL_KEY_PATH)
    
    def create_model():
        return PlantHealthModel(
            model_name=CONFIG['model']['name'],
            num_classes=CONFIG['model']['num_classes'],
            dropout=CONFIG['model']['dropout']
        )
    
    model = loader.load_encrypted_model(
        MODEL_PATH,
        create_model,
        DEVICE
    )
    
    # GPU optimizations
    if DEVICE.type == 'cuda':
        torch.backends.cudnn.benchmark = True
        if hasattr(torch.backends.cuda.matmul, 'allow_tf32'):
            torch.backends.cuda.matmul.allow_tf32 = True
        if hasattr(torch.backends.cudnn, 'allow_tf32'):
            torch.backends.cudnn.allow_tf32 = True
    
    sys.stderr.write(f"✅ Model loaded securely\n")
    sys.stderr.flush()
    
    return model

def get_transform():
    """Create transform function"""
    mean = np.array(CONFIG['image']['normalize_mean'], dtype=np.float32)
    std = np.array(CONFIG['image']['normalize_std'], dtype=np.float32)
    max_pixel = CONFIG['image']['max_pixel_value']
    
    def transform(img):
        img = img.astype(np.float32) / max_pixel
        img = (img - mean) / std
        img = torch.from_numpy(img).permute(2, 0, 1)
        return img
    
    return transform

def preprocess_image(image_path):
    """Preprocess image"""
    img = cv2.imread(image_path)
    
    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")
    
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_size = CONFIG['image']['size']
    img = cv2.resize(img, (img_size, img_size), interpolation=cv2.INTER_LANCZOS4)
    img = _transform(img)
    img = img.unsqueeze(0)
    
    return img

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
    """Get confidence level"""
    if confidence >= 0.85:
        return "Very High"
    elif confidence >= 0.70:
        return "High"
    elif confidence >= 0.55:
        return "Moderate"
    else:
        return "Low"

def generate_explanation(predicted_class, confidence, conf_level):
    """Generate detailed explanation"""
    explanations = {
        "Healthy": "Plant appears healthy with no visible issues detected.",
        "Pest_Fungal": "Fungal infection detected. Look for powdery spots, mold, or discoloration. Treatment: Apply fungicide and improve air circulation.",
        "Pest_Bacterial": "Bacterial infection detected. Water-soaked lesions or wilting observed. Treatment: Use copper-based bactericide and remove infected parts.",
        "Pest_Insect": "Insect damage detected. Holes, chewed edges, or insect presence. Treatment: Apply appropriate insecticide or use neem oil.",
        "Nutrient_Nitrogen": "Nitrogen deficiency detected. Yellowing of older leaves, stunted growth. Treatment: Apply nitrogen-rich fertilizer.",
        "Nutrient_Potassium": "Potassium deficiency detected. Leaf edge browning, weak stems. Treatment: Apply potassium fertilizer.",
        "Water_Stress": "Water stress detected. Wilting or dry soil conditions. Treatment: Adjust watering schedule.",
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
    img = preprocess_image(image_path)
    img = img.to(DEVICE)
    
    outputs = _model(img)
    probabilities = torch.softmax(outputs, dim=1)[0]
    probabilities = probabilities.cpu().numpy()
    
    predicted_idx = np.argmax(probabilities)
    predicted_class = CONFIG['classes'][predicted_idx]
    confidence = float(probabilities[predicted_idx])
    
    category, subtype = parse_class_name(predicted_class)
    confidence_level = get_confidence_level(confidence)
    
    all_probs = [
        {
            "class": CONFIG['classes'][i],
            "confidence": float(probabilities[i]),
            "confidence_percentage": float(probabilities[i] * 100)
        }
        for i in range(len(CONFIG['classes']))
    ]
    all_probs.sort(key=lambda x: x['confidence'], reverse=True)
    
    explanation = generate_explanation(predicted_class, confidence, confidence_level)
    
    result = {
        "predicted_class": predicted_class,
        "category": category,
        "subtype": subtype,
        "confidence": confidence,
        "confidence_percentage": confidence * 100,
        "confidence_level": confidence_level,
        "all_probabilities": all_probs,
        "explanation": explanation,
        "recommendations": get_recommendations(predicted_class),
        "model_version": "v1.0.0",
        "model_name": "efficientnet_b2"
    }
    
    return result

def get_recommendations(predicted_class):
    """Get treatment recommendations"""
    recommendations = {
        "Healthy": [
            "Continue current care routine",
            "Monitor for any changes",
            "Maintain proper watering and sunlight"
        ],
        "Pest_Fungal": [
            "Apply fungicide (copper-based or organic)",
            "Improve air circulation around plant",
            "Remove affected leaves",
            "Reduce humidity if possible"
        ],
        "Pest_Bacterial": [
            "Use copper-based bactericide",
            "Remove and destroy infected parts",
            "Avoid overhead watering",
            "Sterilize tools between plants"
        ],
        "Pest_Insect": [
            "Identify specific insect pest",
            "Apply appropriate insecticide",
            "Use neem oil for organic treatment",
            "Introduce beneficial insects"
        ],
        "Nutrient_Nitrogen": [
            "Apply nitrogen-rich fertilizer",
            "Use compost or manure",
            "Consider foliar feeding",
            "Test soil pH"
        ],
        "Nutrient_Potassium": [
            "Apply potassium fertilizer",
            "Use wood ash or kelp meal",
            "Avoid over-fertilization with nitrogen",
            "Monitor leaf symptoms"
        ],
        "Water_Stress": [
            "Adjust watering schedule",
            "Check soil moisture regularly",
            "Improve drainage if waterlogged",
            "Mulch to retain moisture"
        ],
        "Not_Plant": [
            "Please upload a clear image of a plant leaf for disease detection."
        ]
    }
    
    return recommendations.get(predicted_class, ["Consult agricultural expert"])

def run_server():
    """Run in server mode"""
    global _model, _transform
    
    sys.stderr.write(f"Worker {WORKER_ID}: Initializing...\n")
    sys.stderr.flush()
    
    _model = load_model_securely()
    _transform = get_transform()
    
    # CRITICAL: Write READY to stdout and flush immediately
    sys.stdout.write("READY\n")
    sys.stdout.flush()
    
    sys.stderr.write(f"Worker {WORKER_ID}: Ready to process requests\n")
    sys.stderr.flush()
    
    # Process requests line by line
    for line in sys.stdin:
        try:
            request = json.loads(line.strip())
            image_path = request.get('imagePath')
            
            if not image_path:
                raise ValueError("No imagePath provided")
            
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image not found: {image_path}")
            
            # Run prediction
            result = predict(image_path)
            
            # CRITICAL: Create response with success and data
            response = {
                "success": True,
                "data": result
            }
            
            # CRITICAL: Write ONLY the JSON response to stdout, followed by newline
            # Do NOT write any other text to stdout
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
            
            # Log to stderr (not stdout)
            sys.stderr.write(f"Worker {WORKER_ID}: Prediction complete for {image_path}\n")
            sys.stderr.flush()
            
        except Exception as e:
            import traceback
            
            # Log error to stderr
            sys.stderr.write(f"Worker {WORKER_ID}: Error processing request: {str(e)}\n")
            sys.stderr.write(traceback.format_exc())
            sys.stderr.flush()
            
            # Send error response to stdout
            error_response = {
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__
            }
            
            sys.stdout.write(json.dumps(error_response) + "\n")
            sys.stdout.flush()

def signal_handler(sig, frame):
    """Handle shutdown signals"""
    sys.stderr.write(f"\nWorker {WORKER_ID}: Received shutdown signal\n")
    sys.stderr.flush()
    sys.exit(0)

def main():
    """Main entry point"""
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    if len(sys.argv) > 1 and sys.argv[1] == "--server-mode":
        run_server()
    else:
        # Single-shot mode
        try:
            if len(sys.argv) < 2:
                raise ValueError("No image path provided")
            
            image_path = sys.argv[1]
            
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image not found: {image_path}")
            
            global _model, _transform
            _model = load_model_securely()
            _transform = get_transform()
            
            result = predict(image_path)
            
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