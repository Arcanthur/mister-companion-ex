/**
 * lddbXml.js
 * Auto-split from the original monolithic main.jsx.
 * Exports: parseLDDBXml
 */

/** Parses an exported LDDB XML collection file into an array of normalized disc records. */
export function parseLDDBXml(xmlText) {
  const parser = new DOMParser();
  const cleaned = xmlText
    .replace(/<\?xml[^?]*\?>/i, '<?xml version="1.0"?>')
    .replace(/&(?!(?:amp|lt|gt|apos|quot|#\d+|#x[\da-fA-F]+);)/g, "&amp;");
  const doc = parser.parseFromString(cleaned, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Invalid XML after sanitization");

  const items = [];
  doc.querySelectorAll("Collection").forEach((node) => {
    const get = (tag) => node.querySelector(tag)?.textContent.trim() || "";
    const rawTitle = get("Title");
    if (!rawTitle) return;

    const yearMatch = rawTitle.match(/\((\d{4})\)\s*$/);
    const year = yearMatch ? yearMatch[1] : get("Release").slice(0, 4);
    let title = rawTitle.replace(/\s*\(\d{4}\)\s*$/, "").trim();
    title = title.replace(/^(.+),\s+(The|A|An|Les|Le|La|Der|Die|Das|Los|Las|El)$/i, "$2 $1");

    const specs = get("Specs");
    items.push({
      rawTitle,
      title,
      year,
      id: get("ID"),
      reference: get("Reference"),
      release: get("Release"),
      video: get("Video"),
      specs,
      specParts: specs.split("/").map((s) => s.trim()).filter(Boolean),
      country: get("Country"),
      upc: get("UPC"),
      condition: get("Condition"),
      notes: get("Notes"),
      tmdb: null,
      fetching: false,
      fetchError: null,
    });
  });
  return items;
}
