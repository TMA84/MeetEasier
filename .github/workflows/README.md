# GitHub Actions Workflows

This directory contains automated workflows for MeetEasier.

## Workflows

### 1. Release Workflow (`release.yml`)

**Trigger:** Automatically runs when you push a version tag (e.g., `v1.1.1`)

**What it does:**
- Builds the application (CSS and React)
- Extracts release notes from CHANGELOG.md for the specific version
- Creates a GitHub Release with the version tag
- Builds and pushes Docker images to GitHub Container Registry (ghcr.io)
- Supports multi-platform builds (amd64, arm64)
- **Scans Docker images for CVEs with Trivy**
- **Uploads security results to GitHub Security tab**

**Docker Images Published:**
- `ghcr.io/tma84/meeteasier:1.1.2` (version tag)
- `ghcr.io/tma84/meeteasier:1.1` (minor version)
- `ghcr.io/tma84/meeteasier:1` (major version)
- `ghcr.io/tma84/meeteasier:latest` (latest release)

**Security:**
- All images are scanned for CRITICAL and HIGH vulnerabilities
- Results uploaded to GitHub Security → Code scanning alerts
- Build fails if critical vulnerabilities are found

**Usage:**
```bash
# After committing your changes and updating CHANGELOG.md
git tag -a v1.1.1 -m "Release v1.1.1"
git push origin v1.1.1
```

The workflow will automatically:
- Create a GitHub release
- Build and push Docker images
- Scan for vulnerabilities
- Generate usage instructions

---

### 2. Docker Publish Workflow (`docker-publish.yml`)

**Trigger:** 
- Automatically on version tags
- Manually via workflow dispatch

**What it does:**
- Builds multi-platform Docker images (amd64, arm64)
- Pushes to GitHub Container Registry (ghcr.io)
- Optionally pushes to Docker Hub (if credentials configured)
- **Scans images for CVEs with Trivy**
- **Uploads security results to GitHub Security tab**
- Generates usage instructions and Docker Compose examples

**Setup Docker Hub (Optional):**
1. Go to GitHub → Settings → Secrets and variables → Actions
2. Add secrets:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_TOKEN`: Your Docker Hub access token

**Manual Trigger:**
1. Go to GitHub → Actions → "Publish Docker Image"
2. Click "Run workflow"
3. Enter tag name (e.g., `latest`, `1.1.2`)
4. Click "Run workflow"

---

### 3. Security Scan Workflow (`security-scan.yml`)

**Trigger:**
- Daily at 2 AM UTC (scheduled)
- On push to master when dependencies or Dockerfile change
- Manually via workflow dispatch

**What it does:**
- **NPM Audit** - Scans Node.js dependencies for known vulnerabilities
- **Trivy Filesystem Scan** - Scans project files for vulnerabilities
- **Trivy Docker Scan** - Scans latest Docker image for CVEs
- Uploads all results to GitHub Security tab
- Generates detailed security summary

**Scans:**
- ✅ Root package dependencies
- ✅ UI React dependencies
- ✅ Filesystem vulnerabilities
- ✅ Docker image vulnerabilities (OS packages, libraries)
- ✅ CRITICAL, HIGH, and MEDIUM severity issues

**View Results:**
- Go to: Repository → Security → Code scanning
- Filter by severity, category, or tool
- Get detailed remediation advice

**Manual Trigger:**
1. Go to GitHub → Actions → "Security Scan"
2. Click "Run workflow"
3. Click "Run workflow"

---

### 4. Version Bump Workflow (`version-bump.yml`)

**Trigger:** Manual workflow dispatch (run from GitHub Actions tab)

**What it does:**
- Automatically bumps version number (patch/minor/major)
- Updates CHANGELOG.md with new version entry
- Updates README.md with new version number
- Commits changes to master
- Creates and pushes version tag
- Triggers the release workflow automatically (which builds Docker images)

**Usage:**
1. Go to GitHub → Actions tab
2. Select "Version Bump" workflow
3. Click "Run workflow"
4. Choose version type:
   - **patch**: 1.1.1 → 1.1.2 (bug fixes)
   - **minor**: 1.1.1 → 1.2.0 (new features)
   - **major**: 1.1.1 → 2.0.0 (breaking changes)
5. Enter a brief description of changes
6. Click "Run workflow"

The workflow will automatically:
- Update version numbers
- Update CHANGELOG.md
- Commit and push changes
- Create and push the version tag
- Trigger the release workflow (which builds Docker images)

---

## Docker Image Usage

### Pull from GitHub Container Registry

```bash
# Pull specific version
docker pull ghcr.io/tma84/meeteasier:1.1.2

