/**
 * Secret Loader Utility
 * Safely loads secrets from Docker Secret files or environment variables
 *
 * Docker Secrets are mounted at /run/secrets/{secretName}
 * This utility reads from files first (Docker), then falls back to env vars
 */

const fs = require("fs");
const path = require("path");
const logger = require("./logger");

class SecretLoader {
  /**
   * Load a secret from file or environment
   * @param {string} secretName - Name of the secret (e.g., 'jwt_access_secret')
   * @param {string} envVarName - Environment variable fallback (e.g., 'ACCESS_TOKEN_SECRET')
   * @param {string} defaultValue - Default value if neither file nor env var exists
   * @returns {string} The secret value
   */
  static loadSecret(secretName, envVarName, defaultValue = null) {
    // Try Docker Secret file first
    const secretFilePath = `/run/secrets/${secretName}`;

    try {
      if (fs.existsSync(secretFilePath)) {
        const secretValue = fs.readFileSync(secretFilePath, "utf8").trim();
        logger.info(`Loaded secret from Docker Secret file: ${secretName}`);
        return secretValue;
      }
    } catch (error) {
      logger.warn(`Failed to read Docker Secret file: ${secretName}`, {
        error: error.message,
      });
    }

    // Fallback to environment variable
    if (process.env[envVarName]) {
      logger.info(`Loaded secret from environment variable: ${envVarName}`);
      return process.env[envVarName];
    }

    // Use default value
    if (defaultValue !== null) {
      logger.warn(`Using default value for secret: ${secretName}`);
      return defaultValue;
    }

    // Secret not found
    throw new Error(
      `Secret not found: ${secretName} (env: ${envVarName}). ` +
        `Tried Docker Secret file (${secretFilePath}) and environment variable.`,
    );
  }

  /**
   * Load multiple secrets at once
   * @param {Object} secretMap - Map of {secretName: {envVar, default?}}
   * @returns {Object} Object with loaded secrets
   * @example
   * SecretLoader.loadSecrets({
   *   jwt_access: { envVar: 'ACCESS_TOKEN_SECRET' },
   *   jwt_refresh: { envVar: 'REFRESH_TOKEN_SECRET' }
   * })
   */
  static loadSecrets(secretMap) {
    const secrets = {};

    for (const [secretName, config] of Object.entries(secretMap)) {
      secrets[secretName] = this.loadSecret(
        secretName,
        config.envVar,
        config.default || null,
      );
    }

    return secrets;
  }

  /**
   * Load a secret file path (useful for encryption keys, certificates, etc.)
   * @param {string} filePath - File path (e.g., '/app/ai/secrets/model.key')
   * @returns {boolean} True if file exists, false otherwise
   */
  static secretFileExists(filePath) {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      logger.error(`Failed to check secret file: ${filePath}`, {
        error: error.message,
      });
      return false;
    }
  }
}

module.exports = SecretLoader;
