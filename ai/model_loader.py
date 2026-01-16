"""
Secure Model Loader
Loads encrypted models with integrity verification
"""

import torch
import torch.nn as nn
import io
import os
from model_encryption import ModelEncryption

class SecureModelLoader:
    def __init__(self, key_path='./secrets/model.key'):
        self.encryptor = ModelEncryption(key_path)
    
    def load_encrypted_model(self, encrypted_path, model_class, device='cpu'):
        """
        Load and decrypt model
        
        Args:
            encrypted_path: Path to encrypted model
            model_class: Model class to instantiate
            device: Device to load model on
            
        Returns:
            Loaded model
        """
        # Decrypt model data
        decrypted_data = self.encryptor.decrypt_model(encrypted_path)
        
        # Load from memory (never write to disk)
        buffer = io.BytesIO(decrypted_data)
        
        try:
            # Try new PyTorch format
            import numpy as np
            safe_globals = [
                np.dtype, np.int64, np.float32, np.float64,
                np.bool_, np.core.multiarray.scalar
            ]
            
            with torch.serialization.safe_globals(safe_globals):
                checkpoint = torch.load(buffer, map_location=device, weights_only=False)
        except (AttributeError, TypeError):
            # Fallback for older PyTorch
            checkpoint = torch.load(buffer, map_location=device)
        
        # Create model
        model = model_class()
        
        # Load weights
        if isinstance(checkpoint, dict):
            if 'model_state_dict' in checkpoint:
                model.load_state_dict(checkpoint['model_state_dict'])
            elif 'state_dict' in checkpoint:
                model.load_state_dict(checkpoint['state_dict'])
            else:
                model.load_state_dict(checkpoint)
        else:
            raise ValueError("Unexpected checkpoint format")
        
        model.to(device)
        model.eval()
        
        return model
    