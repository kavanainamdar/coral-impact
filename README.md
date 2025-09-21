# coral-impact
This project integrates and analyzes fishing fleet and coral bleaching datasets, storing the processed data for API access and visualization through an interactive web application.

## Frontend (React + Vite) Azure Deployment

This repository now includes scripts to build and deploy the static React application to an Azure Linux Web App (similar structure to the reference `sdr-flight-mapping` frontend).

### Project Scripts

| Script | Purpose |
| ------ | ------- |
| `scripts/build-webapp.sh` | Install dependencies and produce production build into `dist/`. |
| `scripts/run-webapp-local.sh` | Serve the built app locally using `vite preview` (auto-builds if missing). |
| `scripts/create-azure-webapp.sh` | One-time (or repeatable) Azure provisioning + zip deploy of `dist/`. |
| `startup.sh` | Startup file executed by Azure Web App to serve static assets (tries `npx serve`, falls back to Python). |

### Azure Deployment (Manual CLI)

Prerequisites: Azure CLI installed, account logged in (`az login`).

1. Adjust (optional) environment variables before running:
	```bash
	export AZ_RESOURCE_GROUP=coral-impact-rg
	export AZ_REGION=westus2
	export AZ_PLAN=coral-impact-plan
	export AZ_WEBAPP=coral-impact-webapp
	```
2. Run the provisioning + deployment script:
	```bash
	bash scripts/create-azure-webapp.sh
	```
3. Open the site:
	```
	https://$AZ_WEBAPP.azurewebsites.net/
	```

If you later change frontend code:
```bash
bash scripts/build-webapp.sh
cd dist && zip -r site.zip . && cd ..
az webapp deploy --resource-group $AZ_RESOURCE_GROUP --name $AZ_WEBAPP --src-path site.zip --type zip
```

### Local Development

Use the Vite dev server:
```bash
npm install
npm run dev
```

Production preview (after build):
```bash
npm run build
npm run preview
```

### Notes
* `dist/` is ignored by git (see `.gitignore`).
* No Express server is used; static files are served via `npx serve` inside Azure.
* The `startup.sh` auto-builds if `dist/` isn’t present (first container start or clean deployment).
* For higher performance/caching, consider Azure Static Web Apps (build & deploy directly from GitHub Actions) as a future enhancement.
* New "About" tab provides an overview of purpose, data pipeline, and future enhancements.

### What to Commit vs Generate

Commit (source of truth):
* `src/` React source (including `tabs/AboutTab.jsx`).
* `public/` static assets & bundled data under `public/data/` that the app reads at runtime.
* `scripts/` deployment & build helper scripts (`build-webapp.sh`, `run-webapp-local.sh`, `create-azure-webapp.sh`).
* `startup.sh` startup script for Azure Web App container.
* `package.json`, `package-lock.json` (if present) for deterministic installs.
* `README.md`, `LICENSE`, config files (e.g., `vite.config.js`).

Do NOT commit (ephemeral / reproducible):
* `dist/` build output (always regenerated via `npm run build`).
* `node_modules/` (installed via `npm install`).
* Temporary archives like `site.zip` produced for deployment.
* Local logs (`*.log`) or scratch outputs from data pipeline under `data-pipeline/coral_pipeline/outputs/`.

Large / evolving datasets:
* If future datasets become large (>50MB) consider using Git LFS or hosting them externally (object storage) and referencing via a fetch layer instead of committing directly.
* The very large `intersections_full.geojson` is retained only on the `full-data` branch to keep `prod` / `main` lightweight; the application currently uses the lighter `intersections_light.geojson`.

### First-Time Upstream Push

```bash
git init  # if not already a repo
git add .
git commit -m "Initial coral-impact frontend with analysis, map, and about tabs"
git remote add origin <YOUR_REPO_URL>
git push -u origin prod
```

Subsequent changes:
```bash
git add src/ scripts/ public/ README.md
git commit -m "feat: add About tab and deployment notes"
git push
```

If you add large binary data later and choose Git LFS:
```bash
git lfs install
git lfs track "public/data/*.geojson"
git add .gitattributes public/data/*.geojson
git commit -m "chore: track geojson via LFS"
git push
```

### Future Enhancements
* GitHub Actions workflow for CI/CD deployment.
* Add runtime environment variables (e.g., API base URL) via `import.meta.env` and Vite `.env` files.
* Add automatic cache busting analysis and bundle size dashboards.

