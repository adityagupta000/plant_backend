# Plant Health Backend - AWS Deployment Script (PowerShell)
# Run this on your local Windows machine to setup AWS CLI and create resources

param(
    [string]$Action = "setup"
)

# Colors
$InfoColor = "Cyan"
$SuccessColor = "Green"
$ErrorColor = "Red"

function Write-Status {
    Write-Host "[INFO]" -ForegroundColor $InfoColor -NoNewline
    Write-Host " $args"
}

function Write-Success {
    Write-Host "[✓]" -ForegroundColor $SuccessColor -NoNewline
    Write-Host " $args"
}

function Write-Error {
    Write-Host "[ERROR]" -ForegroundColor $ErrorColor -NoNewline
    Write-Host " $args"
}

# Display menu
function Show-Menu {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Plant Health Backend - AWS Deployment Setup         ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Choose an option:"
    Write-Host ""
    Write-Host "  1. ⚙️  Install AWS CLI" -ForegroundColor Yellow
    Write-Host "  2. 🔐 Configure AWS Credentials" -ForegroundColor Yellow
    Write-Host "  3. 🌐 Create VPC & Security Groups" -ForegroundColor Yellow
    Write-Host "  4. 🗄️  Create RDS PostgreSQL Database" -ForegroundColor Yellow
    Write-Host "  5. 🔴 Create ElastiCache Redis" -ForegroundColor Yellow
    Write-Host "  6. 🖥️  Create EC2 Instance" -ForegroundColor Yellow
    Write-Host "  7. ⚡ Create Application Load Balancer" -ForegroundColor Yellow
    Write-Host "  8. 📋 Create Deployment Summary" -ForegroundColor Yellow
    Write-Host "  9. 🟢 Full Deployment (All Steps)" -ForegroundColor Yellow
    Write-Host "  0. ❌ Exit" -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Install AWS CLI
function Install-AWSCLI {
    Write-Status "Checking AWS CLI installation..."
    
    if (Get-Command aws -ErrorAction SilentlyContinue) {
        $version = aws --version
        Write-Success "AWS CLI already installed: $version"
        return
    }
    
    Write-Status "Downloading AWS CLI v2..."
    $url = "https://awscli.amazonaws.com/AWSCLIV2.msi"
    $destination = "$env:TEMP\AWSCLIV2.msi"
    
    # Download
    Invoke-WebRequest -Uri $url -OutFile $destination
    Write-Success "AWS CLI downloaded"
    
    Write-Status "Installing AWS CLI..."
    Start-Process msiexec.exe -ArgumentList "/i", $destination, "/quiet" -Wait
    Write-Success "AWS CLI installed successfully"
    
    # Verify
    $version = aws --version
    Write-Success "Verified: $version"
}

# Step 2: Configure AWS CLI
function Configure-AWS {
    Write-Status "Configuring AWS CLI credentials..."
    Write-Host ""
    Write-Host "You will need:" -ForegroundColor Yellow
    Write-Host "  • AWS Access Key ID"
    Write-Host "  • AWS Secret Access Key"
    Write-Host "  • AWS Region (enter: us-east-1)"
    Write-Host ""
    
    aws configure
    Write-Success "AWS CLI configured"
    
    Write-Status "Verifying credentials..."
    try {
        $caller = aws sts get-caller-identity --output json | ConvertFrom-Json
        Write-Success "Credentials verified!"
        Write-Host "Account: $($caller.Account)" -ForegroundColor Green
        Write-Host "User: $($caller.Arn)" -ForegroundColor Green
    }
    catch {
        Write-Error "Failed to verify credentials"
    }
}

# Step 3: Create VPC & Security Groups
function Create-VPCandSGs {
    Write-Status "Creating VPC..."
    
    $vpc = aws ec2 create-vpc --cidr-block 10.0.0.0/16 --query 'Vpc.VpcId' --output text
    Write-Success "VPC created: $vpc"
    
    Write-Status "Creating Internet Gateway..."
    $igw = aws ec2 create-internet-gateway --query 'InternetGateway.InternetGatewayId' --output text
    aws ec2 attach-internet-gateway --internet-gateway-id $igw --vpc-id $vpc
    Write-Success "IGW created and attached: $igw"
    
    Write-Status "Creating subnets..."
    $subnet1 = aws ec2 create-subnet --vpc-id $vpc --cidr-block 10.0.1.0/24 --availability-zone us-east-1a --query 'Subnet.SubnetId' --output text
    $subnet2 = aws ec2 create-subnet --vpc-id $vpc --cidr-block 10.0.2.0/24 --availability-zone us-east-1b --query 'Subnet.SubnetId' --output text
    Write-Success "Subnets created: $subnet1, $subnet2"
    
    Write-Status "Creating security group..."
    $sg = aws ec2 create-security-group --group-name plant-health-sg --description "Plant Health Backend" --vpc-id $vpc --query 'GroupId' --output text
    Write-Success "Security group created: $sg"
    
    Write-Status "Adding ingress rules..."
    aws ec2 authorize-security-group-ingress --group-id $sg --protocol tcp --port 22 --cidr 0.0.0.0/0 | Out-Null
    aws ec2 authorize-security-group-ingress --group-id $sg --protocol tcp --port 80 --cidr 0.0.0.0/0 | Out-Null
    aws ec2 authorize-security-group-ingress --group-id $sg --protocol tcp --port 443 --cidr 0.0.0.0/0 | Out-Null
    aws ec2 authorize-security-group-ingress --group-id $sg --protocol tcp --port 5000 --cidr 0.0.0.0/0 | Out-Null
    Write-Success "Security group rules added"
    
    Write-Host ""
    Write-Host "Resources created:" -ForegroundColor Green
    Write-Host "  VPC ID: $vpc"
    Write-Host "  IGW ID: $igw"
    Write-Host "  Subnet 1: $subnet1"
    Write-Host "  Subnet 2: $subnet2"
    Write-Host "  Security Group: $sg"
    Write-Host ""
    
    # Save for later use
    $config = @{
        VpcId = $vpc
        IgwId = $igw
        Subnet1 = $subnet1
        Subnet2 = $subnet2
        SecurityGroup = $sg
    }
    $config | ConvertTo-Json | Out-File "aws-config.json"
    Write-Success "Config saved to aws-config.json"
}

# Step 4: Create RDS Database
function Create-RDBDatabase {
    Write-Status "Creating RDS PostgreSQL database..."
    
    Write-Host "This will create a free tier eligible db.t2.micro instance" -ForegroundColor Yellow
    
    $dbPassword = Read-Host "Enter database password (min 8 chars, include uppercase, numbers, special chars)" -AsSecureString
    $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($dbPassword))
    
    # Load config
    $config = Get-Content aws-config.json | ConvertFrom-Json
    
    Write-Status "Creating DB subnet group..."
    aws rds create-db-subnet-group `
        --db-subnet-group-name plant-health-subnet `
        --db-subnet-group-description "Plant Health RDS Subnet Group" `
        --subnet-ids $config.Subnet1 $config.Subnet2 | Out-Null
    Write-Success "DB subnet group created"
    
    Write-Status "Creating RDS instance (this takes ~10 minutes)..."
    aws rds create-db-instance `
        --db-instance-identifier plant-health-db `
        --db-instance-class db.t2.micro `
        --engine postgres `
        --master-username admin `
        --master-user-password $plainPassword `
        --allocated-storage 20 `
        --storage-type gp2 `
        --db-subnet-group-name plant-health-subnet `
        --publicly-accessible false `
        --backup-retention-period 7 | Out-Null
    
    Write-Success "RDS instance creation initiated"
    Write-Host ""
    Write-Host "⏳ Waiting for database to be available..." -ForegroundColor Yellow
    Write-Host "   This typically takes 10-15 minutes"
    Write-Host ""
    
    # Poll for readiness
    $ready = $false
    $attempts = 0
    while (-not $ready -and $attempts -lt 60) {
        $status = aws rds describe-db-instances --db-instance-identifier plant-health-db --query 'DBInstances[0].DBInstanceStatus' --output text
        
        if ($status -eq "available") {
            $ready = $true
        }
        else {
            Write-Host "   Status: $status... waiting..." -ForegroundColor Cyan
            Start-Sleep -Seconds 10
            $attempts++
        }
    }
    
    if ($ready) {
        $endpoint = aws rds describe-db-instances --db-instance-identifier plant-health-db --query 'DBInstances[0].Endpoint.Address' --output text
        Write-Success "Database is ready!"
        Write-Host "Endpoint: $endpoint" -ForegroundColor Green
    }
    else {
        Write-Error "Database creation timed out. Check AWS console."
    }
}

# Step 5: Create ElastiCache Redis
function Create-Redis {
    Write-Status "Creating ElastiCache Redis cluster..."
    
    $config = Get-Content aws-config.json | ConvertFrom-Json
    
    Write-Status "Creating cache subnet group..."
    aws elasticache create-cache-subnet-group `
        --cache-subnet-group-name plant-health-redis-subnet `
        --cache-subnet-group-description "Plant Health Redis Subnet" `
        --subnet-ids $config.Subnet1 | Out-Null
    Write-Success "Cache subnet group created"
    
    Write-Status "Creating Redis cluster (takes ~5 minutes)..."
    aws elasticache create-cache-cluster `
        --cache-cluster-id plant-health-redis `
        --cache-node-type cache.t2.micro `
        --engine redis `
        --num-cache-nodes 1 `
        --engine-version 7.0 `
        --cache-subnet-group-name plant-health-redis-subnet | Out-Null
    
    Write-Success "Redis creation initiated"
    
    Write-Host ""
    Write-Host "⏳ Waiting for Redis to be available..." -ForegroundColor Yellow
    
    $ready = $false
    $attempts = 0
    while (-not $ready -and $attempts -lt 30) {
        $status = aws elasticache describe-cache-clusters --cache-cluster-id plant-health-redis --query 'CacheClusters[0].CacheClusterStatus' --output text - ErrorAction SilentlyContinue
        
        if ($status -eq "available") {
            $ready = $true
        }
        else {
            Write-Host "   Status: $status... waiting..." -ForegroundColor Cyan
            Start-Sleep -Seconds 10
            $attempts++
        }
    }
    
    if ($ready) {
        $endpoint = aws elasticache describe-cache-clusters --cache-cluster-id plant-health-redis --show-cache-node-info --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text
        Write-Success "Redis is ready!"
        Write-Host "Endpoint: $endpoint" -ForegroundColor Green
    }
}

