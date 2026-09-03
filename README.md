# data-visualization-student-starter

Student assignments for the data visualization course [Constructing Visualizations](https://github.com/curran/constructing-visualizations).

## What is included

- **Week 1** — the responsive pseudo-scatterplot exercise.
- **Week 2** — a browser-loaded and summarized bee colony loss dataset at `src/assignments/week-02`.
- **Final Project Exploration 1** — early topic, question, dataset, inspiration, and visualization ideas at [`docs/FINAL_PROJECT_EXPLORATION_1.md`](docs/FINAL_PROJECT_EXPLORATION_1.md).
- **Dataset documentation** — source, concept, and attribute types at [`public/data/bee-colony-loss/README.md`](public/data/bee-colony-loss/README.md).

## Run locally

Install the dependencies, then start the development server:

```sh
npm install
npm run dev
```

The assignment switcher is in the left sidebar. Week 2 can also be opened directly with the `?example=2` query parameter.

## Publish with GitHub Pages

The repository includes [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). After pushing the changes to `main`:

1. Open the repository on GitHub and go to **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Open the **Actions** tab and wait for **Deploy to GitHub Pages** to finish.

The expected site URL is:

`https://sd7777777.github.io/data-visualization-student-starter/`

The Vite base path is already configured for that repository name, and the Week 2 data URL uses the same base path so it works both locally and on GitHub Pages.

## Submission links

For the final project exploration assignment, submit the GitHub link to [`docs/FINAL_PROJECT_EXPLORATION_1.md`](https://github.com/sd7777777/data-visualization-student-starter/blob/main/docs/FINAL_PROJECT_EXPLORATION_1.md).

For Week 2, submit the GitHub link to [`src/assignments/week-02/LoadingAndSummarizingData.tsx`](https://github.com/sd7777777/data-visualization-student-starter/blob/main/src/assignments/week-02/LoadingAndSummarizingData.tsx) and the hosted site link above after the first successful deployment.
