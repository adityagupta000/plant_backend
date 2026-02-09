# ============================================================================

# DOCKER SECRETS - Secret Files for Plant Health Backend

# ============================================================================

#

# IMPORTANT: These files should NOT be in version control (.gitignore)

# Location: ./secrets/ directory

#

# Docker Secrets Best Practices:

# 1. Generate strong random values for each secret

# 2. Keep these files (.txt) with restrictive permissions (600)

# 3. In production, use Docker Swarm Secrets or Kubernetes Secrets

# 4. Never commit actual secrets to Git

# 5. Use different secrets for different environments

#

# ============================================================================

# HOW TO SET UP DOCKER SECRETS

# ============================================================================

#

# 1. CREATE SECRET FILES:

#

# # JWT Access Secret (minimum 32 characters, random string)

# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" > secrets/jwt_access_secret.txt

#

# # JWT Refresh Secret (must be different from access secret)

# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" > secrets/jwt_refresh_secret.txt

#

# # Redis Password (if needed)

# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" > secrets/redis_password.txt

#

# 2. SET FILE PERMISSIONS (Unix/Linux/macOS):

#

# chmod 600 secrets/\*.txt

#

# 3. RUN DOCKER COMPOSE:

#

# docker-compose up --build

#

# ============================================================================

# EXAMPLE SECRET VALUES (FOR DEVELOPMENT ONLY)

# ============================================================================

#

# DO NOT USE THESE IN PRODUCTION!

#

# jwt_access_secret.txt:

# 85979a2f723fdfbf671e62410df21388da40d6390b9410e2a1712b32fc9ff291572fb3fd7687be0d2997f26679c68564297f8a093b2cdc7c2849e3e2fb1e707f

#

# jwt_refresh_secret.txt:

# da7915d47f27d018c7c46a6371cf0c98d16660fe3b89921bcb7e656a16db926153d304b9e610ea3430e90ec70f9ef50456592e08dbf02ef525135ee1d8241d8d

#

# redis_password.txt:

# your-secure-redis-password-here

#

# ============================================================================
