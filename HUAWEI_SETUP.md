# 🌐 InvestGhanaHub Huawei Cloud Setup Guide

Complete guide to deploy InvestGhanaHub on Huawei Cloud (HUAWEI CLOUD).

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Huawei Cloud Account Setup](#huawei-cloud-account-setup)
3. [ECS Server Setup](#ecs-server-setup)
4. [RDS Database Configuration](#rds-database-configuration)
5. [Application Deployment](#application-deployment)
6. [Domain & SSL Configuration](#domain--ssl-configuration)
7. [Security Configuration](#security-configuration)
8. [Monitoring & Backup](#monitoring--backup)
9. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required Accounts & Tools
- **Huawei Cloud Account**: [console.huaweicloud.com](https://console.huaweicloud.com)
- **Domain Name**: For custom domain setup
- **Git**: For code deployment
- **Node.js 18+**: For local development
- **SSH Client**: For server access

### Huawei Cloud Services Needed
- **ECS (Elastic Cloud Server)**: For hosting the application
- **RDS (Relational Database Service)**: PostgreSQL database
- **ELB (Elastic Load Balance)**: For load balancing
- **VPC (Virtual Private Cloud)**: Network isolation
- **DNS**: Domain name resolution
- **SSL Certificate**: HTTPS security

---

## 🚀 Huawei Cloud Account Setup

### Step 1: Create Account & Verification

1. Go to [Huawei Cloud Console](https://console.huaweicloud.com)
2. Click **"Register"** and complete registration
3. Complete identity verification (required for production)
4. Add payment method for billing

### Step 2: Choose Region

Select the optimal region for your target audience:
- **Africa**: `af-south-1` (Johannesburg) - Recommended for Ghana
- **Europe**: `eu-west-0` (Paris) - Alternative option

### Step 3: Set Budget Alerts

1. Go to **Billing & Costs** → **Budget Management**
2. Set monthly budget alerts
3. Configure notification preferences

---

## 🖥️ ECS Server Setup

### Step 1: Create VPC

1. Navigate to **Network** → **Virtual Private Cloud**
2. Click **"Create VPC"**
3. Configure:
   ```
   Name: investghanahub-vpc
   CIDR Block: 192.168.0.0/16
   Region: af-south-1
   ```

### Step 2: Create Subnet

1. In your VPC, click **"Create Subnet"**
2. Configure:
   ```
   Name: investghanahub-subnet
   CIDR Block: 192.168.1.0/24
   Gateway: 192.168.1.1
   ```

### Step 3: Create Security Group

1. Go to **Network** → **Security Group**
2. Click **"Create Security Group"**
3. Configure inbound rules:
   ```
   SSH: Port 22 (Your IP only)
   HTTP: Port 80 (0.0.0.0/0)
   HTTPS: Port 443 (0.0.0.0/0)
   Custom: Port 5000 (0.0.0.0/0) - Backend API
   ```

### Step 4: Create ECS Instance

1. Navigate to **Compute** → **Elastic Cloud Server**
2. Click **"Create ECS"**
3. Configure specifications:

#### Basic Configuration
```
Region: af-south-1
Availability Zone: af-south-1a
Flavor: s6.large.2 (2 vCPUs, 4GB RAM) - Minimum
Image: Ubuntu 22.04 LTS
System Disk: 40GB SSD
```

#### Network Configuration
```
VPC: investghanahub-vpc
Subnet: investghanahub-subnet
Security Group: investghanahub-sg
EIP: Bind Elastic IP
```

#### Authentication
```
Login Mode: Key Pair
Key Pair: Create new key pair (download .pem file)
```

### Step 5: Connect to ECS

```bash
# Set correct permissions for key pair
chmod 400 your-key-pair.pem

# Connect to server
ssh -i your-key-pair.pem ubuntu@your-ecs-public-ip
```

---

## 🗄️ RDS Database Configuration

### Step 1: Create RDS Instance

1. Navigate to **Database** → **Relational Database Service**
2. Click **"Create Instance"**
3. Configure:

#### Basic Settings
```
Engine: PostgreSQL
Version: 14.11
Instance Class: rds.pg.c2.medium.2 (2 vCPUs, 4GB RAM)
Storage: 100GB SSD
```

#### Network Settings
```
VPC: investghanahub-vpc
Subnet: investghanahub-subnet
Security Group: investghanahub-db-sg
```

#### Authentication
```
Username: postgres
Password: Generate strong password (save securely)
```

### Step 2: Configure Database Access

1. Create database security group allowing ECS access:
   ```
   Inbound Rule: PostgreSQL (5432) from ECS security group
   ```

2. Create database:
   ```sql
   CREATE DATABASE investghanahub;
   ```

### Step 3: Get Connection String

```env
DATABASE_URL=postgresql://postgres:your-password@your-rds-endpoint:5432/investghanahub
```

---

## 🚀 Application Deployment

### Step 1: Server Initial Setup

Connect to your ECS instance and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install PostgreSQL client
sudo apt install -y postgresql-client
```

### Step 2: Clone & Setup Application

```bash
# Create application directory
sudo mkdir -p /var/www/investghanahub
sudo chown ubuntu:ubuntu /var/www/investghanahub
cd /var/www/investghanahub

# Clone repository
git clone https://github.com/your-username/investghanahub.git .

# Setup Backend
cd backend
npm install

# Setup Frontend
cd ../frontend
npm install
npm run build
```

### Step 3: Environment Configuration

Create backend environment file:

```bash
cd /var/www/investghanahub/backend
sudo nano .env
```

Add configuration:
```env
# Database
DATABASE_URL=postgresql://postgres:your-password@your-rds-endpoint:5432/investghanahub

# JWT & Security
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=your-32-character-encryption-key!
NODE_ENV=production

# Server
PORT=5000
FRONTEND_URL=https://your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email (Gmail/SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Paystack
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Hubtel SMS (Optional)
HUBTEL_CLIENT_ID=your-client-id
HUBTEL_CLIENT_SECRET=your-client-secret
HUBTEL_SENDER_ID=InvestGH
```

### Step 4: Database Setup

```bash
cd /var/www/investghanahub/backend

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed the database
npm run seed
```

### Step 5: Start Application with PM2

```bash
# Start backend
cd /var/www/investghanahub/backend
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'investghanahub-backend',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/investghanahub/error.log',
    out_file: '/var/log/investghanahub/out.log',
    log_file: '/var/log/investghanahub/combined.log',
    time: true
  }]
};
```

---

## 🌐 Domain & SSL Configuration

### Step 1: Configure DNS

1. Go to your domain registrar
2. Add A record:
   ```
   Type: A
   Name: @ (or your subdomain)
   Value: your-ecs-public-ip
   TTL: 300
   ```

3. Add CNAME for www (optional):
   ```
   Type: CNAME
   Name: www
   Value: your-domain.com
   ```

### Step 2: Configure Nginx

Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/investghanahub
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend static files
    location / {
        root /var/www/investghanahub/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/investghanahub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 3: SSL Certificate with Let's Encrypt

```bash
# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 🔒 Security Configuration

### Step 1: Firewall Setup

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Step 2: SSH Hardening

```bash
sudo nano /etc/ssh/sshd_config
```

Update configuration:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
Port 22 (change to custom port if desired)
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### Step 3: Application Security

1. **Environment Variables**: Ensure all secrets are in `.env` file
2. **Database Security**: Use strong passwords, limit access
3. **API Security**: Enable rate limiting, input validation
4. **Regular Updates**: Keep system and dependencies updated

---

## 📊 Monitoring & Backup

### Step 1: Huawei Cloud Monitoring

1. Navigate to **Management & Governance** → **Cloud Eye**
2. Create alarm rules for:
   - CPU Usage > 80%
   - Memory Usage > 85%
   - Disk Usage > 90%
   - ECS Instance Down

### Step 2: Database Backup

1. Go to RDS instance settings
2. Configure automated backups:
   ```
   Backup Retention Period: 7 days
   Backup Time: 02:00-03:00 GMT
   ```

3. Enable manual backups before major updates

### Step 3: Application Logging

```bash
# Create log directories
sudo mkdir -p /var/log/investghanahub
sudo chown ubuntu:ubuntu /var/log/investghanahub

# Configure log rotation
sudo nano /etc/logrotate.d/investghanahub
```

Add log rotation config:
```
/var/log/investghanahub/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reload all
    endscript
}
```

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### 1. Database Connection Failed
```bash
# Test connection from ECS
psql -h your-rds-endpoint -U postgres -d investghanahub

# Check security group rules
# Ensure ECS security group allows outbound to RDS
# Ensure RDS security group allows inbound from ECS
```

#### 2. Application Not Starting
```bash
# Check PM2 logs
pm2 logs

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check application logs
tail -f /var/log/investghanahub/error.log
```

#### 3. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check Nginx configuration
sudo nginx -t
```

#### 4. Performance Issues
```bash
# Check system resources
htop
df -h
free -h

# Check PM2 process status
pm2 monit

# Restart application if needed
pm2 restart all
```

### Emergency Procedures

#### Application Recovery
```bash
# Restart application
pm2 restart investghanahub-backend

# If that fails, rebuild from scratch
cd /var/www/investghanahub/backend
npm run build
pm2 restart all
```

#### Database Recovery
```bash
# List available backups
# Use Huawei Cloud Console to restore from backup

# Manual backup before major changes
pg_dump -h your-rds-endpoint -U postgres investghanahub > backup.sql
```

---

## ✅ Post-Deployment Checklist

### Security Verification
- [ ] SSL certificate valid and auto-renewal configured
- [ ] Firewall rules properly configured
- [ ] SSH keys secured (no password authentication)
- [ ] Environment variables set correctly
- [ ] Database access restricted to ECS only

### Functionality Testing
- [ ] User registration and login
- [ ] KYC submission and approval
- [ ] Investment creation and processing
- [ ] Email notifications working
- [ ] Payment integration (Paystack)
- [ ] File uploads (Cloudinary)

### Performance Monitoring
- [ ] Cloud Eye alerts configured
- [ ] Database backups enabled
- [ ] Log rotation configured
- [ ] PM2 monitoring setup
- [ ] Nginx performance optimized

---

## 📞 Support & Resources

### Huawei Cloud Documentation
- [ECS Documentation](https://support.huaweicloud.com/en-us/ecs/)
- [RDS Documentation](https://support.huaweicloud.com/en-us/rds/)
- [Cloud Eye Monitoring](https://support.huaweicloud.com/en-us/ces/)

### Emergency Contacts
- **Huawei Cloud Support**: Available 24/7 in console
- **Application Support**: support@investghanahub.com

---

## 🎉 Success!

Your InvestGhanaHub application is now live on Huawei Cloud!

- **Application URL**: `https://your-domain.com`
- **API Endpoint**: `https://your-domain.com/api`
- **Admin Access**: Use your configured admin credentials

Congratulations! 🇬🇭 Your investment platform is serving Ghana from Huawei Cloud infrastructure!

---

## 💰 Cost Optimization Tips

### ECS Optimization
- Use spot instances for non-critical workloads
- Right-size instances based on actual usage
- Enable auto-scaling for traffic spikes

### RDS Optimization
- Choose appropriate instance class
- Enable storage auto-scaling
- Use read replicas for read-heavy operations

### Network Optimization
- Use Huawei Cloud CDN for static assets
- Optimize data transfer within same region
- Monitor bandwidth usage regularly

---

**Last Updated**: December 2025
**Version**: 1.0
**Compatible**: Huawei Cloud Console (Latest)
