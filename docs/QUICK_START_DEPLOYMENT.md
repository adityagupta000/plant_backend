# Quick Start: AWS Deployment Guide

This guide helps you deploy the Plant Health backend to AWS using the free tier with your $119 credits.

## 📋 Overview

- **Total Setup Time**: ~90-120 minutes
- **Estimated Cost**: ~$0.21/month after free tier
- **Free Credits Coverage**: 41+ years worth ($119 / $0.21/month)
- **Architecture**: Multi-tier with EC2, RDS, ElastiCache, ALB

## 🚀 Quick Steps

### Step 1: Choose Your Setup Script

**For Windows users (recommended):**

```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Navigate to scripts directory
cd "C:\Project_Files\Internship\Plant-Health-monitoring\backend\scripts"

# Run the setup script
.\aws-setup.ps1
```

**For Linux/Mac users:**

```bash
# Navigate to scripts directory
cd ~/plant-health-backend/scripts

# First, make the script executable
chmod +x aws-setup.sh

# Run the script
./aws-setup.sh
```

### Step 2: Manual EC2 Setup

After AWS infrastructure is created:

1. **SSH into your EC2 instance:**

   ```bash
   ssh -i plant-health-key.pem ec2-user@<YOUR_EC2_PUBLIC_IP>
   ```

2. **Clone the repository:**

   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/plant-health-backend.git
   cd plant-health-backend
   ```

3. **Run the automated setup script:**

   ```bash
   chmod +x scripts/aws-setup.sh
   ./scripts/aws-setup.sh
   ```

4. **Configure environment variables:**

   ```bash
   nano .env
   ```

   Update with your database and Redis endpoints:

   ```env
   # Database
   DB_HOST=your-rds-endpoint
   DB_USER=admin
   DB_PASSWORD=your-password
   DB_NAME=plant_health

   # Redis
   REDIS_HOST=your-redis-endpoint
   REDIS_PORT=6379

   # JWT Secrets (generate new ones!)
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d

   # AI Model
   AI_INFERENCE_PORT=5000
   ```

5. **Transfer model files (from your local machine):**

   ```bash
   scp -i plant-health-key.pem -r ai/saved_models ec2-user@<PUBLIC_IP>:~/plant-health-backend/ai/
   ```

6. **Initialize database:**

   ```bash
   npm run migrate  # If you have migration scripts
   # OR
   node src/scripts/create-admin.js  # Create initial admin user
   ```

7. **Start the application:**
   ```bash
   npm start  # Or with PM2: pm2 start npm --name backend -- start
   ```

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS Account (Free Tier)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Application Load Balancer               │   │
│  │            (Optional - $0.16/hour = $120/mo)         │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  EC2 t2.micro - Plant Health Backend                 │   │
│  │  • Node.js 20                                         │   │
│  │  • Python 3.10 (AI inference)                         │   │
│  │  • Port: 5000 (PM2 managed)                           │   │
│  │  • FREE TIER (750 hours/month)                        │   │
│  └──────────────────────────────────────────────────────┘   │
│     ↓                          ↓                              │
│  ┌──────────────────────┐  ┌──────────────────────────┐     │
│  │ RDS PostgreSQL       │  │ ElastiCache Redis        │     │
│  │ • db.t2.micro        │  │ • cache.t2.micro         │     │
│  │ • 20GB storage       │  │ • 1 node cluster         │     │
│  │ • Automated backups  │  │ • For sessions/cache     │     │
│  │ • FREE TIER          │  │ • FREE TIER              │     │
│  │   (750 hrs/month)    │  │   (750 hrs/month)        │     │
│  └──────────────────────┘  └──────────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 💰 Cost Breakdown

| Service               | Size            | Free Tier    | Monthly Cost     |
| --------------------- | --------------- | ------------ | ---------------- |
| EC2                   | t2.micro        | 750 hours    | $0               |
| RDS PostgreSQL        | db.t2.micro     | 750 hours    | $0               |
| ElastiCache Redis     | cache.t2.micro  | 750 hours    | $0               |
| ALB (optional)        | -               | 750 hours    | $0               |
| **Data Transfer OUT** | First 1GB/mo    | 1GB free     | ~$0.09/GB after  |
| **S3 Storage**        | (logs, backups) | 5GB free     | ~$0.023/GB after |
| **Total Monthly**     | -               | All included | ~$0.21           |

**Your $119 covers**: 567 months (~47 years) at $0.21/month

## 🔑 Key Configuration Files

### 1. Environment Variables (`.env`)

```env
# Server
NODE_ENV=production
PORT=5000
API_URL=https://yourdomain.com/api

