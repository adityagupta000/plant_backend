// src/utils/validators.js - EXACT MATCH TO BACKEND VALIDATION

/**
 * Validate email format
 * MATCHES backend: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 */
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate password strength
 * MATCHES backend: 8+ chars, uppercase, lowercase, number, special char
 */
export const validatePassword = (password) => {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[@$!%*?&]/.test(password)
  );
};

/**
 * Validate username format
 * MATCHES backend: 3-30 alphanumeric + underscore
 */
export const validateUsername = (username) => {
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
};

/**
 * Get password strength indicator
 * Returns visual feedback for password strength
 */
export const getPasswordStrength = (password) => {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[@$!%*?&]/.test(password)) strength++;

  if (strength <= 2) {
    return {
      label: "Weak",
      color: "bg-red-500",
      width: "33%",
      textColor: "text-red-700",
    };
  }

  if (strength <= 4) {
    return {
      label: "Medium",
      color: "bg-yellow-500",
      width: "66%",
      textColor: "text-yellow-700",
    };
  }

  return {
    label: "Strong",
    color: "bg-green-500",
    width: "100%",
    textColor: "text-green-700",
  };
};

/**
 * Validate file type
 */
export const validateFileType = (file) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
  return allowedTypes.includes(file.type);
};

/**
 * Validate file size (max 5MB)
 */
export const validateFileSize = (file) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  return file.size <= maxSize;
};

/**
 * Get detailed password validation errors
 */
export const getPasswordErrors = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push("At least 8 characters required");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("At least one lowercase letter required");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("At least one uppercase letter required");
  }
  if (!/\d/.test(password)) {
    errors.push("At least one number required");
  }
  if (!/[#@$!%*?&]/.test(password)) {
    errors.push("At least one special character (@$!%*?&) required");
  }

  return errors;
};
