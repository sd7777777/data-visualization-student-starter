# Starter fork handoff

The course requires a GitHub fork of `curran/data-visualization-student-starter`. A local clone or a newly published repository does not create GitHub's visible fork relationship.

## What is already prepared

- The local branch descends from the upstream starter's `main` history.
- The live Week 1 experience is in `src/assignments/week-01`.
- Week 2 and Week 3 have their own assignment directories.
- `src/assignments/index.ts` provides the course-style assignment registry used by the site navigation.
- `.github/workflows/deploy-pages.yml` creates a static GitHub Pages build and handles a repository-specific base path.

## One-time account handoff

1. Open <https://github.com/curran/data-visualization-student-starter> and choose **Fork**.
2. Keep the fork in your personal GitHub account. The default name is acceptable.
3. Send the fork URL in the next Codex request. The repository can then be connected and pushed without rewriting the prepared history.
4. In the fork's GitHub settings, set **Pages > Source** to **GitHub Actions**.
5. After the workflow succeeds, collect the repository URL and Pages URL for Canvas.

Do not use GitHub Desktop's **Publish repository** action to create an unrelated repository if the instructor expects GitHub to show “forked from curran/data-visualization-student-starter.” GitHub must create the fork first.
