# Releasing

Releases are built by GitHub Actions and published on the Releases page. People download the installer from there, or from a button on your website.

## Cutting a release

1. Update `version` in `package.json` and add notes to `CHANGELOG.md`.
2. Merge that through a pull request.
3. Tag and push:

   ```bash
   git checkout main && git pull
   git tag v0.2.0
   git push origin v0.2.0
   ```

4. The **Release** workflow builds the Windows installer and the macOS disk images and attaches them to a **draft** release.
5. Open the draft, check the files, edit the notes, and click **Publish**.

Installed copies check for updates every few hours and install the new version when the app is quit.

## Files you get

| File                        | For                        |
| --------------------------- | -------------------------- |
| `Buddy-Desk-Setup.exe`     | Windows 10 and 11 (64-bit) |
| `Buddy-Desk-mac-arm64.dmg` | Macs with Apple silicon    |
| `Buddy-Desk-mac-x64.dmg`   | Intel Macs                 |

The names are fixed on purpose, so these links always point at the newest release:

```
https://github.com/yehhmii/buddy-desk/releases/latest/download/Buddy-Desk-Setup.exe
https://github.com/yehhmii/buddy-desk/releases/latest/download/Buddy-Desk-mac-arm64.dmg
https://github.com/yehhmii/buddy-desk/releases/latest/download/Buddy-Desk-mac-x64.dmg
```

A ready-made download section for your website is in [website-download.html](website-download.html).

## Code signing (strongly recommended)

Without signing, the installers work, but people see warnings:

- **Windows SmartScreen** says "Windows protected your PC". Users can click _More info > Run anyway_.
- **macOS Gatekeeper** says the app "cannot be opened". Users can right-click the app and choose _Open_, or allow it in _System Settings > Privacy & Security_. **Automatic updates on macOS only work for signed and notarized apps.**

For non-technical users, signing makes a big difference.

**Windows:** buy a code-signing certificate (or use a service such as Azure Trusted Signing). Add the certificate file as a base64 secret `CSC_LINK` and its password as `CSC_KEY_PASSWORD` in the repository's Actions secrets.

**macOS:** join the Apple Developer Program, create a _Developer ID Application_ certificate, and add these secrets: `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. Then set `notarize: true` under `mac:` in `electron-builder.yml`.

The release workflow already passes all of these through when they exist.