# Database (RDS)
DB_HOST=your-rds-endpoint.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=plant_health
DB_USER=admin
DB_PASSWORD=StrongPassword123!

# Redis
REDIS_HOST=your-redis-endpoint.ng.0001.use1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=optional

# JWT
JWT_ACCESS_SECRET=generate-random-string-here
JWT_REFRESH_SECRET=generate-another-random-string
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# AI Model
AI_INFERENCE_PORT=5000
AI_MODEL_PATH=/app/ai/saved_models/best_model.pth
MODEL_ENCRYPTION_KEY=check-secrets/

# AWS S3 (for uploads)
AWS_REGION=us-east-1
AWS_S3_BUCKET=plant-health-uploads
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### 2. PM2 Configuration (`ecosystem.config.js`)

```javascript
module.exports = {
  apps: [
    {
      name: "backend",
      script: "./src/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      instances: 1,
      exec_mode: "cluster",
      max_memory_restart: "500M",
      error_file: "/var/log/plant-health/error.log",
      out_file: "/var/log/plant-health/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      combine_logs: true,
    },
  ],
};
```

## ✅ Verification Steps

After deployment, verify everything is working:

### 1. Check Backend Health

```bash
curl http://<EC2_PUBLIC_IP>:5000/api/system/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "environment": "production"
}
```

### 2. Check Database Connection

```bash
curl http://<EC2_PUBLIC_IP>:5000/api/system/status
```

### 3. Check Redis Connection

```bash
# From EC2 instance
redis-cli -h <REDIS_ENDPOINT> ping
```

Response: `PONG`

### 4. Test Authentication

```bash
curl -X POST http://<EC2_PUBLIC_IP>:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

## 🚨 Important Security Notes

1. **Change default credentials** after initial setup
2. **Enable MFA** on your AWS account
3. **Restrict security group** to only necessary IPs
4. **Rotate JWT secrets** regularly
5. **Enable database backups** (7-day retention included)
6. **Monitor costs** via AWS Billing Dashboard

## 📖 Detailed Guides

- **Full AWS Deployment Guide**: See [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md)
- **API Documentation**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Security Features**: See [SECURITY_FEATURES.md](./SECURITY_FEATURES.md)
- **Load Testing Results**: See [LOAD_TESTING_PERFORMANCE.md](./LOAD_TESTING_PERFORMANCE.md)

## 🆘 Troubleshooting

### EC2 Instance Can't Connect to RDS

```bash
# Check security group rules
aws ec2 describe-security-group-rules --filters "Name=group-id,Values=<SG_ID>"

# Verify RDS endpoint is publicly accessible (for debugging only)
# In production, should NOT be publicly accessible
```

### Redis Connection Failed

```bash
# Verify Redis cluster is available
aws elasticache describe-cache-clusters \
  --cache-cluster-id plant-health-redis \
  --show-cache-node-info

# Check from EC2:
redis-cli -h <REDIS_ENDPOINT> -p 6379 ping
```

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs backend

# Check Node.js version
node --version  # Should be v20+

# Check Python version
python3 --version  # Should be 3.10+

# Verify .env file exists
ls -la .env

# Check npm dependencies
npm list | head -20
```

### High Costs

1. Check for **ALB usage** if not needed (can use ALB DNS)
2. Monitor **data transfer OUT** (limit S3 downloads)
3. Check **unused Elastic IPs** (they cost ~$3.50/month)
4. Review **RDS backup retention** (adjust if > 7 days)

## 📞 Support

For issues, check:

1. EC2 instance logs: `pm2 logs backend`
2. Application logs: `tail -f logs/app.log`
3. Database logs: AWS RDS console
4. AWS CloudWatch: Monitor CPU, memory, network

## 🎯 Next Steps After Deployment

1. **Setup Custom Domain**
   - Route 53 DNS records
   - ACM SSL certificate
   - Update ALB listener rules

2. **Enable Monitoring**
   - CloudWatch alarms
   - Application Performance Monitoring (APM)
   - Log aggregation (CloudWatch Logs)

3. **Implement CI/CD**
   - GitHub Actions for deployments
   - Auto-rollback on failures
   - Blue-green deployment strategy

4. **Scale the Application**
   - Auto-scaling groups for traffic spikes
   - Multi-region deployment
   - CDN for static assets (CloudFront)

---

**Last Updated**: January 2024  
**Backend Version**: 1.0  
**AWS Free Tier**: Valid until [check your account]
