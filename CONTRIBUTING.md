# Contributing to Jarvis Desk

Thanks for wanting to help. This project is small enough that one good pull request makes a visible difference.

## The short version

1. Fork the repo and create a branch from `main`.
2. Make your change, with tests.
3. Run `npm run format && npm run typecheck && npm test`.
4. Open a pull request using the template.
5. A maintainer reviews it. Once CI is green and one maintainer approves, it is squash-merged.

You cannot push to `main` directly, and neither can the maintainers: every change goes through a pull request and a review.

## Setting up

You need Node.js 22 or newer and Git.

```bash
git clone https://github.com/yehhmii/buddy-desk.git
cd buddy-desk
npm install
cp .env.example .env        # add at least one API key (see README)
npm run dev
```

| Command             | What it does                                |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Starts the app with hot reload              |
| `npm test`          | Runs the unit tests                         |
| `npm run typecheck` | Strict TypeScript across main, UI and tests |
| `npm run format`    | Formats everything with Prettier            |
| `npm run build`     | Typechecks and produces a production bundle |
| `npm run dist:win`  | Builds a Windows installer (on Windows)     |
| `npm run dist:mac`  | Builds macOS disk images (on a Mac)         |

You do not need paid API keys to contribute. Groq and Gemini both have free tiers, and most logic is covered by tests that need no network at all.

## How the code is organised

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first. In one paragraph: `src/main` is the Electron main process (database, services, IPC), `src/preload` is the only bridge the UI can use, `src/renderer` is the React UI, and `src/shared` holds types and schemas used by all three. `src/main/container.ts` is the single place where services are wired together.

## Rules that keep the project safe

These are checked in review, because they protect the people who run the app.

- **The UI never gets Node or secrets.** New capabilities go through a named method in `src/shared/api.ts`, implemented in `src/preload/index.ts`, handled in `src/main/ipc/registerIpc.ts`.
- **Validate every IPC input with zod** (`src/shared/schemas.ts`). Never trust data from the UI.
- **API keys stay in the main process.** Do not send them to the renderer, log them, or put them in error messages.
- **No remote code.** The app loads no scripts from the internet. Do not loosen the Content Security Policy in `config/csp.ts` without a written reason in the pull request.
- **Treat screen text and model output as untrusted.** Anything that came from OCR or an AI reply must never be able to trigger a destructive action by itself.
- **No `console.log`.** Use the logger in `src/main/core/logger.ts`.

## Code style

- TypeScript in strict mode. No `any`; use `unknown` and narrow it.
- One React component per file, named like the file.
- Pure logic lives in plain functions that are easy to test (see `src/shared` and `src/main/services/*/` for examples).
- Prettier decides formatting. Run `npm run format` and do not argue with it.
- Write tests for behaviour you add or change. Look at `tests/` for patterns: services take their dependencies as arguments, so they can be tested with simple fakes.

## Common contributions

- **A new character skin:** see [docs/ADDING_SKINS.md](docs/ADDING_SKINS.md). This is the easiest way to start.
- **A new AI provider:** implement `LlmProvider` (see `src/main/services/ai/OpenAICompatProvider.ts` and `AnthropicProvider.ts`), register it in `container.ts`, add its id to `PROVIDER_IDS`, then add a test like `tests/anthropic.test.ts`.
- **A new assistant tool:** add it to `src/main/services/ai/tools.ts`, handle it in `ToolExecutor.ts`, and test it.
- **A translation or bug fix:** just open a pull request.

## Pull requests

- Keep them focused. Several small pull requests are easier to review than one large one.
- Describe what changed and how you tested it. Screenshots help for anything visual.
- Commit messages in the style `fix: stop alarms ringing twice` or `feat: add Luna skin` are appreciated but not required.
- Be patient and kind. Reviews are done by volunteers.

## Reporting bugs and ideas

Use the issue templates. For security problems, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Conduct

Everyone taking part must follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Licence

By contributing you agree that your contribution is licensed under the [MIT licence](LICENSE). Only contribute artwork, sounds or code that you have the right to share.
