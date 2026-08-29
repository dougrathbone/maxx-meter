# Releasing MaxxMeter

MaxxMeter uses [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

## Automated CI

Every push to `main` and every pull request runs:

- `npm ci` → `npm run build` → `npm test`
- Docker image build (local dev `Dockerfile`, no push)

## Cutting a release

### Option A — GitHub Actions (recommended)

1. Open **Actions** → **Prepare Release**
2. Choose **patch**, **minor**, or **major**
3. Run workflow

This will:

1. Bump `package.json`, `dashboard/package.json`, and `maxxmeter/config.yaml`
2. Set `maxxmeter/config.yaml` `GITHUB_REF` to the new tag (for HA add-on builds)
3. Commit to `main`, create tag `vX.Y.Z`, and push
4. Trigger the **Release** workflow automatically

### Option B — Manual tag

1. Bump versions locally:

   ```bash
   npm version patch --no-git-tag-version   # or minor / major
   node scripts/sync-version.mjs $(node -p "require('./package.json').version")
   git add package.json package-lock.json dashboard/package.json maxxmeter/config.yaml
   git commit -m "chore(release): vX.Y.Z"
   git tag vX.Y.Z
   git push && git push origin vX.Y.Z
   ```

2. Verify alignment before tagging:

   ```bash
   node scripts/check-version.mjs X.Y.Z
   ```

## Release workflow

Pushing a tag matching `v*.*.*` runs **Release**:

- Validates semver and version file alignment
- Builds and tests
- Creates a GitHub Release with auto-generated notes
- Pushes `ghcr.io/<owner>/maxx-meter:<version>` and `:latest`

## Home Assistant add-on

The add-on Dockerfile clones `GITHUB_REF` from `maxxmeter/config.yaml`. The **Prepare Release** workflow sets this to the release tag (`vX.Y.Z`) so Supervisor builds pin to that version. On `main` between releases, `GITHUB_REF` stays `main`.

## Pre-release versions

Tags like `v1.0.0-beta.1` are supported. GitHub Releases are marked **pre-release** when the version contains `-`.
