# Setting up the GitHub repository

This is a one-time checklist for you, the maintainer. It makes the repository behave like a well-run open source project: anyone can propose changes, and **nothing reaches `main` without a passing build and an approved review**.

## 1. Create and push

1. Create an empty public repository on GitHub (no README, no licence; they are already here).
2. Replace the placeholders:

   ```bash
   grep -rn "yehhmii\|francisco@pensavox.com" . --exclude-dir=node_modules
   ```

   Edit each match: `CODEOWNERS`, `package.json`, `electron-builder.yml`, the issue-template config, `SECURITY.md`, `CODE_OF_CONDUCT.md`, the docs and the README.

3. Check `git status` shows no `.env` and no keys, then push:

   ```bash
   git init -b main
   git add .
   git commit -m "feat: initial public release"
   git remote add origin https://github.com/yehhmii/buddy-desk.git
   git push -u origin main
   ```

4. Open the **Actions** tab and let the first CI run finish. GitHub only offers a check as "required" after it has run once.

## 2. Lock down `main`

Run the script (needs the [GitHub CLI](https://cli.github.com), logged in as the repo owner):

```bash
gh auth login
scripts/protect-main.sh yehhmii/buddy-desk
```

What it sets:

| Rule                                      | Effect                                                  |
| ----------------------------------------- | ------------------------------------------------------- |
| Pull request required                     | No direct pushes to `main`                              |
| 1 approving review, from a code owner     | Someone you trust must approve                          |
| Stale approvals dismissed on new commits  | A reviewed change cannot be swapped for a different one |
| Last pusher cannot approve their own work | Needs a second person                                   |
| CI must pass on Linux, Windows and macOS  | Broken code cannot merge                                |
| Branch must be up to date before merging  | CI ran against what actually lands                      |
| Conversations must be resolved            | Review comments are not ignored                         |
| Linear history, squash merges only        | A tidy, readable history                                |
| No force pushes, no deleting `main`       | History cannot be rewritten                             |
| Secret scanning and push protection       | GitHub blocks commits that contain API keys             |
| Workflows are read-only by default        | A compromised workflow cannot write to the repo         |
| `v*` tags cannot be moved or deleted      | Released versions stay what they were                   |

### Working alone

GitHub does not let you approve your own pull request. By default the script leaves **administrators able to bypass** these rules (`enforce_admins: false`), so you can still merge your own work after CI passes, while every outside contributor must be approved. Once you have a second maintainer, run:

```bash
STRICT=1 scripts/protect-main.sh yehhmii/buddy-desk
```

so the rules apply to everyone, including you.

## 3. One setting to change by hand

**Settings > Actions > General > Fork pull request workflows from outside collaborators** > choose **Require approval for all outside collaborators**.

This stops a stranger's pull request from running workflows (and using your runner minutes) before you have looked at it.

## 4. Optional but recommended

- **Settings > Code security**: enable _Private vulnerability reporting_ so people can follow [SECURITY.md](../SECURITY.md).
- **Settings > General > Pull Requests**: tick _Always suggest updating pull request branches_.
- After the first CodeQL run, add **Analyze (javascript-typescript)** to the required checks in the branch rule.
- Add the labels `good first issue` and `help wanted` and use them. They are how newcomers find work.
- Turn on **Discussions** for questions, so Issues stay for bugs and plans.

## 5. Reviewing outside pull requests

- Read the diff. Treat anything touching `src/preload`, `src/main/app/security.ts`, `src/main/services/secrets`, `config/csp.ts` or `.github` with extra care. `CODEOWNERS` makes sure you are asked.
- Be wary of new dependencies, install scripts, and network calls to unfamiliar hosts.
- Never run a contributor's branch with your real API keys. Use a throwaway key.
- Merge with **Squash and merge** and edit the message so history stays readable.
