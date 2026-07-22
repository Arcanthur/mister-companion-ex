export const MISTER_FILE_KIND_REGISTRY = Object.freeze({
  ".rbf": "MiSTer Hardware Core",
  ".pfx": "Encrypted Hardware Core",
  ".mra": "Arcade ROM Definition",
  ".mgl": "MiSTer System Link",
  ".ini": "Configuration Settings",
  ".cfg": "Input Controller Map",
  ".uae": "Amiga Configuration Settings",
  ".txt": "Text Document",
  ".pal": "System Color Palette",
  ".sh": "Linux Shell Script",
  ".bnd": "Controller Key Binding",
  ".sav": "Battery Backup Save",
  ".sram": "Static RAM Save",
  ".flash": "Flash Memory Save",
  ".rtc": "Real-Time Clock Data",
  ".nv": "Non-Volatile RAM Save",
  ".nvram": "Non-Volatile RAM Save",
  ".vhd": "Virtual Hard Disk Image",
  ".hd": "Virtual Hard Disk Image",
  ".img": "Virtual Disk Image",
  ".hdi": "Virtual Hard Disk Image",
  ".hdf": "Hard Disk Image",
  ".dsk": "Virtual Floppy Disk",
  ".adf": "Virtual Floppy Disk",
  ".fdi": "Virtual Floppy Disk",
  ".ipf": "Virtual Floppy Disk",
  ".st": "Virtual Floppy Disk",
  ".tap": "Virtual Tape Cassette",
  ".t64": "Virtual Tape Cassette",
  ".tzx": "Virtual Tape Cassette",
  ".cas": "Virtual Tape Cassette",
  ".chd": "Compressed CD Image",
  ".cue": "Disc Cue Sheet",
  ".iso": "Optical ISO Image",
  ".ccd": "CloneCD Image Set",
  ".sub": "CloneCD Image Set",
  ".gdi": "GDI Media Image",
  ".raw": "Raw Disc Data",
  ".bin": "Binary Firmware Data",
  ".rom": "Binary Firmware Data",
  ".zip": "Compressed Archive",
  ".7z": "Compressed Archive",
  ".nes": "NES Game ROM",
  ".sfc": "SNES Game ROM",
  ".smc": "SNES Game ROM",
  ".gen": "Sega Game ROM",
  ".sms": "Sega Game ROM",
  ".gb": "Game Boy ROM",
  ".gbc": "Game Boy ROM",
  ".gba": "Game Boy ROM",
  ".v64": "Nintendo 64 Game ROM",
  ".z64": "Nintendo 64 Game ROM",
  ".n64": "Nintendo 64 Game ROM",
  ".pce": "PC Engine ROM",
  ".lnx": "Atari Lynx ROM",
  ".col": "ColecoVision ROM",
  ".cv": "ColecoVision ROM",
  ".pdf": "PDF Document",
  ".wav": "Waveform Audio",
  ".mp3": "MP3 Audio",
  ".flac": "FLAC Audio",
  ".ogg": "Ogg Vorbis Audio",
  ".opus": "Opus Audio",
  ".m4a": "MPEG-4 Audio",
  ".aac": "AAC Audio",
  ".wma": "Windows Media Audio",
  ".aif": "AIFF Audio",
  ".aiff": "AIFF Audio",
  ".au": "Sun Audio",
  ".mid": "MIDI Sequence",
  ".midi": "MIDI Sequence",
  ".mod": "Tracker Module",
  ".xm": "Tracker Module",
  ".s3m": "Tracker Module",
  ".it": "Tracker Module",
  ".log": "Log Document",
  ".asc": "Plain Text Document",
  ".csv": "CSV Document",
  ".tsv": "TSV Document",
  ".json": "JSON Document",
  ".xml": "XML Document",
  ".yaml": "YAML Document",
  ".yml": "YAML Document",
  ".toml": "TOML Configuration",
  ".conf": "Configuration Settings",
  ".config": "Configuration Settings",
  ".nfo": "Information Document",
  ".rtf": "Rich Text Document",
  ".rst": "reStructuredText Document",
  ".tex": "LaTeX Document",
  ".html": "HTML Document",
  ".htm": "HTML Document",
  ".odt": "OpenDocument Text",
  ".doc": "Microsoft Word Document",
  ".docx": "Microsoft Word Document",
});

const MARKDOWN_DOCUMENT_NAMES = /^(readme|changelog|changes|license|copying|contributing|authors?|credits?|security)(\.|$)/i;
const DOCUMENTATION_PATH = /(^|\/)(docs?|documentation|manuals?|help)(\/|$)/i;

function extensionOf(name = "") {
  const match = String(name).trim().toLocaleLowerCase().match(/(\.[^./\\]+)$/);
  return match?.[1] || "";
}

export function getFileKind(entry = {}) {
  if (entry.is_dir) return "folder";
  const name = String(entry.name || "");
  const path = String(entry.path || name).replaceAll("\\", "/");
  const extension = extensionOf(name);
  if (extension === ".md") {
    return MARKDOWN_DOCUMENT_NAMES.test(name) || DOCUMENTATION_PATH.test(path)
      ? "Markdown Document"
      : "Sega Game ROM";
  }
  return MISTER_FILE_KIND_REGISTRY[extension] || String(entry.type || "file").toLowerCase();
}
