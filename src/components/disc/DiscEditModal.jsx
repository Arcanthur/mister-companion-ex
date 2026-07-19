/**
 * DiscEditModal.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: DiscEditModal
 */

import React, { useState, useRef } from "react";
import { fileToDataUrl, splitCsv } from "../../utils/discUtils";
import { SettingsSectionHeading } from "../common/FormFields";
import { CustomSelect } from "../common/CustomSelect";
import { ThemedScrollbar } from "../common/ThemedScrollbar";
import { getHostBridge } from "../../framework/host/hostBridge";

export function DiscEditModal({ disc, apiKey, collections, mediaLibraries, onClose, onSave, onScrapeTmdb, onSearchTmdb }) {
  const [form, setForm] = useState(() => ({
    title: disc.title || "",
    sortTitle: disc.sortTitle || "",
    year: disc.year || "",
    reference: disc.reference || "",
    release: disc.release || "",
    video: disc.video || "",
    country: disc.country || "",
    upc: disc.upc || "",
    condition: disc.condition || "",
    notes: disc.notes || "",
    trailerUrl: disc.trailerUrl || "",
    specs: disc.specs || "",
    genres: disc.tmdb?.genres?.join(", ") || "",
    directors: disc.tmdb?.directors?.join(", ") || "",
    studios: disc.tmdb?.studios?.join(", ") || "",
    overview: disc.tmdb?.overview || "",
    rating: disc.tmdb?.tmdbRating || "",
    usRating: disc.tmdb?.usRating || "",
    libraryId: disc.libraryId || "laserdisc",
    mediaFormat: disc.mediaFormat || (disc.libraryId === "wishlist" ? "any" : disc.libraryId || "laserdisc"),
    favorite: Boolean(disc.favorite),
    collectionIds: disc.collectionIds || [],
  }));
  const [cover, setCover] = useState(null);
  const [coverName, setCoverName] = useState("");
  const [localTrailer, setLocalTrailer] = useState(() => disc.localTrailerFile ? {
    fileName: disc.localTrailerFile,
    originalName: disc.localTrailerName || disc.localTrailerFile,
  } : null);
  const [scrapedTmdb, setScrapedTmdb] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const editScrollRef = useRef(null);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const useFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setCover(await fileToDataUrl(file));
    setCoverName(file.name);
  };
  const drop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await useFile(event.dataTransfer.files?.[0]);
  };
  const save = () => {
    const tmdb = {
      ...(disc.tmdb || {}),
      ...(scrapedTmdb || {}),
      genres: splitCsv(form.genres),
      directors: splitCsv(form.directors),
      studios: splitCsv(form.studios),
      overview: form.overview.trim(),
      tmdbRating: form.rating.trim(),
      usRating: form.usRating.trim(),
    };
    onSave(disc, {
      title: form.title.trim() || disc.title,
      sortTitle: form.sortTitle.trim(),
      year: form.year.trim(),
      reference: form.reference.trim(),
      release: form.release.trim(),
      video: form.video.trim(),
      country: form.country.trim(),
      upc: form.upc.trim(),
      condition: form.condition.trim(),
      notes: form.notes.trim(),
      trailerUrl: form.trailerUrl.trim(),
      localTrailerFile: localTrailer?.fileName || "",
      localTrailerName: localTrailer?.originalName || "",
      specs: form.specs.trim(),
      libraryId: form.libraryId,
      mediaFormat: form.mediaFormat,
      favorite: form.favorite,
      specParts: form.specs.split("/").map((item) => item.trim()).filter(Boolean),
      collectionIds: form.collectionIds,
      tmdb,
      lddbCover: cover || disc.lddbCover,
      lddbCoverFile: cover ? coverName : disc.lddbCoverFile,
      lddbCoverSourceType: cover ? "local" : disc.lddbCoverSourceType,
    });
    if (disc.localTrailerFile && disc.localTrailerFile !== localTrailer?.fileName) {
      getHostBridge()?.removeLocalTrailer?.(disc.localTrailerFile).catch(() => {});
    }
  };
  const searchLddbUpc = () => {
    const query = form.upc.trim() || disc.upc || disc.reference || disc.title;
    if (!query) return;
    const url = "https://www.lddb.com/search.php?search=" + encodeURIComponent(query);
    if (getHostBridge()?.openSearchWindow) getHostBridge().openSearchWindow(url);
    else window.open(url, "_blank", "noopener,noreferrer");
  };

  const scrape = async () => {
    if (!apiKey || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await onScrapeTmdb({ ...disc, title: form.title, year: form.year });
      setScrapedTmdb(result);
      setForm((prev) => ({
        ...prev,
        title: result.tmdbTitle || prev.title,
        year: result.year || prev.year,
        genres: result.genres?.join(", ") || "",
        directors: result.directors?.join(", ") || "",
        studios: result.studios?.join(", ") || "",
        overview: result.overview || "",
        rating: result.tmdbRating || "",
        usRating: result.usRating || "",
      }));
    } catch (e) {
      setError(e.message || "Could not fetch TMDB metadata.");
    } finally {
      setBusy(false);
    }
  };

  const chooseLocalTrailer = async () => {
    if (!getHostBridge()?.chooseLocalTrailer || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await getHostBridge().chooseLocalTrailer({
        itemKey: disc.id || disc.reference || disc.title,
        previousFile: localTrailer?.fileName || "",
      });
      if (result?.fileName) setLocalTrailer(result);
    } catch (e) {
      setError(e.message || "Could not add the local trailer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop edit-modal-backdrop">
      <div className="modal edit-modal settings-style-edit-modal">
        <header className="settings-page-header edit-page-header">
          <div className="edit-page-heading">
            <h2>{disc.__isNewEntry ? "Add item" : "Edit item"}</h2>
            <span>{disc.__isNewEntry ? `New ${mediaLibraries.find((library) => library.id === form.libraryId)?.name || "media"} entry` : disc.title}</span>
          </div>
          <button type="button" className="settings-close-button" aria-label="Close edit window" title="Close edit window" onClick={onClose}>
            <span className="window-control-glyph window-close-glyph" aria-hidden="true" />
          </button>
        </header>
        <section className="edit-content">
          <div ref={editScrollRef} className="edit-scroll-area">
            <div className="edit-layout">
              <main className="edit-primary">
                <section className="edit-panel">
                  <SettingsSectionHeading title="Metadata" description="Edit identifying information, technical details, and imported movie metadata." />
                  <div className="edit-fields edit-preference-group">
                    <label className="edit-field"><span>Media library</span><CustomSelect value={form.libraryId} onChange={(value) => {
                      setField("libraryId", value);
                      if (value !== "wishlist") setField("mediaFormat", value);
                    }} ariaLabel="Media library" options={mediaLibraries.map((library) => ({ value: library.id, label: library.name }))} /></label>
                    <label className="edit-field edit-favorite-field"><span>Favorite</span><input type="checkbox" checked={form.favorite} onChange={(event) => setField("favorite", event.target.checked)} /></label>
                    {mediaLibraries.find((library) => library.id === form.libraryId)?.kind === "wishlist" && (
                      <label className="edit-field"><span>Wishlist format</span><CustomSelect value={form.mediaFormat} onChange={(value) => setField("mediaFormat", value)} ariaLabel="Wishlist format" options={[
                        { value: "any", label: "Any format" },
                        ...mediaLibraries.filter((library) => library.kind === "physical").map((library) => ({ value: library.id, label: library.name })),
                      ]} /></label>
                    )}
                    {[["Title", "title"], ["Sort Title", "sortTitle"], ["Year", "year"], ["Catalog", "reference"], ["Released", "release"], ["Video", "video"], ["Country", "country"], ["UPC", "upc"], ["Condition", "condition"], ["Specs", "specs"], ["Genres", "genres"], ["Directors", "directors"], ["Studios", "studios"], ["Rating", "rating"], ["US Movie Rating", "usRating"]].map(([label, key]) => (
                      <label className="edit-field" key={key}><span>{label}</span><input value={form[key]} onChange={(e) => setField(key, e.target.value)} /></label>
                    ))}
                  </div>
                </section>
                <section className="edit-panel">
                  <SettingsSectionHeading title="Description and trailer" description="Add descriptive notes and choose an online trailer source for this item." />
                  <div className="edit-fields edit-preference-group edit-long-fields">
                    <label className="edit-field edit-wide"><span>Trailer URL</span><input value={form.trailerUrl} placeholder="Vimeo, YouTube, Dailymotion, or direct video URL" onChange={(e) => setField("trailerUrl", e.target.value)} /></label>
                    <label className="edit-field edit-wide"><span>Overview</span><textarea value={form.overview} onChange={(e) => setField("overview", e.target.value)} /></label>
                    <label className="edit-field edit-wide"><span>Notes</span><textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} /></label>
                  </div>
                </section>
                {collections.length > 0 && (
                  <section className="edit-panel">
                    <SettingsSectionHeading title="Collections" description="Choose the custom shelves that include this disc." />
                    <fieldset className="edit-collections">
                      <legend className="sr-only">Collections</legend>
                      <div className="edit-collection-options">
                        {collections.map((collection) => (
                          <label key={collection.id}>
                            <input type="checkbox" checked={form.collectionIds.includes(collection.id)} onChange={(event) => {
                              setField("collectionIds", event.target.checked
                                ? [...form.collectionIds, collection.id]
                                : form.collectionIds.filter((id) => id !== collection.id));
                            }} />
                            <span>{collection.name}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </section>
                )}
              </main>
              <aside className="edit-secondary">
                <section className="edit-panel edit-artwork-panel">
                  <SettingsSectionHeading title="Artwork" description="Drop a local image here or click the preview to choose a file." />
                  <div className="cover-drop" onDragOver={(e) => e.preventDefault()} onDrop={drop} onClick={() => fileRef.current?.click()}>
                    {cover ? <img src={cover} alt="Selected cover" /> : <span>Drag cover art here or click to choose</span>}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => useFile(e.target.files?.[0])} />
                </section>
                <section className="edit-panel">
                  <SettingsSectionHeading title="Lookup and media" description="Search external metadata sources or attach a local trailer." />
                  <div className="edit-tool-group">
                    <button className="secondary-button" onClick={searchLddbUpc}>Search LDDB by UPC</button>
                    <button className="secondary-button" disabled={!apiKey || busy} onClick={scrape}>{busy ? "Fetching..." : "Scrape TMDB"}</button>
                    <button className="secondary-button" disabled={!apiKey} onClick={() => onSearchTmdb(disc)}>Search TMDB</button>
                    <button className="secondary-button" disabled={busy} onClick={chooseLocalTrailer}>Add local trailer</button>
                  </div>
                  {localTrailer && (
                    <div className="local-trailer-selection">
                      <span title={localTrailer.originalName}>{localTrailer.originalName}</span>
                      <button type="button" className="quiet-button danger-action" onClick={() => setLocalTrailer(null)}>Remove</button>
                    </div>
                  )}
                  {error && <div className="error-box modal-error">{error}</div>}
                </section>
              </aside>
            </div>
          </div>
          <ThemedScrollbar scrollRef={editScrollRef} className="edit-themed-scrollbar" />
        </section>
        <footer className="edit-action-footer">
          <button className="secondary-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={!form.title.trim()} onClick={save}>{disc.__isNewEntry ? "Add to library" : "Save changes"}</button>
        </footer>
      </div>
    </div>
  );
}
