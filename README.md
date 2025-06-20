# React GitHub Pages Example

[![GitHub Pages](https://img.shields.io/badge/demo-online-green)](https://erik-donath.github.io/react-github-pages/)

This repository demonstrates how to deploy a React application to GitHub Pages using [Vite](https://vitejs.dev/) as the build tool. The project leverages a GitHub Actions workflow to statically compile the app and deploy it automatically to GitHub Pages.

## Features

- ⚡ Fast development and build with [Vite](https://vitejs.dev/)
- ⚛️ React for building user interfaces
- 🚀 Automatic deployment to GitHub Pages via GitHub Actions

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run the development server**

   ```bash
   npm run dev
   ```

3. **Build for production**

   ```bash
   npm run build
   ```

4. **Preview the build locally**

   ```bash
   npm run preview
   ```

## Deployment

This repository includes a GitHub Actions workflow that automatically builds and deploys your app to GitHub Pages on every push to the `main` branch.

**Important:**  
On first use, the initial workflow run will likely fail with an error. This is because GitHub Pages deployment is _not enabled by default_ in repositories using this template.  
To fix this:

1. Go to your repository's **Settings**.
2. Under the **Pages** section, set the source to "GitHub Actions" as appropriate.
3. Enable "Allow GitHub Actions to deploy to GitHub Pages".
4. Re-run the failed workflow from the **Actions** tab.

Once enabled, subsequent pushes to `main` will trigger a build and deploy your site automatically.

## Live Demo

After a successful deployment, your app will be available at:  
```
https://<your-github-username>.github.io/<your-repo-name>/
```
Replace `<your-github-username>` and `<your-repo-name>` with your actual GitHub username and repository name.

## License

This project is provided as an example and is open source under the MIT License.