# Step 6: Create EC2 Instance
function Create-EC2 {
    Write-Status "Creating EC2 instance..."
    
    $config = Get-Content aws-config.json | ConvertFrom-Json
    
    Write-Status "Creating key pair..."
    aws ec2 create-key-pair --key-name plant-health-key --query 'KeyMaterial' --output text | Out-File "plant-health-key.pem"
    Write-Success "Key pair created: plant-health-key.pem"
    
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Save your private key securely!" -ForegroundColor Red
    Write-Host "Do NOT share or commit to Git"
    Write-Host ""
    
    Write-Status "Launching EC2 instance..."
    # Amazon Linux 2 AMI
    $instance = aws ec2 run-instances `
        --image-id ami-0c55b159cbfafe1f0 `
        --instance-type t2.micro `
        --key-name plant-health-key `
        --security-group-ids $config.SecurityGroup `
        --subnet-id $config.Subnet1 `
        --associate-public-ip-address `
        --query 'Instances[0].InstanceId' `
        --output text
    
    Write-Success "EC2 instance launched: $instance"
    
    Write-Host ""
    Write-Host "⏳ Waiting for instance to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    $publicIp = aws ec2 describe-instances `
        --instance-ids $instance `
        --query 'Reservations[0].Instances[0].PublicIpAddress' `
        --output text
    
    Write-Success "Instance is running!"
    Write-Host "Public IP: $publicIp" -ForegroundColor Green
    Write-Host ""
    Write-Host "SSH Command:" -ForegroundColor Green
    Write-Host "ssh -i plant-health-key.pem ec2-user@$publicIp"
    Write-Host ""
}

