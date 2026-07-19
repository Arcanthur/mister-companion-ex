# Windows code signing

The tagged release workflow supports unsigned prereleases until code signing is enabled for the 1.0 release. When both signing credentials are configured, it signs the portable Windows executable with Authenticode and refuses to publish if the signature is invalid or not timestamped.

## Certificate requirements

Use a currently valid Microsoft Authenticode code-signing certificate from a trusted certificate authority. For CI, export an OV certificate and its private key as a password-protected `.pfx` or `.p12` file. EV certificates tied to a physical token generally cannot be exported for this workflow; use a CI-compatible certificate or a managed signing service instead.

Never add the certificate or its password to this repository. Common certificate and private-key extensions are ignored by `.gitignore` as an additional safeguard.

## Configure GitHub Actions

Open the repository on GitHub and go to **Settings → Secrets and variables → Actions**. Add these repository secrets:

- `WIN_CSC_LINK`: the base64-encoded contents of the `.pfx`/`.p12` certificate, or another certificate location supported by electron-builder.
- `WIN_CSC_KEY_PASSWORD`: the password protecting the certificate.

To encode a certificate from PowerShell without modifying it:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\certificate.pfx")) | Set-Clipboard
```

Paste the clipboard contents into `WIN_CSC_LINK`. If the encoded certificate exceeds the Windows environment-variable limit, export the certificate again without intermediate certificates in the bundle or use a secure HTTPS certificate URL supported by electron-builder.

## Release behavior

Local `npm run dist` builds remain unsigned for development. Tagged releases select their mode automatically:

- For a pre-1.0 tag, if neither signing secret exists, the workflow builds and publishes an unsigned executable and displays a warning in the job log.
- If both secrets exist, the workflow uses `npm run dist:signed`, which enables electron-builder's `forceCodeSigning` option.
- If only one secret exists, the workflow stops so a partially configured signing setup cannot silently produce an unsigned release.
- For version 1.0.0 and later, the workflow stops unless both signing secrets exist.

For a signed build, the workflow independently checks every release executable with `Get-AuthenticodeSignature` and requires:

- signature status `Valid`;
- a signer certificate;
- a trusted timestamp certificate.

Only after those checks pass does the workflow create checksums and publish the GitHub Release.

You can inspect a locally signed file with:

```powershell
Get-AuthenticodeSignature .\release\MiSTer-Companion-EX-*-Windows.exe |
  Format-List Status, StatusMessage, SignerCertificate, TimeStamperCertificate
```
