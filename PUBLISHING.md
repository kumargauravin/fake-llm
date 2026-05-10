# Publishing `@nice-tools/fake-llm` to npm

## Step 1 — Create the `@nice-tools` npm Organization

1. Go to [https://www.npmjs.com](https://www.npmjs.com) and log in.
2. Click your avatar (top right) → **"Add Organization"**.
3. Enter `nice-tools` as the organization name.
4. Choose **Free** plan (public packages only).
5. Click **Create**.

> ✅ This creates the `@nice-tools` scope on npm, allowing you to publish `@nice-tools/fake-llm`.

---

## Step 2 — Create an npm Automation Token

1. Go to [https://www.npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens).
2. Click **"Generate New Token"** → **"Automation"** (works with CI/CD).
3. Copy the token — you will only see it once.

---

## Step 3 — Add Token to GitHub Secrets

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**.
2. Click **"New repository secret"**.
3. Name: `NPM_TOKEN`
4. Value: paste the token from Step 2.
5. Click **Add secret**.

---

## Step 4 — Publish Manually (First Time)

Run the following locally to publish for the first time:

```bash
cd packages/mock-llm
npm install
npm run build
npm publish --access public
```

> After the first manual publish, all future releases are handled automatically via GitHub Actions on new tags.

---

## Step 5 — Automated Publishing (GitHub Actions)

A workflow is configured at `.github/workflows/publish-npm.yml`.

To trigger a new release:

```bash
git tag v1.0.1
git push origin v1.0.1
```

This will:
1. Build `@nice-tools/fake-llm`
2. Publish to npm
3. Trigger a GitHub Pages redeploy of the demo app

---

## Package Versioning

Follow [Semantic Versioning](https://semver.org/):

| Change Type | Version Bump | Example |
|---|---|---|
| Bug fix | Patch | `1.0.0` → `1.0.1` |
| New feature | Minor | `1.0.0` → `1.1.0` |
| Breaking change | Major | `1.0.0` → `2.0.0` |

Update version in `packages/mock-llm/package.json` before tagging.

---

## Useful Links

- npm org: [https://www.npmjs.com/org/nice-tools](https://www.npmjs.com/org/nice-tools)
- Package: [https://www.npmjs.com/package/@nice-tools/fake-llm](https://www.npmjs.com/package/@nice-tools/fake-llm)
- GitHub repo: [https://github.com/kumargauravin/fake-llm](https://github.com/kumargauravin/fake-llm)
