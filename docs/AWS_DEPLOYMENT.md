# AWS Deployment Guide

Deploy your Plant Health Monitoring Backend on AWS using your free $119 credits with zero charges!

## 📊 Cost Breakdown (Free Tier Eligible)

| Service                                | Monthly Free Tier | Estimated Cost | Status                  |
| -------------------------------------- | ----------------- | -------------- | ----------------------- |
| **EC2** (t2.micro)                     | 750 hours         | $0             | ✅ FREE                 |
| **RDS PostgreSQL** (db.t2.micro)       | 750 hours         | $0             | ✅ FREE                 |
| **ElastiCache Redis** (cache.t2.micro) | 750 hours         | $0             | ✅ FREE                 |
| **S3** (Image storage)                 | 5 GB              | ~$0.12         | ✅ MINIMAL              |
| **Data Transfer**                      | 1 GB OUT          | ~$0.09         | ✅ MINIMAL              |
| **CloudFront** (CDN)                   | 1 TB              | $0             | ✅ FREE                 |
| **Total Monthly Cost**                 | —                 | **~$0.21**     | ✅ **ESSENTIALLY FREE** |

**With $119 credits, you can run this for ~500+ months (41+ years!)** 🎉

---

## 🎯 Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    Route 53 (DNS)                    │
└────────────────────┬─────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────┐
│              CloudFront CDN (Optional)                │
│          Caches static responses & images            │
└────────────────────┬─────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────┐
│         Application Load Balancer (ALB)              │
│         Distributes traffic to EC2 instances         │
└────────────────────┬─────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────┐
│        EC2 Instance (t2.micro) - Free Tier           │
│     ┌──────────────────────────────────────┐         │
│     │  Node.js + Python (Docker)           │         │
│     │  Port 5000 (Backend API)             │         │
│     │  Port 8000 (Python Inference)        │         │
│     └──────────────────────────────────────┘         │
└────────────────────┬─────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──┐  ┌──────▼───┐  ┌────▼──────┐
│   RDS    │  │ ElastiCache│  │    S3     │
│PostgreSQL│  │   Redis    │  │  (Images) │
│(Free)    │  │   (Free)   │  │ (5GB FREE)│
└──────────┘  └────────────┘  └──────────┘
```

---

## ✅ Prerequisites

Before starting, ensure you have:

1. **AWS Account** with $119 free credits
2. **AWS CLI** installed
3. **Docker** installed locally (for testing)
4. **Git** for version control
5. **Domain name** (optional, for custom domain)

### Install AWS CLI (Windows)

```powershell
# Download and install
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# Verify installation
aws --version
```

### Install AWS CLI (Mac/Linux)

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version
```

---

## 🚀 Step-by-Step Deployment

### STEP 1: AWS Account Setup & CLI Configuration

**Duration: 5 minutes**

#### 1.1 Login to AWS Console

```
Go to https://console.aws.amazon.com/
```

#### 1.2 Create IAM User for Deployment

1. Go to **IAM Dashboard** → **Users** → **Create user**
2. Username: `plant-health-deploy`
3. Check: ✅ "Provide user access to AWS Management Console"
4. Set password (remember it!)
5. Click **Next**
6. Attach policies:
   - ✅ EC2FullAccess
   - ✅ RDSFullAccess
   - ✅ ElastiCacheFullAccess
   - ✅ S3FullAccess
   - ✅ CloudFormationFullAccess
   - ✅ VPCFullAccess
7. Click **Create user**

#### 1.3 Create Access Keys

1. Click the new user `plant-health-deploy`
2. Go to **Security credentials** tab
3. Click **Create access key**
4. Select "Command Line Interface (CLI)"
5. Accept the warning, click **Next**
6. Click **Create access key**
7. **⚠️ IMPORTANT: Copy and save:**
   - Access Key ID
   - Secret Access Key

#### 1.4 Configure AWS CLI

```powershell
# Windows
aws configure

# Enter your credentials when prompted:
# AWS Access Key ID: [paste your access key]
# AWS Secret Access Key: [paste your secret key]
# Default region: us-east-1
# Default output format: json
```

**Verify configuration:**

```powershell
aws sts get-caller-identity
```

