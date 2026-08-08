# CEAL Calendar - Cloudflare Tunnel Deployment Guide

## Prerequisites

- ✅ A domain registered with Cloudflare (or transferred to Cloudflare DNS)
- ✅ Server with Docker and Docker Compose installed
- ✅ SSH access to your server
- ✅ Cloudflare account

---

## Part 1: Prepare Your Server

### Step 1: Transfer Files to Server

```bash
# On your local machine, compress the project
cd d:\Github
tar -czf CEAL-Calender.tar.gz CEAL-Calender/

# Upload to server (replace with your server details)
scp CEAL-Calender.tar.gz user@your-server-ip:/home/user/

# SSH into your server
ssh user@your-server-ip

# Extract the files
cd /home/user
tar -xzf CEAL-Calender.tar.gz
cd CEAL-Calender
```

### Step 2: Update Environment Variables

```bash
# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit the .env files with your production settings
nano .env
```

**Update `.env` with:**
```bash
# Django
SECRET_KEY=your-super-secret-production-key-change-this
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,domain.com,ceal.domain.com

# Database (These MUST be set, no defaults anymore!)
POSTGRES_DB=ceal_calendar
POSTGRES_USER=my_secure_db_user
POSTGRES_PASSWORD=my_extremely_strong_db_password

# CORS
CORS_ALLOWED_ORIGINS=https://domain.com,https://ceal.domain.com

# Frontend
VITE_API_URL=https://ceal.domain.com
```

**Update `backend/.env` similarly**

**Update `frontend/.env`:**
```bash
VITE_API_URL=https://ceal.domain.com
```

### Step 3: Start Docker Containers

```bash
# Build and start all services
docker-compose up -d --build

# Wait for services to start (about 30 seconds)
sleep 30

# Run database migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Seed clubs data
docker-compose exec backend python seed_data.py

# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput

# Verify all containers are running
docker-compose ps
```

---

## Part 2: Setup Cloudflare Tunnel

### Step 4: Install Cloudflared on Your Server

```bash
# For Debian/Ubuntu
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# For other systems, see: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Verify installation
cloudflared --version
```

### Step 5: Authenticate Cloudflared

```bash
# Login to Cloudflare (this will open a browser)
cloudflared tunnel login
```

This will:
1. Open a browser window
2. Ask you to select your domain
3. Download a certificate to `~/.cloudflared/cert.pem`

### Step 6: Create a Cloudflare Tunnel

```bash
# Create a tunnel named "ceal-calendar"
cloudflared tunnel create ceal-calendar

# This will output a Tunnel ID - SAVE THIS!
# Example output: Created tunnel ceal-calendar with id 12345678-1234-1234-1234-123456789abc
```

**Save your Tunnel ID** - you'll need it!

### Step 7: Create Tunnel Configuration File

```bash
# Create config directory if it doesn't exist
mkdir -p ~/.cloudflared

# Create the config file
nano ~/.cloudflared/config.yml
```

**Add this configuration** (replace `TUNNEL_ID` with your actual tunnel ID):

```yaml
tunnel: TUNNEL_ID
credentials-file: /root/.cloudflared/TUNNEL_ID.json

ingress:
  # Frontend - Main domain or subdomain
  - hostname: ceal.domain.com
    service: http://localhost:3100
  
  # Backend API - Same domain with /api path
  - hostname: ceal.domain.com
    path: /api/*
    service: http://localhost:8100
  
  # Backend Admin
  - hostname: ceal.domain.com
    path: /admin/*
    service: http://localhost:8100
  
  # Backend Static Files
  - hostname: ceal.domain.com
    path: /static/*
    service: http://localhost:8100
  
  # Catch-all rule (required)
  - service: http_status:404
```

**Alternative: Separate Subdomains**

If you prefer separate subdomains for frontend and backend:

```yaml
tunnel: TUNNEL_ID
credentials-file: /root/.cloudflared/TUNNEL_ID.json

ingress:
  # Frontend
  - hostname: ceal.domain.com
    service: http://localhost:3100
  
  # Backend API
  - hostname: api.domain.com
    service: http://localhost:8100
  
  # Catch-all rule (required)
  - service: http_status:404
```

### Step 8: Create DNS Routes in Cloudflare

```bash
# For single domain setup (ceal.domain.com)
cloudflared tunnel route dns ceal-calendar ceal.domain.com

# If using separate subdomains, also add:
# cloudflared tunnel route dns ceal-calendar api.domain.com
```

This automatically creates CNAME records in your Cloudflare DNS pointing to the tunnel.

### Step 9: Start the Tunnel

```bash
# Test the tunnel first
cloudflared tunnel run ceal-calendar

# If it works, press Ctrl+C and install as a service
sudo cloudflared service install

# Start the service
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# Check status
sudo systemctl status cloudflared
```

---

## Part 3: Configure Cloudflare Dashboard

### Step 10: Verify DNS Records

1. Go to **Cloudflare Dashboard** → Your Domain → **DNS**
2. You should see a CNAME record:
   - **Name**: `ceal` (or your subdomain)
   - **Target**: `TUNNEL_ID.cfargotunnel.com`
   - **Proxy status**: Proxied (orange cloud)

### Step 11: Configure SSL/TLS Settings

1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to: **Full** or **Full (strict)**
3. Go to **SSL/TLS** → **Edge Certificates**
4. Enable:
   - ✅ Always Use HTTPS
   - ✅ Automatic HTTPS Rewrites
   - ✅ Minimum TLS Version: 1.2

### Step 12: Configure Firewall Rules (Optional but Recommended)

