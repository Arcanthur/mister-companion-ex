# MiSTer Companion EX

MiSTer Companion EX is an extended Electron desktop client for MiSTer FPGA. It builds on the original MiSTer Companion backend with a redesigned interface, expanded themes, file and SD-card tools, portable data paths, and a Hub-managed Install Center.

## Current status

- **EX version:** 0.4.53-alpha
- **Backend core:** MiSTer Companion 6.4.0
- **Platform:** Windows portable
- **Status:** Active alpha development. Real MiSTer and SD-card testing is recommended, especially before destructive storage operations.

Install Center content is provided by the [MiSTer Companion EX Hub](https://github.com/Arcanthur/mister-companion-EX-hub).

## Build

```bash
npm install
npm run build
npm run dist
```

Python backend dependencies are listed in `python-backend/requirements.txt`. The portable Windows build is written to `release/`.

## Acknowledgements

MiSTer Companion EX is based on [MiSTer Companion](https://github.com/Anime0t4ku/mister-companion), originally created by **Anime0t4ku**. Original backend work and community contributions remain credited to their respective authors.

Thanks to the MiSTer FPGA community and the developers of the projects supported through the Install Center.

## License

Licensed under the GNU General Public License v2. See [LICENSE](LICENSE).
