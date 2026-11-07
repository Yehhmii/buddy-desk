# Security Policy

Jarvis Desk handles API keys, a microphone, and screenshots, so security reports are taken seriously.

## Reporting a vulnerability

**Please do not open a public issue.** Report privately through GitHub:

> Security tab > Report a vulnerability (private security advisory)

or email **francisco@pensavox.com**. Include what you found, how to reproduce it, and what an attacker could do with it. You will get an acknowledgement within a few days. We will work with you on a fix and credit you in the release notes if you wish.

## What is in scope

- Ways for web content, screen text, or a model reply to run code or escape the sandbox
- Ways to read or exfiltrate API keys or the local database
- Bypassing the IPC validation, the Content Security Policy, or the permission handlers
- Problems in the installer or auto-update path

## What is not

- Issues that need an attacker who already controls your user account (the database and screenshots are readable by that account by design)
- Social engineering, or problems in third-party services (Groq, Google, OpenAI, Anthropic, Microsoft Edge voices)

## Supported versions

Only the latest release receives fixes.

## How the app protects you

- The interface runs sandboxed with context isolation and no Node access
- API keys are encrypted with the operating system keychain (Windows DPAPI, macOS Keychain) and never sent to the interface
- Every message between the interface and the app core is checked against a schema
- Only the microphone permission is granted; navigation and new windows are blocked
- Text read from the screen is treated as untrusted, and passwords, tokens and card numbers are removed before it leaves the computer

## Known trade-offs

- The Content Security Policy allows `unsafe-eval` because the offline wake-word engine (WebAssembly built with Emscripten) needs it. The app loads no remote scripts.
- The local database and saved screenshots are not encrypted. Use full-disk encryption if that matters to you.
- Hiding the window from screen sharing is a convenience, not a security boundary. Some capture tools can bypass it, particularly on newer macOS versions.