1. Go to **Security** → **WAF**
2. Create rules to protect your application
3. Consider enabling:
   - Bot Fight Mode
   - Rate Limiting for API endpoints

---

## Part 4: Update Application Configuration

### Step 13: Update Django Settings for Production

SSH into your server and update:

```bash
cd /home/user/CEAL-Calender

# Update .env file
nano .env
```

**Update these values:**
```bash
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,ceal.domain.com
CORS_ALLOWED_ORIGINS=https://ceal.domain.com
FRONTEND_URL=https://ceal.domain.com
```

**Update `frontend/.env`:**
```bash
VITE_API_URL=https://ceal.domain.com
```

### Step 14: Restart Docker Containers

```bash
# Restart all services to apply changes
docker-compose restart

# Or rebuild if you made code changes
docker-compose down
docker-compose up -d --build
```

---

## Part 5: Verification

### Step 15: Test Your Deployment

1. **Test Frontend**: Open `https://ceal.domain.com` in your browser
   - Should show the CEAL Calendar login page
   - Check browser console for errors

2. **Test Backend API**: 
   ```bash
   curl https://ceal.domain.com/api/clubs/
   ```

3. **Test Admin Panel**: Open `https://ceal.domain.com/admin`

4. **Check SSL Certificate**: 
   - Click the padlock in browser
   - Should show valid Cloudflare SSL certificate

### Step 16: Monitor Logs

```bash
# View all container logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# View Cloudflare tunnel logs
sudo journalctl -u cloudflared -f
```

---

## Troubleshooting

### Issue: 502 Bad Gateway

**Solution:**
```bash
# Check if containers are running
docker-compose ps

# Check backend logs
docker-compose logs backend

# Restart containers
docker-compose restart
```

### Issue: CORS Errors

**Solution:**
```bash
# Update CORS settings in .env
CORS_ALLOWED_ORIGINS=https://ceal.domain.com

# Restart backend
docker-compose restart backend
```

### Issue: Static Files Not Loading

**Solution:**
```bash
# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput

# Restart backend
docker-compose restart backend
```

### Issue: Tunnel Not Connecting

**Solution:**
```bash
# Check tunnel status
sudo systemctl status cloudflared

# Check tunnel logs
sudo journalctl -u cloudflared -n 50

# Restart tunnel
sudo systemctl restart cloudflared
```

---

## Maintenance Commands

### Update Application

```bash
# Pull latest changes
cd /home/user/CEAL-Calender
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Run migrations
docker-compose exec backend python manage.py migrate

# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput
```

### Backup Database

```bash
# Backup PostgreSQL database
docker-compose exec postgres pg_dump -U postgres ceal_calendar > backup_$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec -T postgres psql -U postgres ceal_calendar < backup_20241130.sql
```

### View Tunnel Info

```bash
# List all tunnels
cloudflared tunnel list

# Show tunnel info
cloudflared tunnel info ceal-calendar

# Show tunnel routes
cloudflared tunnel route dns list
```

---

## Security Checklist

- ✅ Set `DEBUG=False` in production
- ✅ Use strong `SECRET_KEY`
- ✅ Use strong database passwords
- ✅ Enable HTTPS only (Cloudflare handles this)
- ✅ Configure proper `ALLOWED_HOSTS`
- ✅ Configure proper `CORS_ALLOWED_ORIGINS`
- ✅ Enable Cloudflare WAF and bot protection
- ✅ Regular backups of database
- ✅ Keep Docker images updated
- ✅ Monitor application logs

---

## Quick Reference

### Important URLs
- **Frontend**: https://ceal.domain.com
- **Admin Panel**: https://ceal.domain.com/admin
- **API Docs**: https://ceal.domain.com/api/

### Important Commands
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart tunnel
sudo systemctl restart cloudflared

# Check tunnel status
sudo systemctl status cloudflared
```

---

## 🛠️ Server Update & Migration Checklist

When deploying updates or moving to a new server, ensure you update these specific areas:

### 1. Environment Variables (.env)
Always check these in the root `.env`, `backend/.env`, and `frontend/.env`:
- [ ] `DEBUG=False` (Critical for production)
- [ ] `SECRET_KEY` (Generate a new unique one for production)
- [ ] `ALLOWED_HOSTS` (Include your domain and IP)
- [ ] `CORS_ALLOWED_ORIGINS` (Must match your frontend URL)
- [ ] `VITE_API_URL` (Frontend needs this to talk to the backend)
- [ ] `POSTGRES_PASSWORD` (Use a strong unique password)

### 2. Email Configuration
If you change your email provider or password:
- [ ] Update `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` (App Password)
- [ ] Verify `EMAIL_USE_TLS=True` and `EMAIL_PORT=587`

### 3. Database Updates
After pulling new code:
- [ ] Run migrations: `docker-compose exec backend python manage.py migrate`
- [ ] If new apps were added, ensure they are in `INSTALLED_APPS` (backend/ceal_calendar/settings.py)

### 4. Static Files
If you make UI changes:
- [ ] Run `docker-compose exec backend python manage.py collectstatic --noinput`
- [ ] Rebuild the frontend if using Docker: `docker-compose up -d --build frontend`

### 5. Cloudflare Tunnel
If your server IP changes:
- [ ] The tunnel will automatically reconnect if `cloudflared` is running as a service.
- [ ] If you change the domain name, update `~/.cloudflared/config.yml` and run `cloudflared tunnel route dns ceal-calendar new-domain.com`.

---

**🎉 Your CEAL Calendar is now deployed and accessible via Cloudflare Tunnel!**

For support, check the logs or refer to:
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
