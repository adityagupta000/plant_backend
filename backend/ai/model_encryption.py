"""
Model Encryption Utility
Encrypts the PyTorch model to prevent unauthorized access
"""

import torch
import os
from cryptography.fernet import Fernet
import json
import hashlib

class ModelEncryption:
    def __init__(self, key_path='./secrets/model.key'):
        self.key_path = key_path
        self._ensure_key_exists()
        self.key = self._load_key()
        self.cipher = Fernet(self.key)
    
    def _ensure_key_exists(self):
        """Generate encryption key if not exists"""
        os.makedirs(os.path.dirname(self.key_path), exist_ok=True)
        
        if not os.path.exists(self.key_path):
            key = Fernet.generate_key()
            with open(self.key_path, 'wb') as f:
                f.write(key)
            print(f"✅ Generated new encryption key: {self.key_path}")
            
            # Set restrictive permissions (Unix)
            try:
                os.chmod(self.key_path, 0o600)
            except:
                pass
    
    def _load_key(self):
        """Load encryption key"""
        with open(self.key_path, 'rb') as f:
            return f.read()
    
    def encrypt_model(self, model_path, encrypted_path):
        """
        Encrypt a PyTorch model file
        
        Args:
            model_path: Path to original .pth file
            encrypted_path: Path to save encrypted file
        """
        print(f"🔐 Encrypting model: {model_path}")
        
        # Load model
        with open(model_path, 'rb') as f:
            model_data = f.read()
        
        # Create metadata
        metadata = {
            'original_size': len(model_data),
            'hash': hashlib.sha256(model_data).hexdigest(),
            'version': '1.0.0'
        }
        
        # Encrypt
        encrypted_data = self.cipher.encrypt(model_data)
        
        # Save encrypted model + metadata
        package = {
            'metadata': metadata,
            'data': encrypted_data
        }
        
        with open(encrypted_path, 'wb') as f:
            torch.save(package, f)
        
        print(f"✅ Model encrypted successfully")
        print(f"   Original size: {len(model_data) / 1024 / 1024:.2f} MB")
        print(f"   Encrypted size: {len(encrypted_data) / 1024 / 1024:.2f} MB")
        print(f"   Hash: {metadata['hash'][:16]}...")
        
        return encrypted_path
    
    def decrypt_model(self, encrypted_path):
        """
        Decrypt model and return in-memory bytes
        
        Args:
            encrypted_path: Path to encrypted model
            
        Returns:
            Decrypted model data (bytes)
        """
        # Load encrypted package
        package = torch.load(encrypted_path, map_location='cpu')
        
        # Decrypt
        decrypted_data = self.cipher.decrypt(package['data'])
        
        # Verify integrity
        data_hash = hashlib.sha256(decrypted_data).hexdigest()
        if data_hash != package['metadata']['hash']:
            raise ValueError("Model integrity check failed - possible tampering")
        
        return decrypted_data


def encrypt_existing_model():
    """Encrypt your existing model"""
    encryptor = ModelEncryption()
    
    original = './saved_models/best_model.pth'
    encrypted = './saved_models/best_model.encrypted'
    
    if not os.path.exists(original):
        print(f"❌ Model not found: {original}")
        return
    
    encryptor.encrypt_model(original, encrypted)
    print(f"\n✅ Encryption complete!")
    print(f"   Encrypted file: {encrypted}")
    print(f"   Key file: {encryptor.key_path}")
    print(f"\n⚠️  IMPORTANT:")
    print(f"   1. Keep {encryptor.key_path} SECRET and SECURE")
    print(f"   2. Add it to .gitignore")
    print(f"   3. Use environment variables in production")
    print(f"   4. Delete original .pth file after verification")


if __name__ == "__main__":
    encrypt_existing_model()