# Step 7: Create Load Balancer
function Create-LoadBalancer {
    Write-Status "Creating Application Load Balancer..."
    Write-Host "⚠️  Not yet implemented in this version" -ForegroundColor Yellow
    Write-Host "Please complete manually using AWS Console or CLI commands from the deployment guide"
}

# Step 8: Summary
function Create-Summary {
    $config = Get-Content aws-config.json | ConvertFrom-Json 2>/dev/null
    
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║        AWS Deployment Summary                         ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    if ($config) {
        Write-Host "VPC Configuration:" -ForegroundColor Cyan
        Write-Host "  VPC ID: $($config.VpcId)" -ForegroundColor Green
        Write-Host "  Security Group: $($config.SecurityGroup)" -ForegroundColor Green
        Write-Host ""
    }
    
    try {
        $db = aws rds describe-db-instances --db-instance-identifier plant-health-db --query 'DBInstances[0].Endpoint.Address' --output text
        Write-Host "Database:" -ForegroundColor Cyan
        Write-Host "  Endpoint: $db" -ForegroundColor Green
        Write-Host ""
    }
    catch {}
    
    try {
        $redis = aws elasticache describe-cache-clusters --cache-cluster-id plant-health-redis --show-cache-node-info --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text
        Write-Host "Redis:" -ForegroundColor Cyan
        Write-Host "  Endpoint: $redis" -ForegroundColor Green
        Write-Host ""
    }
    catch {}
    
    try {
        $ec2 = aws ec2 describe-instances --filters "Name=tag:Name,Values=plant-health" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
        Write-Host "EC2 Instance:" -ForegroundColor Cyan
        Write-Host "  Public IP: $ec2" -ForegroundColor Green
        Write-Host ""
    }
    catch {}
    
    Write-Host "📖 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. SSH into EC2 instance"
    Write-Host "2. Run: chmod +x /path/to/aws-setup.sh && ./aws-setup.sh"
    Write-Host "3. Update .env with database and Redis endpoints"
    Write-Host "4. Transfer model files using SCP"
    Write-Host "5. Initialize database and start application"
    Write-Host ""
}

# Main loop
do {
    Show-Menu
    $choice = Read-Host "Select an option (0-9)"
    
    Write-Host ""
    
    switch ($choice) {
        "1" { Install-AWSCLI }
        "2" { Configure-AWS }
        "3" { Create-VPCandSGs }
        "4" { Create-RDBDatabase }
        "5" { Create-Redis }
        "6" { Create-EC2 }
        "7" { Create-LoadBalancer }
        "8" { Create-Summary }
        "9" {
            Write-Status "Running full deployment..."
            Install-AWSCLI
            Configure-AWS
            Create-VPCandSGs
            Create-RDBDatabase
            Create-Redis
            Create-EC2
            Create-Summary
        }
        "0" {
            Write-Host "Goodbye! 👋" -ForegroundColor Green
            exit
        }
        default {
            Write-Error "Invalid option. Please select 0-9."
        }
    }
    
    Write-Host ""
    Write-Host "Press any key to continue..."
    [void][System.Console]::ReadKey($true)
    Clear-Host
    
} while ($true)