Expected output:

```json
{
  "UserId": "AIDAI...",
  "Account": "123456789",
  "Arn": "arn:aws:iam::123456789:user/plant-health-deploy"
}
```

✅ **Step 1 Complete!**

---

### STEP 2: Create VPC & Security Groups

**Duration: 10 minutes**

#### 2.1 Create VPC

```powershell
# Create VPC
$vpc = aws ec2 create-vpc --cidr-block 10.0.0.0/16 --query 'Vpc.VpcId' --output text
Write-Host "VPC ID: $vpc"

# Enable DNS hostnames
aws ec2 modify-vpc-attribute --vpc-id $vpc --enable-dns-hostnames

# Create Internet Gateway
$igw = aws ec2 create-internet-gateway --query 'InternetGateway.InternetGatewayId' --output text
Write-Host "IGW ID: $igw"

# Attach IGW to VPC
aws ec2 attach-internet-gateway --internet-gateway-id $igw --vpc-id $vpc

# Create public subnet
$subnet = aws ec2 create-subnet --vpc-id $vpc --cidr-block 10.0.1.0/24 --availability-zone us-east-1a --query 'Subnet.SubnetId' --output text
Write-Host "Subnet ID: $subnet"
```

#### 2.2 Create Security Groups

```powershell
# Save VPC and Subnet IDs for use in later steps
# They look like: vpc-xxxxx and subnet-xxxxx
```

Create security group for EC2:

```powershell
$sg_ec2 = aws ec2 create-security-group `
  --group-name plant-health-sg `
  --description "Security group for Plant Health Backend" `
  --vpc-id $vpc `
  --query 'GroupId' `
  --output text

Write-Host "EC2 Security Group ID: $sg_ec2"
```

Allow HTTP/HTTPS/SSH:

```powershell
# Allow SSH (port 22)
aws ec2 authorize-security-group-ingress `
  --group-id $sg_ec2 `
  --protocol tcp `
  --port 22 `
  --cidr 0.0.0.0/0

# Allow HTTP (port 80)
aws ec2 authorize-security-group-ingress `
  --group-id $sg_ec2 `
  --protocol tcp `
  --port 80 `
  --cidr 0.0.0.0/0

# Allow HTTPS (port 443)
aws ec2 authorize-security-group-ingress `
  --group-id $sg_ec2 `
  --protocol tcp `
  --port 443 `
  --cidr 0.0.0.0/0

# Allow Node.js (port 5000)
aws ec2 authorize-security-group-ingress `
  --group-id $sg_ec2 `
  --protocol tcp `
  --port 5000 `
  --cidr 0.0.0.0/0
```

Create security group for RDS:

```powershell
$sg_rds = aws ec2 create-security-group `
  --group-name plant-health-rds-sg `
  --description "Security group for Plant Health RDS" `
  --vpc-id $vpc `
  --query 'GroupId' `
  --output text

Write-Host "RDS Security Group ID: $sg_rds"

# Allow EC2 to connect to PostgreSQL
aws ec2 authorize-security-group-ingress `
  --group-id $sg_rds `
  --protocol tcp `
  --port 5432 `
  --source-group $sg_ec2
```

✅ **Step 2 Complete!**

---

### STEP 3: Create RDS PostgreSQL Database

**Duration: 15 minutes**

Create database (this will take ~10 minutes):

```powershell
# Create RDS subnet group first
$db_subnet1 = aws ec2 create-subnet --vpc-id $vpc --cidr-block 10.0.2.0/24 --availability-zone us-east-1b --query 'Subnet.SubnetId' --output text
$db_subnet2 = aws ec2 create-subnet --vpc-id $vpc --cidr-block 10.0.3.0/24 --availability-zone us-east-1c --query 'Subnet.SubnetId' --output text

aws rds create-db-subnet-group `
  --db-subnet-group-name plant-health-subnet-group `
  --db-subnet-group-description "Subnet group for Plant Health RDS" `
  --subnet-ids $subnet $db_subnet1 $db_subnet2

