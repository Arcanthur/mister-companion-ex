# MiSTer Companion EX Package Manifest

MiSTer Companion EX can create Install Center cards from GitHub repositories that include a package manifest.

Supported manifest locations in a repo:

- `mister-companion-package.json`
- `mister-companion-package.json.zip`
- `.mister-companion/package.json`
- `.mister/package.json`
- `mister-package.json`
- `package.mister.json`
- `install_center.json`
- `install.json`

Legacy custom-package manifests remain supported by the backend for existing saved entries, but new Install Center entries are now managed through the Companion EX Hub rather than an in-app Add Package dialog.

## Example

```json
{
  "schemaVersion": 1,
  "id": "example-scripts",
  "name": "Example Scripts",
  "author": "Example Author",
  "description": "Installs a helper script for MiSTer.",
  "version": "1.0.0",
  "category": "github",
  "installPath": "/Scripts/example",
  "files": [
    {
      "source": "Scripts/example.sh",
      "target": "/Scripts/example.sh",
      "executable": true
    },
    {
      "source": "config",
      "target": "/Scripts/example/config",
      "recursive": true
    }
  ],
  "postInstall": {
    "message": "Example Scripts installed. Run example.sh from the Scripts menu."
  },
  "uninstall": {
    "remove": [
      "/Scripts/example"
    ]
  }
}
```

## Fields

- `id`: stable package ID. Used for install status and uninstall tracking.
- `name`: card title.
- `author`: card author.
- `description`: card description.
- `version`: version shown in the card and used for update comparison.
- `category`: catalog category. Use `github` for the user-added GitHub category.
- `installPath`: default install path.
- `files`: files or folders to copy.
- `postInstall.message`: message printed after install.
- `uninstall.remove`: additional files or folders to remove during uninstall.

## File entries

A file entry can use a repo-relative path:

```json
{ "source": "Scripts/tool.sh", "target": "/Scripts/tool.sh", "executable": true }
```

A folder can be copied recursively:

```json
{ "source": "assets", "target": "/Scripts/tool/assets", "recursive": true }
```

A direct URL can be used as a source:

```json
{ "source": "https://raw.githubusercontent.com/owner/repo/main/tool.sh", "target": "/Scripts/tool.sh" }
```

A ZIP can be extracted:

```json
{ "source": "https://github.com/owner/repo/releases/download/v1/package.zip", "target": "/Scripts/tool", "extract": true }
```
