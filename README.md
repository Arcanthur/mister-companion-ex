# MiSTer Companion EX

MiSTer Companion EX is an extended Electron desktop client for MiSTer FPGA. It builds on the original MiSTer Companion backend with a redesigned interface, expanded themes, file and SD-card tools, portable data paths, and a Hub-managed Install Center.

## Current status

- **EX version:** 0.4.53-alpha.0
- **Backend core:** MiSTer Companion 6.4.0
- **Platform:** Windows portable
- **Status:** Active alpha development. Real MiSTer and SD-card testing is recommended, especially before destructive storage operations.

Install Center content is provided by the [MiSTer Companion EX Hub](https://github.com/Arcanthur/mister-companion-EX-hub).

## Build

MiSTer Companion EX currently requires 64-bit Python 3.12 and the locked backend dependencies. The portable Electron executable does not yet bundle a Python runtime.

```powershell
npm ci
py -3.12 -m venv .venv
.\.venv\Scripts\python -m pip install --require-hashes -r python-backend\requirements.txt
npm run build
npm run dist
```

The portable Windows build is written to `release/`. Direct Python dependencies are maintained in `python-backend/requirements.in`; `python-backend/requirements.txt` locks the complete tested dependency graph and verifies downloaded packages with hashes.

Node dependencies are locked to the public npm registry. Run `npm run check:lockfile` before committing dependency changes; CI rejects lockfiles containing private or environment-specific package mirrors.

## Releases

Releases use [Semantic Versioning](https://semver.org/) and tags prefixed with `v`. Prereleases use identifiers such as `v0.4.53-alpha.0`; stable releases use tags such as `v1.0.0`.

Before publishing, update `version` in `package.json` (which also updates the application version), run `npm install --package-lock-only` to synchronize the lockfile, and verify the release tag locally:

```powershell
npm run release:verify -- v0.4.53-alpha.0
```

Commit and push the version change before pushing the matching tag. A matching `v*.*.*` tag runs the full validation suite, builds the Windows portable executable, produces `SHA256SUMS.txt`, and creates a GitHub Release with generated notes. Tags containing a SemVer prerelease suffix are marked as GitHub prereleases automatically.

Pre-1.0 Windows releases are built unsigned when signing credentials are absent. Version 1.0.0 and later require both signing secrets and a valid, timestamped Authenticode signature before publishing. See [Windows code signing setup](docs/WINDOWS_CODE_SIGNING.md).

After intentionally changing `requirements.in`, regenerate the Windows/Python 3.12 lock with [uv](https://docs.astral.sh/uv/):

```powershell
uv pip compile python-backend/requirements.in --output-file python-backend/requirements.txt --python 3.12 --python-platform x86_64-pc-windows-msvc --generate-hashes
```

## Acknowledgements

MiSTer Companion EX is based on [MiSTer Companion](https://github.com/Anime0t4ku/mister-companion), originally created by **Anime0t4ku**. Original backend work and community contributions remain credited to their respective authors.

Thanks to the MiSTer FPGA community and the developers of the projects supported through the Install Center.

## License

Licensed under the GNU General Public License v2. See [LICENSE](LICENSE).