# Create RDS instance
aws rds create-db-instance `
  --db-instance-identifier plant-health-db `
  --db-instance-class db.t2.micro `
  --engine postgres `
  --master-username admin `
  --master-user-password "YourSecurePassword123!" `
  --allocated-storage 20 `
  --storage-type gp2 `
  --vpc-security-group-ids $sg_rds `
  --db-subnet-group-name plant-health-subnet-group `
  --publicly-accessible false `
  --backup-retention-period 7 `
  --multi-az false `
  --no-enable-iam-database-authentication

Write-Host "Database is being created... (this takes ~10 minutes)"
Write-Host "Check status: aws rds describe-db-instances --db-instance-identifier plant-health-db"
```

⏳ **Wait for RDS to be Available** (status should change from "creating" to "available")

Check status:

```powershell
aws rds describe-db-instances `
  --db-instance-identifier plant-health-db `
  --query 'DBInstances[0].DBInstanceStatus'
```

Once available, get the endpoint:

```powershell
$db_endpoint = aws rds describe-db-instances `
  --db-instance-identifier plant-health-db `
  --query 'DBInstances[0].Endpoint.Address' `
  --output text

Write-Host "Database Endpoint: $db_endpoint"
```

✅ **Step 3 Complete!**

---

### STEP 4: Create ElastiCache Redis

**Duration: 10 minutes**

Create Redis cluster:

```powershell
# Create ElastiCache subnet group
aws elasticache create-cache-subnet-group `
  --cache-subnet-group-name plant-health-redis-subnet `
  --cache-subnet-group-description "Subnet group for Plant Health Redis" `
  --subnet-ids $subnet $db_subnet1

# Create Redis instance
aws elasticache create-cache-cluster `
  --cache-cluster-id plant-health-redis `
  --cache-node-type cache.t2.micro `
  --engine redis `
  --num-cache-nodes 1 `
  --engine-version 7.0 `
  --cache-subnet-group-name plant-health-redis-subnet `
  --security-group-ids $sg_rds

Write-Host "Redis cluster is being created... (this takes ~5 minutes)"
```

Wait for Redis to be available:

```powershell
aws elasticache describe-cache-clusters `
  --cache-cluster-id plant-health-redis `
  --show-cache-node-info `
  --query 'CacheClusters[0].CacheNodes[0].Endpoint'
```

Get Redis endpoint:

```powershell
$redis_endpoint = aws elasticache describe-cache-clusters `
  --cache-cluster-id plant-health-redis `
  --show-cache-node-info `
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' `
  --output text

Write-Host "Redis Endpoint: $redis_endpoint"
```

✅ **Step 4 Complete!**

---

### STEP 5: Create EC2 Instance & Deploy Backend

**Duration: 20 minutes**

#### 5.1 Create EC2 Instance

```powershell
# Create key pair for SSH access
aws ec2 create-key-pair --key-name plant-health-key --query 'KeyMaterial' --output text > plant-health-key.pem

# Restrict permissions (Windows)
# Right-click plant-health-key.pem → Properties → Security → Advanced
# Remove all users except yourself, grant Full Control

# Launch EC2 instance
$instance = aws ec2 run-instances `
  --image-id ami-0c55b159cbfafe1f0 `
  --instance-type t2.micro `
  --key-name plant-health-key `
  --security-group-ids $sg_ec2 `
  --subnet-id $subnet `
  --associate-public-ip-address `
  --query 'Instances[0].InstanceId' `
  --output text

Write-Host "Instance ID: $instance"
Write-Host "Waiting 30 seconds for instance to start..."
Start-Sleep -Seconds 30
```

Get instance details:

```powershell
$public_ip = aws ec2 describe-instances `
  --instance-ids $instance `
  --query 'Reservations[0].Instances[0].PublicIpAddress' `
  --output text

Write-Host "EC2 Public IP: $public_ip"
Write-Host "Ready to SSH into: ssh -i plant-health-key.pem ec2-user@$public_ip"
```

#### 5.2 Connect to EC2 & Setup

If on Windows, use PuTTY with the key pair, or use Windows Subsystem for Linux (WSL).

On Mac/Linux or WSL:

```bash
# Fix key permissions
chmod 400 plant-health-key.pem

# SSH into instance
ssh -i plant-health-key.pem ec2-user@YOUR_PUBLIC_IP
```