# Pull latest
docker pull ghcr.io/tma84/meeteasier:latest
```

### Run the container

```bash
docker run -d -p 8080:8080 \
  -e OAUTH_CLIENT_ID=your_client_id \
  -e OAUTH_AUTHORITY=https://login.microsoftonline.com/your_tenant_id \
  -e OAUTH_CLIENT_SECRET=your_client_secret \
  -e API_TOKEN=your_secure_token \
  -v $(pwd)/data:/opt/meeteasier/data \
  -v $(pwd)/static/img/uploads:/opt/meeteasier/static/img/uploads \
  ghcr.io/tma84/meeteasier:latest
```

### Docker Compose

```yaml
version: '3.8'

services:
  meeteasier:
    image: ghcr.io/tma84/meeteasier:latest
    ports:
      - "8080:8080"
    environment:
      - OAUTH_CLIENT_ID=${OAUTH_CLIENT_ID}
      - OAUTH_AUTHORITY=${OAUTH_AUTHORITY}
      - OAUTH_CLIENT_SECRET=${OAUTH_CLIENT_SECRET}
      - API_TOKEN=${API_TOKEN}
    volumes:
      - ./data:/opt/meeteasier/data
      - ./static/img/uploads:/opt/meeteasier/static/img/uploads
    restart: unless-stopped
```

---

## Recommended Workflow

### Option 1: Manual (Current Method)
1. Make your changes
2. Update CHANGELOG.md manually
3. Update README.md version manually
4. Commit changes
5. Create and push tag
6. Release workflow runs automatically (builds Docker images)

### Option 2: Semi-Automated (Recommended)
1. Make your changes and commit them
2. Go to GitHub Actions → "Version Bump"
3. Run workflow with version type and description
4. Everything else is automated (including Docker images)

### Option 3: Docker Only
1. Go to GitHub Actions → "Publish Docker Image"
2. Run workflow manually with desired tag
3. Docker images are built and pushed

---

## Security Scanning

All workflows include automated security scanning:

### What Gets Scanned

1. **NPM Dependencies**
   - Root package.json dependencies
   - UI React package.json dependencies
   - Checks for known vulnerabilities in npm packages

2. **Docker Images**
   - Base image vulnerabilities (Alpine Linux)
   - Installed OS packages
   - Application dependencies
   - Configuration issues

3. **Filesystem**
   - Source code vulnerabilities
   - Configuration files
   - Secrets detection

### Vulnerability Severity Levels

- 🔴 **CRITICAL** - Immediate action required
- 🟠 **HIGH** - Should be fixed soon
- 🟡 **MEDIUM** - Fix when possible
- 🔵 **LOW** - Informational

### Viewing Security Results

1. Go to: Repository → **Security** → **Code scanning**
2. Filter by:
   - Severity (Critical, High, Medium, Low)
   - Category (filesystem, docker-image)
   - Tool (Trivy, npm audit)
3. Click on any alert for:
   - Detailed description
   - Affected components
   - Remediation advice
   - CVE references

### Automated Scanning Schedule

- **Daily**: Full security scan at 2 AM UTC
- **On Release**: Docker images scanned before publishing
- **On Dependency Changes**: Triggered when package.json or Dockerfile changes
- **Manual**: Run anytime from Actions tab

### Security Best Practices

✅ Review security alerts regularly
✅ Update dependencies frequently
✅ Use specific version tags in production
✅ Enable GitHub Dependabot for automatic updates
✅ Monitor the Security tab for new vulnerabilities

---

## Benefits of Automation

✅ **Consistency** - Version numbers always match across files
✅ **Speed** - One click instead of multiple manual steps
✅ **Accuracy** - No typos or forgotten files
✅ **Traceability** - Every release has proper changelog and tag
✅ **Professional** - Automated releases look more polished
✅ **Docker Images** - Automatically built and published for every release
✅ **Multi-Platform** - Supports both amd64 and arm64 architectures
✅ **Security** - Automated CVE scanning and vulnerability reporting

---

## Notes

- The workflows use `GITHUB_TOKEN` which is automatically provided by GitHub
- Docker images are pushed to GitHub Container Registry (ghcr.io) by default
- Docker Hub publishing is optional (requires secrets configuration)
- Multi-platform builds support both Intel/AMD and ARM processors
- Images are cached for faster subsequent builds
- No additional secrets or configuration needed for GitHub Container Registry
- Workflows can be disabled if you prefer manual process
- You can customize the workflows to fit your needs
