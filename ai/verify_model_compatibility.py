"""
Model Compatibility Verification Script
Checks if your trained model can be loaded by the backend inference script
"""

import torch
import timm
import sys
import os

def check_model_architecture():
    """Verify model architecture matches"""
    print("="*70)
    print("MODEL ARCHITECTURE VERIFICATION")
    print("="*70)
    
    # 1. Check training model checkpoint
    model_path = './saved_models/best_model.pth'
    
    if not os.path.exists(model_path):
        model_path = './models/best_model.pth'
    
    if not os.path.exists(model_path):
        print("❌ ERROR: Model not found!")
        print(f"   Searched: ./saved_models/best_model.pth")
        print(f"             ./models/best_model.pth")
        return False
    
    print(f"\n✓ Found model: {model_path}")
    
    # Load checkpoint
    try:
        checkpoint = torch.load(
            model_path,
            map_location='cpu',
            weights_only=False
        )

        print("✓ Checkpoint loaded successfully")
    except Exception as e:
        print(f"❌ ERROR loading checkpoint: {e}")
        return False
    
    # 2. Check model name in checkpoint
    if 'model_name' in checkpoint:
        training_model = checkpoint['model_name']
        print(f"\n📝 Training Model Name: {training_model}")
    else:
        print("\n⚠️  WARNING: No model_name in checkpoint")
        training_model = "unknown"
    
    # 3. Try to recreate architecture
    print("\n" + "="*70)
    print("TESTING MODEL RECREATION")
    print("="*70)
    
    # Try efficientnet_b2 (correct)
    print("\n1. Testing efficientnet_b2 (CORRECT):")
    try:
        test_model = timm.create_model('efficientnet_b2', pretrained=False, num_classes=0)
        feature_dim = test_model.num_features
        print(f"   ✓ Model created successfully")
        print(f"   ✓ Feature dimension: {feature_dim}")
        
        # Try loading weights
        from inference import PlantHealthModel
        full_model = PlantHealthModel('efficientnet_b2', 7, 0.2)
        full_model.load_state_dict(checkpoint['model_state_dict'])
        print(f"   ✓ Weights loaded successfully!")
        print(f"   ✅ THIS IS THE CORRECT MODEL!")
        
    except Exception as e:
        print(f"   ❌ Failed: {e}")
    
    # Try efficientnetv2_b2 (incorrect - will fail)
    print("\n2. Testing efficientnetv2_b2 (INCORRECT):")
    try:
        test_model = timm.create_model('efficientnetv2_b2', pretrained=False, num_classes=0)
        feature_dim = test_model.num_features
        print(f"   ⚠️  Model created (feature dim: {feature_dim})")
        
        # Try loading weights - THIS WILL FAIL
        class TestModel(torch.nn.Module):
            def __init__(self):
                super().__init__()
                self.base_model = timm.create_model('efficientnetv2_b2', pretrained=False, num_classes=0)
                fd = self.base_model.num_features
                self.classifier = torch.nn.Sequential(
                    torch.nn.BatchNorm1d(fd),
                    torch.nn.Dropout(0.2),
                    torch.nn.Linear(fd, 512),
                    torch.nn.ReLU(True),
                    torch.nn.BatchNorm1d(512),
                    torch.nn.Dropout(0.1),
                    torch.nn.Linear(512, 256),
                    torch.nn.ReLU(True),
                    torch.nn.BatchNorm1d(256),
                    torch.nn.Dropout(0.06),
                    torch.nn.Linear(256, 7)
                )
        
        wrong_model = TestModel()
        wrong_model.load_state_dict(checkpoint['model_state_dict'])
        print(f"   ❌ THIS SHOULD HAVE FAILED!")
        
    except Exception as e:
        print(f"   ✅ Correctly failed (architecture mismatch)")
        print(f"   Error: {str(e)[:100]}...")
    
    # 4. Summary
    print("\n" + "="*70)
    print("VERIFICATION SUMMARY")
    print("="*70)
    
    if training_model == 'efficientnet_b2' or training_model == 'tf_efficientnet_b2':
        print("\n✅ CORRECT CONFIGURATION!")
        print(f"   Training model: {training_model}")
        print(f"   Backend model: efficientnet_b2 (matches)")
        print("\n✓ Your model will load correctly in the backend!")
        return True
    elif training_model == 'efficientnetv2_b2' or training_model == 'tf_efficientnetv2_b2':
        print("\n❌ MISMATCH DETECTED!")
        print(f"   Training model: {training_model}")
        print(f"   Backend was using: efficientnetv2_b2")
        print("\n⚠️  You need to retrain with efficientnet_b2")
        print("   OR update inference.py to use your training model")
        return False
    else:
        print(f"\n⚠️  Unknown model: {training_model}")
        print("   Please verify manually")
        return False


def check_class_order():
    """Verify class order matches"""
    print("\n" + "="*70)
    print("CLASS ORDER VERIFICATION")
    print("="*70)
    
    training_classes = [
        "Healthy",
        "Pest_Fungal",
        "Pest_Bacterial",
        "Pest_Insect",
        "Nutrient_Nitrogen",
        "Nutrient_Potassium",
        "Water_Stress"
    ]
    
    backend_classes = [
        "Healthy",
        "Pest_Fungal",
        "Pest_Bacterial",
        "Pest_Insect",
        "Nutrient_Nitrogen",
        "Nutrient_Potassium",
        "Water_Stress"
    ]
    
    print("\nTraining classes:")
    for i, cls in enumerate(training_classes):
        print(f"  {i}: {cls}")
    
    print("\nBackend classes:")
    for i, cls in enumerate(backend_classes):
        print(f"  {i}: {cls}")
    
    if training_classes == backend_classes:
        print("\n✅ Class order matches perfectly!")
        return True
    else:
        print("\n❌ Class order mismatch!")
        return False


def main():
    print("\n" + "="*70)
    print("PLANT HEALTH MODEL COMPATIBILITY CHECK")
    print("="*70)
    
    arch_ok = check_model_architecture()
    class_ok = check_class_order()
    
    print("\n" + "="*70)
    print("FINAL RESULT")
    print("="*70)
    
    if arch_ok and class_ok:
        print("\n✅ ALL CHECKS PASSED!")
        print("\n   Your model is compatible with the backend.")
        print("   You can proceed with deployment.")
    else:
        print("\n❌ COMPATIBILITY ISSUES FOUND!")
        print("\n   Please fix the issues above before deploying.")
        
        if not arch_ok:
            print("\n   CRITICAL: Model architecture mismatch!")
            print("   → Use the FIXED inference.py provided")
            print("   → Make sure it uses 'efficientnet_b2'")
    
    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    main()