#### 5.3 Install Dependencies on EC2

Once connected via SSH:

```bash
# Update system
sudo yum update -y

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Install Python 3.10
sudo yum install -y python3.10 python3-pip

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo usermod -a -G docker ec2-user

# Install Git
sudo yum install -y git

# Exit and reconnect to apply Docker group changes
exit
```

Reconnect:

```bash
ssh -i plant-health-key.pem ec2-user@YOUR_PUBLIC_IP
```

#### 5.4 Clone and Setup Backend

```bash
# Clone repository
git clone https://github.com/adityagupta000/plant_backend.git
cd plant_backend

# Create .env file with AWS resources
cat > .env << EOF
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-domain.com

# Database - Replace with your RDS endpoint
DB_DIALECT=postgres
DB_HOST=your-rds-endpoint
DB_PORT=5432
DB_NAME=plant_health
DB_USER=admin
DB_PASSWORD=YourSecurePassword123!

# Redis - Replace with your ElastiCache endpoint
REDIS_HOST=your-redis-endpoint
REDIS_PORT=6379
USE_REDIS=true

# JWT Secrets - CHANGE THESE!
JWT_ACCESS_SECRET=your-super-secure-access-secret-123456789
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-987654321
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# AI Model
AI_POOL_SIZE=2
AI_TIMEOUT=30000
MODEL_PATH=./ai/saved_models/best_model.encrypted
MODEL_KEY_PATH=./ai/secrets/model.key

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/jpg

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

# Install dependencies
npm install

# Install Python dependencies
cd ai && pip3 install -r requirements.txt && cd ..
```

#### 5.5 Copy Model Files

You need to transfer your encrypted model files to the EC2 instance:

```bash
# From your local machine (NOT on EC2):
scp -i plant-health-key.pem -r ./ai/saved_models ec2-user@YOUR_PUBLIC_IP:~/plant_backend/ai/
scp -i plant-health-key.pem -r ./ai/secrets ec2-user@YOUR_PUBLIC_IP:~/plant_backend/ai/
```

#### 5.6 Create Database & Run Migrations

Back on EC2:

```bash
# Run database initialization
npm run db:init

# Seed data (optional)
npm run db:seed
```

#### 5.7 Start Backend with PM2

```bash
# Install PM2
sudo npm install -g pm2

# Start application
pm2 start src/server.js --name "plant-health" --instances 1

# Save PM2 config
pm2 save

# Setup PM2 to auto-restart on reboot
pm2 startup
```

Copy the command output and run it.

✅ **Step 5 Complete!**

---

### STEP 6: Setup Application Load Balancer (ALB)

**Duration: 10 minutes**

```powershell
# Create target group
$tg = aws elbv2 create-target-group `
  --name plant-health-tg `
  --protocol HTTP `
  --port 5000 `
  --vpc-id $vpc `
  --target-type instance `
  --health-check-enabled `
  --health-check-protocol HTTP `
  --health-check-path /health `
  --health-check-interval-seconds 30 `
  --query 'TargetGroups[0].TargetGroupArn' `
  --output text

Write-Host "Target Group ARN: $tg"

# Register instance
aws elbv2 register-targets `
  --target-group-arn $tg `
  --targets Id=$instance

# Create ALB
$alb = aws elbv2 create-load-balancer `
  --name plant-health-alb `
  --subnets $subnet $db_subnet1 `
  --security-groups $sg_ec2 `
  --scheme internet-facing `
  --type application `
  --query 'LoadBalancers[0].LoadBalancerArn' `
  --output text

Write-Host "ALB ARN: $alb"

# Create listener
aws elbv2 create-listener `
  --load-balancer-arn $alb `
  --protocol HTTP `
  --port 80 `
  --default-actions Type=forward,TargetGroupArn=$tg
```

Get ALB DNS:

```powershell
$alb_dns = aws elbv2 describe-load-balancers `
  --load-balancer-arn $alb `
  --query 'LoadBalancers[0].DNSName' `
  --output text

