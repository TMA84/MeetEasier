# GitHub Actions Workflows

This directory contains automated workflows for MeetEasier.

## Workflows

### 1. Release Workflow (`release.yml`)

**Trigger:** Automatically runs when you push a version tag (e.g., `v1.1.1`)

**What it does:**
- Builds the application (CSS and React)
- Extracts release notes from CHANGELOG.md for the specific version
- Creates a GitHub Release with the version tag
- Attaches build artifacts (optional)

**Usage:**
```bash
# After committing your changes and updating CHANGELOG.md
git tag -a v1.1.1 -m "Release v1.1.1"
git push origin v1.1.1
```

The workflow will automatically create a release on GitHub with the changelog content.

---

### 2. Version Bump Workflow (`version-bump.yml`)

**Trigger:** Manual workflow dispatch (run from GitHub Actions tab)

**What it does:**
- Automatically bumps version number (patch/minor/major)
- Updates CHANGELOG.md with new version entry
- Updates README.md with new version number
- Commits changes to master
- Creates and pushes version tag
- Triggers the release workflow automatically

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
- Trigger the release workflow

---

## Recommended Workflow

### Option 1: Manual (Current Method)
1. Make your changes
2. Update CHANGELOG.md manually
3. Update README.md version manually
4. Commit changes
5. Create and push tag
6. Release workflow runs automatically

### Option 2: Semi-Automated (Recommended)
1. Make your changes and commit them
2. Go to GitHub Actions → "Version Bump"
3. Run workflow with version type and description
4. Everything else is automated

### Option 3: Fully Manual (No Automation)
If you prefer not to use GitHub Actions:
1. Make changes
2. Update CHANGELOG.md and README.md
3. Commit: `git commit -m "chore: Bump version to X.X.X"`
4. Tag: `git tag -a vX.X.X -m "Release vX.X.X"`
5. Push: `git push origin master && git push origin vX.X.X`
6. Create release manually on GitHub

---

## Benefits of Automation

✅ **Consistency** - Version numbers always match across files
✅ **Speed** - One click instead of multiple manual steps
✅ **Accuracy** - No typos or forgotten files
✅ **Traceability** - Every release has proper changelog and tag
✅ **Professional** - Automated releases look more polished

---

## Notes

- The workflows use `GITHUB_TOKEN` which is automatically provided by GitHub
- No additional secrets or configuration needed
- Workflows can be disabled if you prefer manual process
- You can customize the workflows to fit your needs