Write-Host "ALB DNS: $alb_dns"
```

✅ **Step 6 Complete!**

---

### STEP 7: Setup Custom Domain (Optional)

**Duration: 5 minutes**

If you have a domain:

1. Go to **Route 53** in AWS Console
2. Create hosted zone for your domain
3. Update your domain registrar nameservers
4. Create A record pointing to ALB:

```powershell
aws route53 change-resource-record-sets `
  --hosted-zone-id YOUR_ZONE_ID `
  --change-batch '{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.yourdomain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "'"$alb_dns"'",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}'
```

✅ **Step 7 Optional Complete!**

---

### STEP 8: Setup HTTPS with ACM (Optional but Recommended)

**Duration: 10 minutes**

```powershell
# Request SSL certificate
aws acm request-certificate `
  --domain-name yourdomain.com `
  --subject-alternative-names "*.yourdomain.com" `
  --validation-method DNS

# Wait for validation, then create HTTPS listener
```

✅ **Step 8 Optional Complete!**

---

## 🧪 Test Your Deployment

### Test API Endpoints

```bash
# From local machine
curl http://ALB_DNS/health
curl http://ALB_DNS/api/system/status

# Expected response:
# {"status":"ok","service":"plant-health-backend",...}
```

### Monitor Performance

```powershell
# View CloudWatch metrics
aws cloudwatch get-metric-statistics `
  --namespace AWS/ApplicationELB `
  --metric-name TargetResponseTime `
  --start-time (Get-Date).AddHours(-1) `
  --end-time (Get-Date) `
  --period 300 `
  --statistics Average
```

---

## 📊 Monitor Your Costs

Check free tier usage:

```powershell
# View billing dashboard
# https://console.aws.amazon.com/billing/
```

Your estimated monthly cost should be **~$0.21** (just data transfer)

---

## 🔐 Security Best Practices

1. **Rotate Credentials Regularly**

   ```powershell
   aws iam create-access-key --user-name plant-health-deploy
   aws iam delete-access-key --user-name plant-health-deploy --access-key-id OLD_KEY
   ```

2. **Enable CloudTrail for Auditing**

   ```powershell
   aws cloudtrail create-trail --name plant-health-audit --s3-bucket-name your-audit-bucket
   ```

3. **Setup CloudWatch Alarms**
   ```powershell
   # Alert if error rate > 5%
   aws cloudwatch put-metric-alarm --alarm-name high-error-rate --metric-name HTTPCode_Target_5XX_Count
   ```

---

## 🚨 Troubleshooting

### Application not responding

```bash
# SSH into EC2 and check PM2
pm2 logs

# Check port 5000
sudo netstat -tulpn | grep 5000

# Restart application
pm2 restart plant-health
```

### Database connection failing

```bash
# Test RDS connection from EC2
psql -h YOUR_RDS_ENDPOINT -U admin -d plant_health -c "SELECT 1"
```

### Redis connection issues

```bash
# Test Redis from EC2
redis-cli -h YOUR_REDIS_ENDPOINT ping
```

---

## 💾 Backup & Disaster Recovery

### Auto Backups

RDS and ElastiCache are already configured with:

- ✅ 7-day automated backups
- ✅ Multi-AZ option (for paid tier)
- ✅ Point-in-time recovery

### Manual Backup

```powershell
# Create RDS snapshot
aws rds create-db-snapshot `
  --db-instance-identifier plant-health-db `
  --db-snapshot-identifier plant-health-backup-$(Get-Date -Format "yyyyMMdd-HHmmss")
```

---

## 🎓 Next Steps

1. **Setup CI/CD Pipeline**
   - Configure GitHub Actions to auto-deploy on push

2. **Enable Monitoring**
   - CloudWatch dashboards
   - Email alerts for errors

3. **Optimize Performance**
   - Add CloudFront CDN for images
   - Implement caching strategies

4. **Scale (if needed)**
   - Add Auto Scaling Group
   - Multi-AZ deployment

---

## ❓ Need Help?

- **AWS Documentation**: https://docs.aws.amazon.com
- **EC2 Troubleshooting**: https://docs.aws.amazon.com/ec2/
- **RDS Help**: https://docs.aws.amazon.com/rds/
- **ElastiCache**: https://docs.aws.amazon.com/elasticache/

---

**Congratulations! Your backend is now deployed on AWS! 🚀**
