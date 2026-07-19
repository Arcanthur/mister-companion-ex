/**
 * SettingsModal.jsx
 * Auto-split from the original monolithic main.jsx.
 * Exports: SettingsModal
 */

import React, { useState, useEffect, useRef } from "react";
import { DEFAULT_SIDEBAR_GLYPHS, FALLBACK_ABOUT_INFO } from "../../constants/libraryDefaults";
import { THEME_PRESETS, applyStyleSelection, hydrateTheme, parseThemeColor, themeIdentitySignature, themeToggleEnabled } from "../../theme/themeUtils";
import { DEFAULT_THEME } from "../../theme/themePresets";
import { APP_STYLE_OPTIONS, FONT_OPTIONS, FONT_ROLE_FIELDS, FONT_SIZE_ROLE_FIELDS, WINDOW_CONTROL_STYLE_OPTIONS } from "../../theme/themeOptions";
import { ColorField, RangeField, SettingsSectionHeading, ToggleField } from "../common/FormFields";
import { CustomSelect } from "../common/CustomSelect";
import { GlowSettingsGroup, ShadowSettingsGroup } from "./ShadowGlowGroups";
import { SidebarGlyphArtwork } from "../sidebar/SidebarGlyph";
import { LibraryNameField } from "../library/LibraryNameField";
import { LibraryInformation } from "../library/LibraryInformation";
import { LibraryHealthContent } from "../library/LibraryHealthContent";
import { ThemedScrollbar } from "../common/ThemedScrollbar";
import { WindowTitlebar } from "../common/WindowTitlebar";
import { ThemeNameModal } from "../theme/ThemeNameModal";
import { getHostBridge } from "../../framework/host/hostBridge";


function SettingsAccordionPanel({ expanded, children }) {
  const inertProps = expanded ? {} : { inert: "" };
  return (
    <div
      className={expanded ? "settings-accordion-panel expanded" : "settings-accordion-panel collapsed"}
      data-expanded={expanded ? "true" : "false"}
      aria-hidden={!expanded}
      {...inertProps}
    >
      <div className="settings-accordion-panel-clip">
        {children}
      </div>
    </div>
  );
}

export function SettingsModal({ theme, savedThemes, sidebarGlyphs, defaultSidebarGlyphs = DEFAULT_SIDEBAR_GLYPHS, mediaLibraries, onMediaLibrariesChange, onCreateLibrary, onSidebarGlyphsChange, apiKey, archiveBusy, hasLibrary, libraryInfo, listRoomy, onListRoomyChange, healthItems = [], metadataBusy, metadataProgress, onHealthEdit, onHealthRemove, onFetchMissingMetadata, onRefreshAllMetadata, lddbFinding, lddbProgress, lddbDelay, onLddbDelayChange, onOpenLddbSession, onOpenYoutubeLogin, onFindLddbCovers, onStopLddbCovers, onClearLddbCovers, onOpenCoverQueue, onApiKeyChange, onImportZip, onExportZip, onExportLddbLinks, onLoadXml, onResetLibrary, onChange, onOpenThemePreview, onUpdateThemePreview, onSaveCurrent, onOpenThemesFolder, onReloadThemes, onReset, onClose, appName = "LaserVault", appSubtitle = "Settings", appContext = "laservault", aboutLogoUrl = "", themePreviewEnabled = true, initialSection = "appearance", backendPanel = null, apiPanel = null, flashToolsPanel = null }) {
  const [transparencyExpanded, setTransparencyExpanded] = useState(false);
  const [gradientsExpanded, setGradientsExpanded] = useState(false);
  const [materialsExpanded, setMaterialsExpanded] = useState(false);
  const [bordersExpanded, setBordersExpanded] = useState(false);
  const [shadowsExpanded, setShadowsExpanded] = useState(false);
  const [shapeExpanded, setShapeExpanded] = useState(false);
  const [motionExpanded, setMotionExpanded] = useState(false);
  const [glowExpanded, setGlowExpanded] = useState(false);
  const [bevelsExpanded, setBevelsExpanded] = useState(false);
  const [themeNameOpen, setThemeNameOpen] = useState(false);
  const [themePreviewOpen, setThemePreviewOpen] = useState(false);
  const [settingsBackdropBlurDisabled, setSettingsBackdropBlurDisabled] = useState(() => {
    try { return localStorage.getItem("misterDevDisableSettingsBackdropBlur") === "true"; } catch { return false; }
  });
  const [settingsSection, setSettingsSection] = useState(initialSection || "appearance");
  const [fontError, setFontError] = useState("");
  const [fontLibrary, setFontLibrary] = useState([]);
  const [glyphError, setGlyphError] = useState("");
  const [aboutInfo, setAboutInfo] = useState(FALLBACK_ABOUT_INFO);
  const settingsScrollRef = useRef(null);
  useEffect(() => {
    setSettingsSection(initialSection || "appearance");
  }, [initialSection]);
  useEffect(() => {
    settingsScrollRef.current?.scrollTo({ top: 0 });
  }, [settingsSection]);
  useEffect(() => {
    if (settingsSection !== "about" || !getHostBridge()?.getAboutInfo) return;
    let active = true;
    Promise.resolve(getHostBridge().getAboutInfo())
      .then((info) => {
        if (active && info) setAboutInfo({ ...FALLBACK_ABOUT_INFO, ...info });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [settingsSection]);
  const reloadFontLibrary = () => {
    setFontError("");
    try {
      const fonts = getHostBridge()?.loadFonts?.() || [];
      setFontLibrary(Array.isArray(fonts) ? fonts : []);
      window.dispatchEvent(new Event("vaultkit-font-library-changed"));
    } catch (error) {
      setFontError(error.message || "Could not scan the Fonts folder.");
    }
  };
  useEffect(() => {
    if (settingsSection === "fonts") reloadFontLibrary();
  }, [settingsSection]);

  useEffect(() => {
    if (themePreviewEnabled && themePreviewOpen) onUpdateThemePreview(theme);
  }, [theme, themePreviewOpen, onUpdateThemePreview]);
  const setSettingsBackdropBlur = (disabled) => {
    setSettingsBackdropBlurDisabled(disabled);
    try { localStorage.setItem("misterDevDisableSettingsBackdropBlur", String(disabled)); } catch {}
  };
  const setColor = (key, value) => {
    onChange({
      ...theme,
      [key]: key === "mediaSidebarBackgroundColor" ? parseThemeColor(value).hex : value,
    });
  };
  const options = [
    ...THEME_PRESETS.filter(Boolean).map((preset, index) => ({ id: "preset:" + index, name: preset.name, theme: preset.theme })),
    ...savedThemes.map((saved, index) => ({ id: "saved:" + index, name: saved.name, theme: saved.theme })),
  ];
  const currentThemeSignature = themeIdentitySignature(theme);
  const selectedThemeId = options.find((option) => themeIdentitySignature(option.theme) === currentThemeSignature)?.id || "custom";
  const applyTheme = (value) => {
    const selected = options.find((option) => option.id === value);
    if (selected) onChange({
      ...hydrateTheme(selected.theme),
      coverSource: theme.coverSource || DEFAULT_THEME.coverSource,
    });
  };
  const applyAppStyle = (value) => {
    onChange(applyStyleSelection(theme, value));
  };
  const showThemePreview = () => {
    setThemePreviewOpen(true);
    onOpenThemePreview(theme);
  };
  const openFontsFolder = async () => {
    setFontError("");
    try { await getHostBridge()?.openFontsFolder?.(); } catch (error) { setFontError(error.message || "Could not open the Fonts folder."); }
  };
  const openAssetsFolder = async () => {
    try { await getHostBridge()?.openAssetsFolder?.(); } catch (error) { setFontError(error.message || "Could not open the Assets folder."); }
  };
  const reloadThemeAssets = async () => {
    try { await getHostBridge()?.reloadThemeAssets?.(); } catch (error) { setFontError(error.message || "Could not reload theme assets."); }
  };
  const baseSidebarGlyphTargets = mediaLibraries.map((library) => ({
    id: `library:${library.id}`,
    label: library.name,
    fallback: library.glyph,
  }));
  const sidebarGlyphTargets = appContext === "mister"
    ? baseSidebarGlyphTargets
    : [
      ...baseSidebarGlyphTargets,
      { id: "category:all", label: "All Titles", fallback: "ALL" },
      { id: "category:favorites", label: "Favorites", fallback: "FAV" },
      { id: "category:recent", label: "Recently Added", fallback: "NEW" },
      { id: "category:top", label: "Top Rated", fallback: "TOP" },
    ];
  const chooseSidebarGlyph = async (targetId, file) => {
    if (!file) return;
    setGlyphError("");
    const isSupported = file.type === "image/png"
      || file.type === "image/svg+xml"
      || /\.(png|svg)$/i.test(file.name);
    if (!isSupported) {
      setGlyphError("Choose a PNG or SVG file.");
      return;
    }
    if (file.size > 512 * 1024) {
      setGlyphError("Glyph files must be 512 KB or smaller.");
      return;
    }
    try {
      const url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      onSidebarGlyphsChange({ ...sidebarGlyphs, [targetId]: url });
    } catch (error) {
      setGlyphError(error?.message || "Could not import that glyph.");
    }
  };
  const clearSidebarGlyph = (targetId) => {
    const nextGlyphs = { ...sidebarGlyphs };
    delete nextGlyphs[targetId];
    onSidebarGlyphsChange(nextGlyphs);
  };
  const updateMediaLibrary = (libraryId, changes) => {
    onMediaLibrariesChange((previous) => previous.map((library) => library.id === libraryId ? { ...library, ...changes } : library));
  };
  const moveMediaLibrary = (libraryId, direction) => {
    onMediaLibrariesChange((previous) => {
      const index = previous.findIndex((library) => library.id === libraryId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };
  const currentAppStyle = String(theme.appStyle || "classic").toLowerCase();
  const isMisterApp = appContext === "mister";
  const isWindows9XStyle = currentAppStyle === "windows9x";
  const isMacOS9PlatinumStyle = currentAppStyle === "macos9platinum";
  const isSpecialEraStyle = isWindows9XStyle || isMacOS9PlatinumStyle;
  const specialThemeName = isWindows9XStyle ? "Windows 9X" : isMacOS9PlatinumStyle ? "Mac OS 9 Platinum" : "Special Theme";
  const platinumFontRoleKeys = new Set(["titlebarFont", "headerFont", "filterFont", "cardFont", "cardTitleFont", "metadataFont", "controlFont", "badgeFont", "windowFont", "settingsFont", "footerFont", "sidebarFont"]);
  const effectiveFontRoleFields = isMacOS9PlatinumStyle ? FONT_ROLE_FIELDS.filter(([key]) => platinumFontRoleKeys.has(key)) : FONT_ROLE_FIELDS;
  const effectiveFontSizeRoleFields = isMacOS9PlatinumStyle ? FONT_SIZE_ROLE_FIELDS.filter(([key]) => platinumFontRoleKeys.has(key.replace(/Size$/, ""))) : FONT_SIZE_ROLE_FIELDS;

  const installedFontOptions = FONT_OPTIONS.map(([fontValue, label]) => ({ value: fontValue, label }));
  const knownFontFamilies = new Set(installedFontOptions.map((option) => option.value));
  for (const font of fontLibrary) {
    if (!font?.family || knownFontFamilies.has(font.family)) continue;
    installedFontOptions.push({ value: font.family, label: `${font.name || font.fileName || "Custom font"} (Fonts folder)` });
    knownFontFamilies.add(font.family);
  }
  if (theme.customFontFamily && !knownFontFamilies.has(theme.customFontFamily)) installedFontOptions.push({
    value: theme.customFontFamily,
    label: `${theme.customFontName || "Legacy custom font"} (Legacy theme)`,
  });
  const inheritedFontOptions = [{ value: "inherit", label: "Use interface default" }, ...installedFontOptions];
  const groups = [
    ["App", [["appBackground", "Background"], ["panelBackground", "Panels and cards"], ["modalBackground", "Modals and windows"], ["posterBackground", "Poster empty space"], ["borderColor", "Borders"], ["editHighlightColor", "Edit outline"], ["highlightColor", "Highlights"], ["dangerColor", "Errors"]]],
    ["App Window", [["appWindowBorderColor", "Focused border"], ["appWindowUnfocusedBorderColor", "Unfocused border"], ["appWindowShadowColor", "Focused shadow"], ["appWindowUnfocusedShadowColor", "Unfocused shadow"]]],
    ["Bars", [["headerBackgroundColor", "Header background"], ["headerGradientStartColor", "Header gradient start"], ["headerGradientEndColor", "Header gradient end"], ["headerDividerColor", "Header divider"], ["filterBackgroundColor", "Toolbar background"], ["toolbarDividerColor", "Toolbar divider"], ["footerBackgroundColor", "Footer background"], ["footerDividerColor", "Footer divider"]]],
    ["Cards and Panels", [["cardBorderColor", "Card border"], ["cardHoverBorderColor", "Install hover border"], ["cardHoverBackgroundColor", "Install hover background"]]],
    ["Text", [["textColor", "Main text"], ["mutedTextColor", "Muted text"], ["faintTextColor", "Faint text"]]],
    ["Settings Headers", [["settingsSidebarHeaderColor", "Sidebar title"], ["settingsPageHeaderColor", "Page headers"], ["settingsSectionHeaderColor", "Section headers"], ["settingsSubheaderColor", "Section descriptions"]]],
    ["Footer Disc Count", [["footerCountBackgroundColor", "Background"], ["footerCountBorderColor", "Border"], ["footerCountTextColor", "Text"]]],
    ["Settings Sidebar", [["settingsSidebarBackgroundColor", "Background"], ["settingsSidebarTextColor", "Normal"], ["settingsSidebarActiveColor", "Active item"], ["settingsSidebarActiveTextColor", "Active text"], ["settingsSidebarPressedColor", "Pressed item"], ["settingsSidebarPressedTextColor", "Pressed text"]]],
    ["Main Sidebar", [["mediaSidebarBackgroundColor", "Background"], ["mediaSidebarBorderColor", "Right separator"], ["mediaSidebarDividerColor", "Group dividers"], ["mediaSidebarTextColor", "Main text"], ["mediaSidebarMutedTextColor", "Muted text"], ["mediaSidebarSectionTextColor", "Group labels"], ["mediaSidebarCountTextColor", "Badge text"], ["mediaSidebarButtonBackgroundColor", "Button background"], ["mediaSidebarButtonHoverBackgroundColor", "Button hover background"], ["mediaSidebarButtonActiveBackgroundColor", "Button active background"], ["mediaSidebarButtonBorderColor", "Button border"], ["mediaSidebarButtonHoverBorderColor", "Button hover border"], ["mediaSidebarButtonActiveBorderColor", "Button active border"], ["mediaSidebarButtonTextColor", "Button text"], ["mediaSidebarButtonHoverTextColor", "Button hover text"], ["mediaSidebarButtonActiveTextColor", "Button active text"], ["mediaSidebarGlyphColor", "Glyphs"], ["mediaSidebarGlyphHoverColor", "Glyph hover"], ["mediaSidebarGlyphActiveColor", "Glyph active"]]],
    ["Sidebar Highlight", [["mediaSidebarGradientColor", "Highlight color"]]],
    ["Sidebar Shadow", [["mediaSidebarShadowColor", "Depth shadow"]]],
    ["Sidebar Button", [["sidebarToggleBackgroundColor", "Background"], ["sidebarToggleHoverBackgroundColor", "Hover background"], ["sidebarToggleBorderColor", "Border"], ["sidebarToggleHoverBorderColor", "Hover border"], ["sidebarToggleGlyphColor", "Glyph"], ["sidebarToggleHoverGlyphColor", "Hover glyph"]]],
    ["Button Backgrounds", [["buttonBackgroundColor", "Normal"], ["buttonHoverBackgroundColor", "Hover"], ["buttonPressedColor", "Pressed"], ["buttonSelectedBackgroundColor", "Selected"], ["buttonDisabledBackgroundColor", "Disabled"]]],
    ["Button Borders", [["buttonBorderColor", "Normal"], ["buttonHoverBorderColor", "Hover"], ["buttonPressedBorderColor", "Pressed"], ["buttonSelectedBorderColor", "Selected"], ["buttonDisabledBorderColor", "Disabled"]]],
    ["Button Text", [["buttonTextColor", "Normal"], ["buttonHoverTextColor", "Hover"], ["buttonPressedTextColor", "Pressed"], ["buttonSelectedTextColor", "Selected"], ["buttonDisabledTextColor", "Disabled"]]],
    ["Glyphs", [["glyphColor", "Normal"], ["glyphHoverColor", "Hover"], ["glyphPressedColor", "Pressed"], ["glyphSelectedColor", "Selected"], ["glyphDisabledColor", "Disabled"]]],
    ["Search Glyph", [["searchGlyphColor", "Normal"], ["searchGlyphHoverColor", "Hover"], ["searchGlyphFocusColor", "Focused"]]],
    ["Dropdown Menus", [["dropdownMenuBackgroundColor", "Menu background"], ["dropdownMenuBorderColor", "Menu border"], ["dropdownItemBackgroundColor", "Item background"], ["dropdownItemTextColor", "Item text"], ["dropdownItemBorderColor", "Item border"], ["dropdownItemHoverBackgroundColor", "Hover background"], ["dropdownItemHoverTextColor", "Hover text"], ["dropdownItemHoverBorderColor", "Hover border"], ["dropdownItemSelectedBackgroundColor", "Selected background"], ["dropdownItemSelectedTextColor", "Selected text"], ["dropdownItemSelectedBorderColor", "Selected border"], ["dropdownItemPressedBackgroundColor", "Pressed background"], ["dropdownItemPressedTextColor", "Pressed text"], ["dropdownItemPressedBorderColor", "Pressed border"], ["dropdownGroupTextColor", "Group labels"]]],
    ["Text Boxes", [["textBoxBackgroundColor", "Background"], ["textBoxBorderColor", "Border"], ["textBoxTextColor", "Text"], ["textBoxPlaceholderColor", "Placeholder"], ["textBoxHoverBorderColor", "Hover border"], ["textBoxFocusBackgroundColor", "Focus background"], ["textBoxFocusBorderColor", "Focus border"], ["textBoxSelectionBackgroundColor", "Selection background"], ["textBoxSelectionTextColor", "Selection text"]]],
    ["Sliders", [["sliderBackgroundColor", "Background"], ["sliderBorderColor", "Border"], ["sliderTrackColor", "Track"], ["sliderThumbColor", "Thumb"], ["sliderThumbBorderColor", "Thumb border"]]],
    ["Color Picker", [["colorPickerBorderColor", "Circle border"]]],
    ["Toggles", [["toggleTrackOffColor", "Off track"], ["toggleTrackOnColor", "On track"], ["toggleThumbOffColor", "Off thumb"], ["toggleThumbOnColor", "On thumb"], ["toggleBorderOffColor", "Off border"], ["toggleBorderOnColor", "On border"]]],
    ["Checkboxes", [["checkboxBackgroundColor", "Background"], ["checkboxCheckedBackgroundColor", "Checked background"], ["checkboxBorderColor", "Border"], ["checkboxCheckColor", "Check mark"]]],
    ["Scrollbars", [["scrollbarTrackColor", "Track"], ["scrollbarThumbColor", "Thumb"], ["scrollbarThumbHoverColor", "Thumb hover"]]],
    ["Default Tags", [["badgeDefaultBg", "Tag background"], ["badgeDefaultText", "Tag text"], ["badgeDefaultBorder", "Tag border"]]],
    ["AC3", [["badgeAc3Bg", "Background"], ["badgeAc3Text", "Text"], ["badgeAc3Border", "Border"]]],
    ["THX", [["badgeThxBg", "Background"], ["badgeThxText", "Text"], ["badgeThxBorder", "Border"]]],
    ["SRD", [["badgeSrdBg", "Background"], ["badgeSrdText", "Text"], ["badgeSrdBorder", "Border"]]],
    ["LBX", [["badgeLbxBg", "Background"], ["badgeLbxText", "Text"], ["badgeLbxBorder", "Border"]]],
    ["CAV", [["badgeCavBg", "Background"], ["badgeCavText", "Text"], ["badgeCavBorder", "Border"]]],
    ["P&S", [["badgePsBg", "Background"], ["badgePsText", "Text"], ["badgePsBorder", "Border"]]],
    ["ANA", [["badgeAnaBg", "Background"], ["badgeAnaText", "Text"], ["badgeAnaBorder", "Border"]]],
    ["Bilingual", [["badgeBilingualBg", "Background"], ["badgeBilingualText", "Text"], ["badgeBilingualBorder", "Border"]]],
    ["Uncut", [["badgeUncutBg", "Background"], ["badgeUncutText", "Text"], ["badgeUncutBorder", "Border"]]],
  ];
  const laserVaultOnlyColorGroups = new Set(["Footer Disc Count", "Sidebar Button", "Default Tags", "AC3", "THX", "SRD", "LBX", "CAV", "P&S", "ANA", "Bilingual", "Uncut"]);
  const misterOnlyColorFieldRemovals = new Set(["posterBackground", "editHighlightColor"]);
  const baseVisibleGroups = appContext === "mister"
    ? groups
      .filter(([title]) => !laserVaultOnlyColorGroups.has(title))
      .map(([title, fields]) => [title, fields.filter(([key]) => !misterOnlyColorFieldRemovals.has(key))])
      .filter(([, fields]) => fields.length > 0)
    : groups;
  const visibleGroups = theme.appStyle === "macos9platinum"
    ? [
      ["Platinum Chrome", [["mac9ChromeColor", "Window chrome"], ["mac9ContentColor", "Window content"], ["mac9WindowActiveOutlineColor", "Active window outline"], ["mac9WindowInactiveOutlineColor", "Inactive window outline"], ["mac9FooterStatusTextColor", "Footer connection status text"]]],
      ["Platinum Panels", [["mac9PanelBackgroundColor", "Panel surface"], ["mac9PanelTitleBackgroundColor", "Title backing"], ["mac9PanelTextColor", "Panel text"], ["mac9PanelTitleTextColor", "Panel title text"], ["mac9PanelGrooveShadowColor", "Groove dark line"], ["mac9PanelInnerHighlightColor", "Inner top/left highlight"], ["mac9PanelOuterHighlightColor", "Outer right/bottom highlight"]]],
      ["Platinum Title Bar", [["mac9TitlebarActiveTextColor", "Active title text"], ["mac9TitlebarInactiveTextColor", "Inactive title text"]]],
      ["Platinum Bevels", [["mac9BevelLightColor", "General highlight"], ["mac9BevelMidColor", "General middle"], ["mac9BevelDarkColor", "General shadow"], ["mac9BevelOutlineColor", "General outline"]]],
    ]
    : baseVisibleGroups;
  const settingsCategories = appContext === "mister"
    ? [
      ["appearance", "Appearance", "settings-appearance-glyph"],
      ...(isSpecialEraStyle ? [["special-theme", specialThemeName, "settings-appearance-glyph"]] : []),
      ["colors", "Colors", "settings-colors-glyph"],
      ["fonts", "Fonts", "settings-fonts-glyph"],
      ["glyphs", "Glyphs", "settings-glyphs-glyph"],
      ["devtools", "Dev Tools", "settings-info-glyph"],
      ...(flashToolsPanel ? [["flash-tools", "Flash Tools", "settings-info-glyph"]] : []),
      ...(apiPanel ? [["api", "API", "settings-api-glyph"]] : []),
      ...(backendPanel ? [["backend", "Activity", "settings-info-glyph"]] : []),
    ]
    : [
      ["appearance", "Appearance", "settings-appearance-glyph"],
      ["colors", "Colors", "settings-colors-glyph"],
      ["fonts", "Fonts", "settings-fonts-glyph"],
      ["glyphs", "Glyphs", "settings-glyphs-glyph"],
      ["covers", "Covers", "settings-covers-glyph"],
      ["library", "Libraries", "settings-library-glyph"],
      ["health", "Health", "settings-health-glyph", healthItems.length],
      ["api", "API", "settings-api-glyph"],
    ];
  const activeSettingsLabel = settingsSection === "about"
    ? "About"
    : settingsCategories.find(([id]) => id === settingsSection)?.[1] || "Settings";
  const acknowledgementText = appContext === "mister"
    ? [
      `${appName} ${aboutInfo.version}`,
      appSubtitle,
      `Build date: ${aboutInfo.buildDate}`,
      "",
      "Runtime",
      `Electron ${aboutInfo.electron}`,
      `Chromium ${aboutInfo.chromium}`,
      `Node.js ${aboutInfo.node}`,
      "",
      "Third-party technology and services",
      "React - user interface framework",
      "Electron - Windows desktop application runtime",
      "Vite - development and production build tooling",
      "MiSTer Companion EX services - device workflows",
      "Paramiko and Python SSH tooling - device communication",
    ].join("\n")
    : [
      `LaserVault ${aboutInfo.version}`,
      `Created by ${aboutInfo.author}`,
      `Build date: ${aboutInfo.buildDate}`,
      "",
      "Runtime",
      `Electron ${aboutInfo.electron}`,
      `Chromium ${aboutInfo.chromium}`,
      `Node.js ${aboutInfo.node}`,
      "",
      "Third-party technology and services",
      "React - user interface framework",
      "Electron - Windows desktop application runtime",
      "Vite - development and production build tooling",
      "The Movie Database (TMDB) - optional movie metadata, artwork, ratings, and trailers",
      "LaserDisc Database (LDDB) - optional LaserDisc lookup and cover workflows",
      "YouTube, Vimeo, and Dailymotion - optional trailer playback sources",
      "",
      "LaserVault is an independent project and is not affiliated with TMDB, LDDB, YouTube, Vimeo, or Dailymotion. Product names and trademarks belong to their respective owners.",
    ].join("\n");

  return (
    <div className={`modal-backdrop settings-modal-backdrop${settingsBackdropBlurDisabled ? " dev-backdrop-blur-disabled" : ""}`}>
      <div className={`modal settings-modal${themeToggleEnabled(theme.cleanSidebarEnabled) ? " clean-sidebar" : ""}`}>
        <WindowTitlebar title="Settings" onClose={onClose} closeLabel="Close settings" />
        <div className="settings-workspace">
        <aside className="settings-sidebar">
        <div className="settings-sidebar-header">
          <div className="modal-title">Settings</div>
        </div>
        <nav className="settings-nav" aria-label="Settings categories">
          {settingsCategories.map(([id, label, glyphClass, count]) => (
            <React.Fragment key={id}>
              {(id === "covers" || id === "devtools") && <span className={`settings-nav-divider${themeToggleEnabled(theme.settingsSidebarHorizontalDividerRemoved ?? DEFAULT_THEME.settingsSidebarHorizontalDividerRemoved) ? " is-hidden" : ""}`} role="separator" aria-orientation="horizontal" />}
              <button type="button" className={settingsSection === id ? "active" : ""} aria-current={settingsSection === id ? "page" : undefined} onClick={() => setSettingsSection(id)}>
                <span className={`settings-nav-glyph ${glyphClass}`} aria-hidden="true" />
                <span>{label}</span>
                {count > 0 && <span className="settings-nav-count">{count}</span>}
              </button>
            </React.Fragment>
          ))}
          <button type="button" className={`settings-nav-about${settingsSection === "about" ? " active" : ""}`} aria-current={settingsSection === "about" ? "page" : undefined} onClick={() => setSettingsSection("about")}>
            <span className="settings-nav-glyph settings-info-glyph" aria-hidden="true" />
            <span>About</span>
          </button>
        </nav>
        </aside>
        <section className="settings-content">
        <header className="settings-page-header">
          <h2>{activeSettingsLabel}</h2>
          <button type="button" className="settings-close-button" aria-label="Close settings" title="Close settings" onClick={onClose}>
            <span className="window-control-glyph window-close-glyph" aria-hidden="true" />
          </button>
        </header>
        <div ref={settingsScrollRef} className="settings-scroll-area">
        {settingsSection === "appearance" && (
        <section className="settings-panel">
          <SettingsSectionHeading title="General" description="Choose a theme, visual style, and window control treatment." />
          <div className="theme-preset-row">
            <label className="appearance-control theme-select-control">
              <span>Theme</span>
              <CustomSelect value={selectedThemeId} onChange={applyTheme} ariaLabel="Theme" options={[
                ...(selectedThemeId === "custom" ? [{ value: "custom", label: "Current custom theme" }] : []),
                ...THEME_PRESETS.filter(Boolean).map((preset, index) => ({ value: "preset:" + index, label: preset.name, group: "Presets" })),
                ...savedThemes.map((saved, index) => ({ value: "saved:" + index, label: saved.name, group: "Saved Themes" })),
              ]} />
            </label>
            <label className="appearance-control">
              <span>Style</span>
              <CustomSelect value={theme.appStyle} onChange={applyAppStyle} ariaLabel="Style" options={APP_STYLE_OPTIONS.map(([value, label]) => ({ value, label }))} />
            </label>
            {!isMacOS9PlatinumStyle && <label className="appearance-control">
              <span>Window control style</span>
              <CustomSelect value={theme.windowControlStyle || DEFAULT_THEME.windowControlStyle} onChange={(value) => setColor("windowControlStyle", value)} ariaLabel="Window control style" options={WINDOW_CONTROL_STYLE_OPTIONS.map(([value, label]) => ({ value, label }))} />
            </label>}
          </div>
          {!isMacOS9PlatinumStyle && <ToggleField label="Place window controls on the left" checked={themeToggleEnabled(theme.windowControlsLeft)} onChange={(value) => setColor("windowControlsLeft", value)} className="left-window-controls-toggle" />}
          {isMacOS9PlatinumStyle && <ToggleField label="Smaller window (1300 × 900)" checked={themeToggleEnabled(theme.mac9SmallerWindow ?? DEFAULT_THEME.mac9SmallerWindow)} onChange={(value) => setColor("mac9SmallerWindow", value)} className="platinum-smaller-window-toggle" />}
          <div className="theme-action-row">
            {themePreviewEnabled && <button className="secondary-button" onClick={showThemePreview}>Preview theme</button>}
            <button className="secondary-button" onClick={() => setThemeNameOpen(true)}>Save current theme</button>
            {onOpenThemesFolder && <button className="secondary-button" onClick={onOpenThemesFolder}>Open themes folder</button>}
            {onReloadThemes && <button className="secondary-button" onClick={onReloadThemes}>Reload themes</button>}
            <button className="secondary-button" onClick={openAssetsFolder}>Open assets folder</button>
            <button className="secondary-button" onClick={reloadThemeAssets}>Reload assets</button>
            <button className="secondary-button" onClick={onReset}>Reset appearance</button>
          </div>
          <p className="settings-help-text">Theme images are read from the root Assets folder. Keep the existing names and folder structure when replacing artwork.</p>
          {isMacOS9PlatinumStyle && (<>
          <button type="button" className="color-section-toggle borders-section-toggle" aria-expanded={bordersExpanded} onClick={() => setBordersExpanded((value) => !value)}>
            <span className="appearance-section-title"><span className="appearance-section-glyph appearance-shape-glyph" aria-hidden="true" /><span>Borders</span></span>
            <span className={bordersExpanded ? "color-section-chevron expanded" : "color-section-chevron"} aria-hidden="true" />
          </button>
          <SettingsAccordionPanel expanded={bordersExpanded}>
            <div className="shape-depth-content platinum-border-settings">
              <h5>Window outline</h5>
              <div className="effects-grid shape-depth-grid">
                <ColorField label="Active outline" value={theme.mac9WindowActiveOutlineColor || DEFAULT_THEME.mac9WindowActiveOutlineColor} onChange={(value) => setColor("mac9WindowActiveOutlineColor", value)} />
                <ColorField label="Inactive outline" value={theme.mac9WindowInactiveOutlineColor || DEFAULT_THEME.mac9WindowInactiveOutlineColor} onChange={(value) => setColor("mac9WindowInactiveOutlineColor", value)} />
              </div>
              <h5>Panel frame lines</h5>
              <div className="effects-grid shape-depth-grid">
                <ColorField label="Groove dark line" value={theme.mac9PanelGrooveShadowColor || DEFAULT_THEME.mac9PanelGrooveShadowColor} onChange={(value) => setColor("mac9PanelGrooveShadowColor", value)} />
                <ColorField label="Inner top/left highlight" value={theme.mac9PanelInnerHighlightColor || DEFAULT_THEME.mac9PanelInnerHighlightColor} onChange={(value) => setColor("mac9PanelInnerHighlightColor", value)} />
                <ColorField label="Outer right/bottom highlight" value={theme.mac9PanelOuterHighlightColor || DEFAULT_THEME.mac9PanelOuterHighlightColor} onChange={(value) => setColor("mac9PanelOuterHighlightColor", value)} />
              </div>
              <h5>Sidebar lines</h5>
              <div className="effects-grid shape-depth-grid">
                <ColorField label="Content separator" value={theme.mediaSidebarBorderColor || DEFAULT_THEME.mediaSidebarBorderColor} onChange={(value) => setColor("mediaSidebarBorderColor", value)} />
                <ColorField label="Section dividers" value={theme.mediaSidebarDividerColor || DEFAULT_THEME.mediaSidebarDividerColor} onChange={(value) => setColor("mediaSidebarDividerColor", value)} />
              </div>
            </div>
          </SettingsAccordionPanel>
          <button type="button" className="color-section-toggle shadow-section-toggle" aria-expanded={shadowsExpanded} onClick={() => setShadowsExpanded((value) => !value)}>
            <span className="appearance-section-title"><span className="appearance-section-glyph appearance-shadows-glyph" aria-hidden="true" /><span>Shadows</span></span>
            <span className={shadowsExpanded ? "color-section-chevron expanded" : "color-section-chevron"} aria-hidden="true" />
          </button>
          <SettingsAccordionPanel expanded={shadowsExpanded}>
            <div className="shape-depth-content platinum-shadow-settings">
              <h5>Main window</h5>
              <div className="effects-grid shape-depth-grid">
                <ToggleField label="Enable window shadow" checked={themeToggleEnabled(theme.mac9WindowShadowEnabled ?? DEFAULT_THEME.mac9WindowShadowEnabled)} onChange={(value) => setColor("mac9WindowShadowEnabled", value)} className="shadow-toggle-row" />
                {[
                  ["Horizontal offset", "mac9WindowShadowOffsetX"],
                  ["Vertical offset", "mac9WindowShadowOffsetY"],
                  ["Blur", "mac9WindowShadowBlur"],
                ].map(([label, key]) => (
                  <label className="appearance-control" key={key}>
                    <span>{label}</span>
                    <CustomSelect
                      value={theme[key] || DEFAULT_THEME[key]}
                      onChange={(value) => setColor(key, value)}
                      ariaLabel={`Platinum ${label.toLowerCase()}`}
                      options={[1, 2, 3, 4].map((size) => ({ value: `${size}px`, label: `${size} px` }))}
                    />
                  </label>
                ))}
                <RangeField label="Shadow transparency" value={(100 - parseFloat(theme.mac9WindowShadowOpacity || DEFAULT_THEME.mac9WindowShadowOpacity)) + "%"} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("mac9WindowShadowOpacity", (100 - parseFloat(value)) + "%")} />
              </div>
              <h5>Window chrome</h5>
              <div className="effects-grid shape-depth-grid">
                <ToggleField label="Enable chrome shadow" checked={themeToggleEnabled(theme.mac9ChromeShadowEnabled ?? DEFAULT_THEME.mac9ChromeShadowEnabled)} onChange={(value) => setColor("mac9ChromeShadowEnabled", value)} className="shadow-toggle-row" />
                {[
                  ["Horizontal offset", "mac9ChromeShadowOffsetX"],
                  ["Vertical offset", "mac9ChromeShadowOffsetY"],
                  ["Blur", "mac9ChromeShadowBlur"],
                ].map(([label, key]) => (
                  <label className="appearance-control" key={key}>
                    <span>{label}</span>
                    <CustomSelect
                      value={theme[key] || DEFAULT_THEME[key]}
                      onChange={(value) => setColor(key, value)}
                      ariaLabel={`Platinum chrome ${label.toLowerCase()}`}
                      options={[1, 2, 3, 4].map((size) => ({ value: `${size}px`, label: `${size} px` }))}
                    />
                  </label>
                ))}
                <RangeField label="Chrome shadow transparency" value={(100 - parseFloat(theme.mac9ChromeShadowOpacity || DEFAULT_THEME.mac9ChromeShadowOpacity)) + "%"} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("mac9ChromeShadowOpacity", (100 - parseFloat(value)) + "%")} />
              </div>
              <p className="settings-help-text">Platinum window shadows are visible only while the app is focused and not maximized, matching the classic desktop treatment.</p>
            </div>
          </SettingsAccordionPanel>
          <button type="button" className="color-section-toggle bevels-section-toggle" aria-expanded={bevelsExpanded} onClick={() => setBevelsExpanded((value) => !value)}>
            <span className="appearance-section-title"><span className="appearance-section-glyph appearance-shape-glyph" aria-hidden="true" /><span>Bevels</span></span>
            <span className={bevelsExpanded ? "color-section-chevron expanded" : "color-section-chevron"} aria-hidden="true" />
          </button>
          <SettingsAccordionPanel expanded={bevelsExpanded}>
            <div className="shape-depth-content platinum-bevel-settings">
              <ToggleField label="Enable Platinum bevels" checked={themeToggleEnabled(theme.mac9BevelEnabled ?? DEFAULT_THEME.mac9BevelEnabled)} onChange={(value) => setColor("mac9BevelEnabled", value)} className="shadow-toggle-row" />
              <h5>Bevel colors</h5>
              <div className="effects-grid shape-depth-grid">
                <ColorField label="Highlight" value={theme.mac9BevelLightColor || DEFAULT_THEME.mac9BevelLightColor} onChange={(value) => setColor("mac9BevelLightColor", value)} />
                <ColorField label="Middle" value={theme.mac9BevelMidColor || DEFAULT_THEME.mac9BevelMidColor} onChange={(value) => setColor("mac9BevelMidColor", value)} />
                <ColorField label="Shadow" value={theme.mac9BevelDarkColor || DEFAULT_THEME.mac9BevelDarkColor} onChange={(value) => setColor("mac9BevelDarkColor", value)} />
                <ColorField label="Outline" value={theme.mac9BevelOutlineColor || DEFAULT_THEME.mac9BevelOutlineColor} onChange={(value) => setColor("mac9BevelOutlineColor", value)} />
              </div>
              <h5>Surface colors</h5>
              <div className="effects-grid shape-depth-grid">
                <ColorField label="Window chrome" value={theme.mac9ChromeColor || DEFAULT_THEME.mac9ChromeColor} onChange={(value) => setColor("mac9ChromeColor", value)} />
                <ColorField label="Inner content" value={theme.mac9ContentColor || DEFAULT_THEME.mac9ContentColor} onChange={(value) => setColor("mac9ContentColor", value)} />
              </div>
              <h5>Element depth</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="Window chrome" value={theme.mac9WindowBevelWidth || DEFAULT_THEME.mac9WindowBevelWidth} min="0" max="3" step="1" suffix="px" onChange={(value) => setColor("mac9WindowBevelWidth", value)} />
                <RangeField label="Panels and cards" value={theme.mac9PanelBevelWidth || DEFAULT_THEME.mac9PanelBevelWidth} min="0" max="3" step="1" suffix="px" onChange={(value) => setColor("mac9PanelBevelWidth", value)} />
                <RangeField label="Buttons and controls" value={theme.mac9ControlBevelWidth || DEFAULT_THEME.mac9ControlBevelWidth} min="0" max="3" step="1" suffix="px" onChange={(value) => setColor("mac9ControlBevelWidth", value)} />
                <RangeField label="Fields and menus" value={theme.mac9FieldBevelWidth || DEFAULT_THEME.mac9FieldBevelWidth} min="0" max="3" step="1" suffix="px" onChange={(value) => setColor("mac9FieldBevelWidth", value)} />
                <RangeField label="Lists and rows" value={theme.mac9ListBevelWidth || DEFAULT_THEME.mac9ListBevelWidth} min="0" max="3" step="1" suffix="px" onChange={(value) => setColor("mac9ListBevelWidth", value)} />
                <RangeField label="Scrollbars" value={theme.mac9ScrollbarBevelWidth || DEFAULT_THEME.mac9ScrollbarBevelWidth} min="0" max="3" step="1" suffix="px" onChange={(value) => setColor("mac9ScrollbarBevelWidth", value)} />
              </div>
            </div>
          </SettingsAccordionPanel>
          </>)}
          {!isMacOS9PlatinumStyle && (<>
          <button type="button" className="color-section-toggle motion-section-toggle" aria-expanded={motionExpanded} onClick={() => setMotionExpanded((value) => !value)}>
            <span className="appearance-section-title"><span className="appearance-section-glyph appearance-motion-glyph" aria-hidden="true" /><span>Motion</span></span>
            <span className={motionExpanded ? "color-section-chevron expanded" : "color-section-chevron"} aria-hidden="true" />
          </button>
          <SettingsAccordionPanel expanded={motionExpanded}>
            <div className="motion-settings-content shape-depth-content">
              <div className="effects-grid shape-depth-grid">
                <label className="appearance-control">
                  <span>Interface animations</span>
                  <CustomSelect
                    value={theme.interfaceAnimations || DEFAULT_THEME.interfaceAnimations}
                    onChange={(value) => setColor("interfaceAnimations", value)}
                    ariaLabel="Interface animations"
                    options={[
                      { value: "off", label: "Off" },
                      { value: "subtle", label: "Subtle" },
                      { value: "standard", label: "Standard" },
                    ]}
                  />
                </label>
                <label className="appearance-control">
                  <span>Animation speed</span>
                  <CustomSelect
                    value={theme.animationSpeed || DEFAULT_THEME.animationSpeed}
                    onChange={(value) => setColor("animationSpeed", value)}
                    ariaLabel="Animation speed"
                    options={[
                      { value: "slow", label: "Slow" },
                      { value: "normal", label: "Normal" },
                      { value: "fast", label: "Fast" },
                    ]}
                  />
                </label>
                <ToggleField label="Page transitions" checked={themeToggleEnabled(theme.pageTransitionsEnabled ?? DEFAULT_THEME.pageTransitionsEnabled)} onChange={(value) => setColor("pageTransitionsEnabled", value)} />
                <ToggleField label="Button press animation" checked={themeToggleEnabled(theme.buttonPressAnimationEnabled ?? DEFAULT_THEME.buttonPressAnimationEnabled)} onChange={(value) => setColor("buttonPressAnimationEnabled", value)} />
                <ToggleField label="Install Center card hover animation" checked={themeToggleEnabled(theme.cardHoverAnimationEnabled ?? DEFAULT_THEME.cardHoverAnimationEnabled)} onChange={(value) => setColor("cardHoverAnimationEnabled", value)} />
                <ToggleField label="Progress shimmer" checked={themeToggleEnabled(theme.progressShimmerEnabled ?? DEFAULT_THEME.progressShimmerEnabled)} onChange={(value) => setColor("progressShimmerEnabled", value)} />
                <ToggleField label="Modal animation" checked={themeToggleEnabled(theme.modalAnimationEnabled ?? DEFAULT_THEME.modalAnimationEnabled)} onChange={(value) => setColor("modalAnimationEnabled", value)} />
                <ToggleField label="Settings accordion animation" checked={themeToggleEnabled(theme.settingsAccordionAnimationEnabled ?? DEFAULT_THEME.settingsAccordionAnimationEnabled)} onChange={(value) => setColor("settingsAccordionAnimationEnabled", value)} />
                <ToggleField label="Install Center card reveal" checked={themeToggleEnabled(theme.installCenterCardRevealEnabled ?? DEFAULT_THEME.installCenterCardRevealEnabled)} onChange={(value) => setColor("installCenterCardRevealEnabled", value)} />
                <ToggleField label="Respect reduced motion" checked={themeToggleEnabled(theme.respectReducedMotionEnabled ?? DEFAULT_THEME.respectReducedMotionEnabled)} onChange={(value) => setColor("respectReducedMotionEnabled", value)} />
              </div>
              <div className="settings-note">Subtle keeps motion to short fades, tiny slides, tactile button press depth, Install Center card hover lift, and soft progress shimmer. Standard is slightly more visible. Off zeroes out all interface motion.</div>
            </div>
          </SettingsAccordionPanel>
          <button type="button" className="color-section-toggle gradient-section-toggle" aria-expanded={gradientsExpanded} onClick={() => setGradientsExpanded((value) => !value)}>
            <span className="appearance-section-title"><span className="appearance-section-glyph appearance-gradients-glyph" aria-hidden="true" /><span>Gradients</span></span>
            <span className={gradientsExpanded ? "color-section-chevron expanded" : "color-section-chevron"} aria-hidden="true" />
          </button>
          <SettingsAccordionPanel expanded={gradientsExpanded}>
            <div className="shape-depth-content gradient-theme-content">
              <h5>Top header</h5>
              <div className="effects-grid shape-depth-grid">
                <ToggleField label="Enable header gradient" checked={themeToggleEnabled(theme.headerGradientEnabled ?? DEFAULT_THEME.headerGradientEnabled)} onChange={(value) => setColor("headerGradientEnabled", value)} className="shadow-toggle-row" />
                <RangeField label="Angle" value={theme.headerGradientAngle || DEFAULT_THEME.headerGradientAngle} min="0" max="360" step="1" suffix="deg" onChange={(value) => setColor("headerGradientAngle", value)} />
                <ColorField label="Start color" value={theme.headerGradientStartColor || DEFAULT_THEME.headerGradientStartColor} onChange={(value) => setColor("headerGradientStartColor", value)} />
                <RangeField label="Start position" value={theme.headerGradientStartStop || DEFAULT_THEME.headerGradientStartStop} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("headerGradientStartStop", value)} />
                <ColorField label="End color" value={theme.headerGradientEndColor || DEFAULT_THEME.headerGradientEndColor} onChange={(value) => setColor("headerGradientEndColor", value)} />
                <RangeField label="End position" value={theme.headerGradientEndStop || DEFAULT_THEME.headerGradientEndStop} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("headerGradientEndStop", value)} />
              </div>
              <h5>Workspace background</h5>
              <div className="effects-grid shape-depth-grid">
                <ToggleField label="Enable background gradient" checked={themeToggleEnabled(theme.workspaceGradientEnabled ?? DEFAULT_THEME.workspaceGradientEnabled)} onChange={(value) => setColor("workspaceGradientEnabled", value)} className="shadow-toggle-row" />
                <RangeField label="Angle" value={theme.workspaceGradientAngle || DEFAULT_THEME.workspaceGradientAngle} min="0" max="360" step="1" suffix="deg" onChange={(value) => setColor("workspaceGradientAngle", value)} />
                <RangeField label="Overall transparency" value={(100 - parseFloat(theme.workspaceGradientOpacity || DEFAULT_THEME.workspaceGradientOpacity)) + "%"} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("workspaceGradientOpacity", (100 - parseFloat(value)) + "%")} />
                <ColorField label="Start color" value={theme.workspaceGradientStartColor || DEFAULT_THEME.workspaceGradientStartColor} onChange={(value) => setColor("workspaceGradientStartColor", value)} />
                <RangeField label="Start position" value={theme.workspaceGradientStartStop || DEFAULT_THEME.workspaceGradientStartStop} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("workspaceGradientStartStop", value)} />
                <ColorField label="Middle color" value={theme.workspaceGradientMidColor || DEFAULT_THEME.workspaceGradientMidColor} onChange={(value) => setColor("workspaceGradientMidColor", value)} />
                <RangeField label="Middle position" value={theme.workspaceGradientMidStop || DEFAULT_THEME.workspaceGradientMidStop} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("workspaceGradientMidStop", value)} />
                <ColorField label="End color" value={theme.workspaceGradientEndColor || DEFAULT_THEME.workspaceGradientEndColor} onChange={(value) => setColor("workspaceGradientEndColor", value)} />
                <RangeField label="End position" value={theme.workspaceGradientEndStop || DEFAULT_THEME.workspaceGradientEndStop} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("workspaceGradientEndStop", value)} />
              </div>
              <h5>Background bloom</h5>
              <div className="effects-grid shape-depth-grid">
                <ToggleField label="Enable background bloom" checked={themeToggleEnabled(theme.workspaceBloomEnabled ?? DEFAULT_THEME.workspaceBloomEnabled)} onChange={(value) => setColor("workspaceBloomEnabled", value)} className="shadow-toggle-row" />
                <ColorField label="Bloom color" value={theme.workspaceBloomColor || DEFAULT_THEME.workspaceBloomColor} onChange={(value) => setColor("workspaceBloomColor", value)} />
                <RangeField label="Bloom transparency" value={(100 - parseFloat(theme.workspaceBloomOpacity || DEFAULT_THEME.workspaceBloomOpacity)) + "%"} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("workspaceBloomOpacity", (100 - parseFloat(value)) + "%")} />
                <RangeField label="Horizontal position" value={theme.workspaceBloomX || DEFAULT_THEME.workspaceBloomX} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("workspaceBloomX", value)} />
                <RangeField label="Vertical position" value={theme.workspaceBloomY || DEFAULT_THEME.workspaceBloomY} min="-20" max="120" step="1" suffix="%" onChange={(value) => setColor("workspaceBloomY", value)} />
                <RangeField label="Bloom size" value={theme.workspaceBloomSize || DEFAULT_THEME.workspaceBloomSize} min="80" max="1000" step="10" suffix="px" onChange={(value) => setColor("workspaceBloomSize", value)} />
              </div>
              <h5>Panel surfaces</h5>
              <div className="effects-grid shape-depth-grid">
                <ToggleField label="Enable panel gradients" checked={themeToggleEnabled(theme.panelGradientEnabled ?? DEFAULT_THEME.panelGradientEnabled)} onChange={(value) => setColor("panelGradientEnabled", value)} className="shadow-toggle-row" />
                <RangeField label="Angle" value={theme.panelGradientAngle || DEFAULT_THEME.panelGradientAngle} min="0" max="360" step="1" suffix="deg" onChange={(value) => setColor("panelGradientAngle", value)} />
                <ColorField label="Start color" value={theme.panelGradientStartColor || DEFAULT_THEME.panelGradientStartColor} onChange={(value) => setColor("panelGradientStartColor", value)} />
                <RangeField label="Start opacity" value={theme.panelGradientStartOpacity || DEFAULT_THEME.panelGradientStartOpacity} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("panelGradientStartOpacity", value)} />
                <RangeField label="Start position" value={theme.panelGradientStartStop || DEFAULT_THEME.panelGradientStartStop} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("panelGradientStartStop", value)} />
                <ColorField label="Middle color" value={theme.panelGradientMidColor || DEFAULT_THEME.panelGradientMidColor} onChange={(value) => setColor("panelGradientMidColor", value)} />
                <RangeField label="Middle opacity" value={theme.panelGradientMidOpacity || DEFAULT_THEME.panelGradientMidOpacity} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("panelGradientMidOpacity", value)} />
                <RangeField label="Middle position" value={theme.panelGradientMidStop || DEFAULT_THEME.panelGradientMidStop} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("panelGradientMidStop", value)} />
                <ColorField label="End color" value={theme.panelGradientEndColor || DEFAULT_THEME.panelGradientEndColor} onChange={(value) => setColor("panelGradientEndColor", value)} />
                <RangeField label="End opacity" value={theme.panelGradientEndOpacity || DEFAULT_THEME.panelGradientEndOpacity} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("panelGradientEndOpacity", value)} />
                <RangeField label="End position" value={theme.panelGradientEndStop || DEFAULT_THEME.panelGradientEndStop} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("panelGradientEndStop", value)} />
              </div>
              <h5>Section headers</h5>
              <div className="effects-grid shape-depth-grid">
                <ToggleField label="Enable section header gradient" checked={themeToggleEnabled(theme.sectionHeaderGradientEnabled ?? DEFAULT_THEME.sectionHeaderGradientEnabled)} onChange={(value) => setColor("sectionHeaderGradientEnabled", value)} className="shadow-toggle-row" />
                <RangeField label="Angle" value={theme.sectionHeaderGradientAngle || DEFAULT_THEME.sectionHeaderGradientAngle} min="0" max="360" step="1" suffix="deg" onChange={(value) => setColor("sectionHeaderGradientAngle", value)} />
                <ColorField label="Gradient color" value={theme.sectionHeaderGradientColor || DEFAULT_THEME.sectionHeaderGradientColor} onChange={(value) => setColor("sectionHeaderGradientColor", value)} />
                <RangeField label="Gradient transparency" value={(100 - parseFloat(theme.sectionHeaderGradientOpacity || DEFAULT_THEME.sectionHeaderGradientOpacity)) + "%"} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("sectionHeaderGradientOpacity", (100 - parseFloat(value)) + "%")} />
                <RangeField label="Gradient reach" value={theme.sectionHeaderGradientReach || DEFAULT_THEME.sectionHeaderGradientReach} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("sectionHeaderGradientReach", value)} />
                <ToggleField label="Enable section header bloom" checked={themeToggleEnabled(theme.sectionHeaderBloomEnabled ?? DEFAULT_THEME.sectionHeaderBloomEnabled)} onChange={(value) => setColor("sectionHeaderBloomEnabled", value)} className="shadow-toggle-row" />
                <ColorField label="Bloom color" value={theme.sectionHeaderBloomColor || DEFAULT_THEME.sectionHeaderBloomColor} onChange={(value) => setColor("sectionHeaderBloomColor", value)} />
                <RangeField label="Bloom transparency" value={(100 - parseFloat(theme.sectionHeaderBloomOpacity || DEFAULT_THEME.sectionHeaderBloomOpacity)) + "%"} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("sectionHeaderBloomOpacity", (100 - parseFloat(value)) + "%")} />
                <RangeField label="Bloom width" value={theme.sectionHeaderBloomWidth || DEFAULT_THEME.sectionHeaderBloomWidth} min="80" max="700" step="10" suffix="px" onChange={(value) => setColor("sectionHeaderBloomWidth", value)} />
              </div>
              <p className="settings-help-text">These roles are stored with the theme and cover the workspace, panels, and section-header accent effects.</p>
            </div>
          </SettingsAccordionPanel>
          <button type="button" className="color-section-toggle gradient-section-toggle" aria-expanded={materialsExpanded} onClick={() => setMaterialsExpanded((value) => !value)}>
            <span className="appearance-section-title"><span className="appearance-section-glyph appearance-surface-material-glyph" aria-hidden="true" /><span>Surface Material</span></span>
            <span className={materialsExpanded ? "color-section-chevron expanded" : "color-section-chevron"} aria-hidden="true" />
          </button>
          <SettingsAccordionPanel expanded={materialsExpanded}>
            <div className="shape-depth-content gradient-theme-content">
              <h5>Noise texture</h5>
              <div className="effects-grid shape-depth-grid">
                <ToggleField label="Enable surface noise" checked={themeToggleEnabled(theme.surfaceNoiseEnabled ?? DEFAULT_THEME.surfaceNoiseEnabled)} onChange={(value) => setColor("surfaceNoiseEnabled", value)} className="shadow-toggle-row" />
                <ToggleField label="Apply to workspace" checked={themeToggleEnabled(theme.surfaceNoiseWorkspaceEnabled ?? DEFAULT_THEME.surfaceNoiseWorkspaceEnabled)} onChange={(value) => setColor("surfaceNoiseWorkspaceEnabled", value)} className="shadow-toggle-row" />
                <ToggleField label="Apply to panels" checked={themeToggleEnabled(theme.surfaceNoisePanelsEnabled ?? DEFAULT_THEME.surfaceNoisePanelsEnabled)} onChange={(value) => setColor("surfaceNoisePanelsEnabled", value)} className="shadow-toggle-row" />
                <label className="appearance-control">
                  <span>Noise style</span>
                  <CustomSelect value={theme.surfaceNoiseStyle || DEFAULT_THEME.surfaceNoiseStyle} onChange={(value) => setColor("surfaceNoiseStyle", value)} ariaLabel="Noise style" options={[{ value: "fine", label: "Fine" }, { value: "medium", label: "Medium" }, { value: "heavy", label: "Heavy" }]} />
                </label>
                <RangeField label="Noise amount" value={theme.surfaceNoiseAmount || DEFAULT_THEME.surfaceNoiseAmount} min="0" max="20" step="0.5" suffix="%" onChange={(value) => setColor("surfaceNoiseAmount", value)} />
                <RangeField label="Texture scale" value={theme.surfaceNoiseScale || DEFAULT_THEME.surfaceNoiseScale} min="24" max="256" step="4" suffix="px" onChange={(value) => setColor("surfaceNoiseScale", value)} />
                <label className="appearance-control">
                  <span>Blend mode</span>
                  <CustomSelect value={theme.surfaceNoiseBlendMode || DEFAULT_THEME.surfaceNoiseBlendMode} onChange={(value) => setColor("surfaceNoiseBlendMode", value)} ariaLabel="Noise blend mode" options={[{ value: "soft-light", label: "Soft light" }, { value: "overlay", label: "Overlay" }, { value: "multiply", label: "Multiply" }, { value: "screen", label: "Screen" }, { value: "normal", label: "Normal" }]} />
                </label>
                <ColorField label="Noise tint" value={theme.surfaceNoiseTint || DEFAULT_THEME.surfaceNoiseTint} onChange={(value) => setColor("surfaceNoiseTint", value)} />
              </div>
              <h5>Sidebar material</h5>
              <div className="effects-grid shape-depth-grid">
                <ToggleField label="Enable sidebar noise" checked={themeToggleEnabled(theme.sidebarSurfaceNoiseEnabled ?? DEFAULT_THEME.sidebarSurfaceNoiseEnabled)} onChange={(value) => setColor("sidebarSurfaceNoiseEnabled", value)} className="shadow-toggle-row" />
                <label className="appearance-control">
                  <span>Noise style</span>
                  <CustomSelect value={theme.sidebarSurfaceNoiseStyle || DEFAULT_THEME.sidebarSurfaceNoiseStyle} onChange={(value) => setColor("sidebarSurfaceNoiseStyle", value)} ariaLabel="Sidebar noise style" options={[{ value: "fine", label: "Fine" }, { value: "medium", label: "Medium" }, { value: "heavy", label: "Heavy" }]} />
                </label>
                <RangeField label="Noise amount" value={theme.sidebarSurfaceNoiseAmount || DEFAULT_THEME.sidebarSurfaceNoiseAmount} min="0" max="20" step="0.5" suffix="%" onChange={(value) => setColor("sidebarSurfaceNoiseAmount", value)} />
                <RangeField label="Texture scale" value={theme.sidebarSurfaceNoiseScale || DEFAULT_THEME.sidebarSurfaceNoiseScale} min="24" max="256" step="4" suffix="px" onChange={(value) => setColor("sidebarSurfaceNoiseScale", value)} />
                <label className="appearance-control">
                  <span>Blend mode</span>
                  <CustomSelect value={theme.sidebarSurfaceNoiseBlendMode || DEFAULT_THEME.sidebarSurfaceNoiseBlendMode} onChange={(value) => setColor("sidebarSurfaceNoiseBlendMode", value)} ariaLabel="Sidebar noise blend mode" options={[{ value: "soft-light", label: "Soft light" }, { value: "overlay", label: "Overlay" }, { value: "multiply", label: "Multiply" }, { value: "screen", label: "Screen" }, { value: "normal", label: "Normal" }]} />
                </label>
                <ColorField label="Noise tint" value={theme.sidebarSurfaceNoiseTint || DEFAULT_THEME.sidebarSurfaceNoiseTint} onChange={(value) => setColor("sidebarSurfaceNoiseTint", value)} />
              </div>
              <p className="settings-help-text">Workspace and panels share the primary material recipe. The sidebar has an independent texture recipe so it can remain quieter or more pronounced.</p>
            </div>
          </SettingsAccordionPanel>
          <button type="button" className="color-section-toggle transparency-section-toggle" aria-expanded={transparencyExpanded} onClick={() => setTransparencyExpanded((value) => !value)}>
            <span className="appearance-section-title"><span className="appearance-section-glyph appearance-blur-glyph" aria-hidden="true" /><span>Transparency and blur</span></span>
            <span className={transparencyExpanded ? "color-section-chevron expanded" : "color-section-chevron"} aria-hidden="true" />
          </button>
          <SettingsAccordionPanel expanded={transparencyExpanded}>
            <div className="shape-depth-content transparency-blur-content">
              <h5>Main window</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="Surface transparency" value={Math.round((1 - Number(theme.surfaceOpacity ?? DEFAULT_THEME.surfaceOpacity)) * 100) + "%"} min="0" max="75" step="1" suffix="%" onChange={(value) => setColor("surfaceOpacity", String(1 - parseFloat(value) / 100))} />
                <RangeField label="Surface blur" value={theme.blurAmount || DEFAULT_THEME.blurAmount} min="0" max="40" step="1" suffix="px" onChange={(value) => setColor("blurAmount", value)} />
              </div>
              <h5>Header</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="Surface transparency" value={Math.round((1 - Number(theme.headerSurfaceOpacity ?? DEFAULT_THEME.headerSurfaceOpacity)) * 100) + "%"} min="0" max="75" step="1" suffix="%" onChange={(value) => setColor("headerSurfaceOpacity", String(1 - parseFloat(value) / 100))} />
                <RangeField label="Surface blur" value={theme.headerBlurAmount || DEFAULT_THEME.headerBlurAmount} min="0" max="40" step="1" suffix="px" onChange={(value) => setColor("headerBlurAmount", value)} />
              </div>
              <h5>Filter bar</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="Surface transparency" value={Math.round((1 - Number(theme.filterSurfaceOpacity ?? DEFAULT_THEME.filterSurfaceOpacity)) * 100) + "%"} min="0" max="75" step="1" suffix="%" onChange={(value) => setColor("filterSurfaceOpacity", String(1 - parseFloat(value) / 100))} />
                <RangeField label="Surface blur" value={theme.filterBlurAmount || DEFAULT_THEME.filterBlurAmount} min="0" max="40" step="1" suffix="px" onChange={(value) => setColor("filterBlurAmount", value)} />
              </div>
              <h5>Footer</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="Surface transparency" value={Math.round((1 - Number(theme.footerSurfaceOpacity ?? DEFAULT_THEME.footerSurfaceOpacity)) * 100) + "%"} min="0" max="75" step="1" suffix="%" onChange={(value) => setColor("footerSurfaceOpacity", String(1 - parseFloat(value) / 100))} />
                <RangeField label="Surface blur" value={theme.footerBlurAmount || DEFAULT_THEME.footerBlurAmount} min="0" max="40" step="1" suffix="px" onChange={(value) => setColor("footerBlurAmount", value)} />
              </div>
              <h5>{isMisterApp ? "Main sidebar" : "Library sidebar"}</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="Surface transparency" value={Math.round((1 - Number(theme.mediaSidebarSurfaceOpacity ?? DEFAULT_THEME.mediaSidebarSurfaceOpacity)) * 100) + "%"} min="0" max="80" step="1" suffix="%" onChange={(value) => setColor("mediaSidebarSurfaceOpacity", String(1 - parseFloat(value) / 100))} />
                <RangeField label="Surface blur" value={theme.mediaSidebarBlurAmount || DEFAULT_THEME.mediaSidebarBlurAmount} min="0" max="40" step="1" suffix="px" onChange={(value) => setColor("mediaSidebarBlurAmount", value)} />
              </div>
              <h5>Settings sidebar</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="Surface transparency" value={Math.round((1 - Number(theme.settingsSidebarSurfaceOpacity ?? DEFAULT_THEME.settingsSidebarSurfaceOpacity)) * 100) + "%"} min="0" max="80" step="1" suffix="%" onChange={(value) => setColor("settingsSidebarSurfaceOpacity", String(1 - parseFloat(value) / 100))} />
                <RangeField label="Surface blur" value={theme.settingsSidebarBlurAmount || DEFAULT_THEME.settingsSidebarBlurAmount} min="0" max="40" step="1" suffix="px" onChange={(value) => setColor("settingsSidebarBlurAmount", value)} />
              </div>
              <h5>Dropdown menus</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="Menu blur" value={theme.dropdownBlurAmount || DEFAULT_THEME.dropdownBlurAmount} min="0" max="40" step="1" suffix="px" onChange={(value) => setColor("dropdownBlurAmount", value)} />
              </div>
              <h5>Popup overlay</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="Background blur" value={theme.modalBackdropBlurAmount || DEFAULT_THEME.modalBackdropBlurAmount} min="0" max="48" step="1" suffix="px" onChange={(value) => setColor("modalBackdropBlurAmount", value)} />
              </div>
            </div>
          </SettingsAccordionPanel>
          <button type="button" className="color-section-toggle shadow-section-toggle" aria-expanded={shadowsExpanded} onClick={() => setShadowsExpanded((value) => !value)}>
            <span className="appearance-section-title"><span className="appearance-section-glyph appearance-shadows-glyph" aria-hidden="true" /><span>Shadows</span></span>
            <span className={shadowsExpanded ? "color-section-chevron expanded" : "color-section-chevron"} aria-hidden="true" />
          </button>
          <SettingsAccordionPanel expanded={shadowsExpanded}>
            <div className="shape-depth-content">
              <h5>App window</h5>
              <div className="effects-grid shape-depth-grid">
                {theme.appStyle === "macos9platinum" ? (<>
                  <ToggleField label="Enable window shadow" checked={themeToggleEnabled(theme.mac9WindowShadowEnabled ?? DEFAULT_THEME.mac9WindowShadowEnabled)} onChange={(value) => setColor("mac9WindowShadowEnabled", value)} className="shadow-toggle-row" />
                  {[
                    ["Horizontal offset", "mac9WindowShadowOffsetX"],
                    ["Vertical offset", "mac9WindowShadowOffsetY"],
                    ["Blur", "mac9WindowShadowBlur"],
                  ].map(([label, key]) => (
                    <label className="appearance-control" key={key}>
                      <span>{label}</span>
                      <CustomSelect
                        value={theme[key] || DEFAULT_THEME[key]}
                        onChange={(value) => setColor(key, value)}
                        ariaLabel={`Platinum ${label.toLowerCase()}`}
                        options={[1, 2, 3, 4].map((size) => ({ value: `${size}px`, label: `${size} px` }))}
                      />
                    </label>
                  ))}
                  <RangeField label="Shadow transparency" value={(100 - parseFloat(theme.mac9WindowShadowOpacity || DEFAULT_THEME.mac9WindowShadowOpacity)) + "%"} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("mac9WindowShadowOpacity", (100 - parseFloat(value)) + "%")} />
                </>) : (<>
                <ToggleField label="Enable shadow" checked={themeToggleEnabled(theme.appWindowShadowEnabled)} onChange={(value) => setColor("appWindowShadowEnabled", value)} className="shadow-toggle-row" />
                <RangeField label="Shadow margin" value={theme.appWindowShadowMargin || DEFAULT_THEME.appWindowShadowMargin} min="0" max="40" step="1" suffix="px" onChange={(value) => setColor("appWindowShadowMargin", value)} />
                <RangeField label="Horizontal offset" value={theme.appWindowShadowOffsetX || DEFAULT_THEME.appWindowShadowOffsetX} min="-24" max="24" step="1" suffix="px" onChange={(value) => setColor("appWindowShadowOffsetX", value)} />
                <RangeField label="Vertical offset" value={theme.appWindowShadowOffsetY || DEFAULT_THEME.appWindowShadowOffsetY} min="-16" max="24" step="1" suffix="px" onChange={(value) => setColor("appWindowShadowOffsetY", value)} />
                <RangeField label="Gaussian blur" value={theme.appWindowShadowBlur || DEFAULT_THEME.appWindowShadowBlur} min="0" max="56" step="1" suffix="px" onChange={(value) => setColor("appWindowShadowBlur", value)} />
                <RangeField label="Spread" value={theme.appWindowShadowSpread || DEFAULT_THEME.appWindowShadowSpread} min="-8" max="24" step="1" suffix="px" onChange={(value) => setColor("appWindowShadowSpread", value)} />
                <RangeField label="Focused shadow transparency" value={(100 - parseFloat(theme.appWindowShadowOpacity || DEFAULT_THEME.appWindowShadowOpacity)) + "%"} min="0" max="100" step="5" suffix="%" onChange={(value) => setColor("appWindowShadowOpacity", (100 - parseFloat(value)) + "%")} />
                <RangeField label="Unfocused shadow transparency" value={(100 - parseFloat(theme.appWindowUnfocusedShadowOpacity || DEFAULT_THEME.appWindowUnfocusedShadowOpacity)) + "%"} min="0" max="100" step="5" suffix="%" onChange={(value) => setColor("appWindowUnfocusedShadowOpacity", (100 - parseFloat(value)) + "%")} />
                <ColorField label="Focused shadow color" value={theme.appWindowShadowColor || DEFAULT_THEME.appWindowShadowColor} onChange={(value) => setColor("appWindowShadowColor", value)} />
                <ColorField label="Unfocused shadow color" value={theme.appWindowUnfocusedShadowColor || DEFAULT_THEME.appWindowUnfocusedShadowColor} onChange={(value) => setColor("appWindowUnfocusedShadowColor", value)} />
                </>)}
              </div>
              {theme.appStyle === "macos9platinum" && (<>
                <h5>Window chrome</h5>
                <div className="effects-grid shape-depth-grid">
                  <ToggleField label="Enable chrome shadow" checked={themeToggleEnabled(theme.mac9ChromeShadowEnabled ?? DEFAULT_THEME.mac9ChromeShadowEnabled)} onChange={(value) => setColor("mac9ChromeShadowEnabled", value)} className="shadow-toggle-row" />
                  {[
                    ["Horizontal offset", "mac9ChromeShadowOffsetX"],
                    ["Vertical offset", "mac9ChromeShadowOffsetY"],
                    ["Blur", "mac9ChromeShadowBlur"],
                  ].map(([label, key]) => (
                    <label className="appearance-control" key={key}>
                      <span>{label}</span>
                      <CustomSelect
                        value={theme[key] || DEFAULT_THEME[key]}
                        onChange={(value) => setColor(key, value)}
                        ariaLabel={`Platinum chrome ${label.toLowerCase()}`}
                        options={[1, 2, 3, 4].map((size) => ({ value: `${size}px`, label: `${size} px` }))}
                      />
                    </label>
                  ))}
                  <RangeField label="Chrome shadow transparency" value={(100 - parseFloat(theme.mac9ChromeShadowOpacity || DEFAULT_THEME.mac9ChromeShadowOpacity)) + "%"} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("mac9ChromeShadowOpacity", (100 - parseFloat(value)) + "%")} />
                </div>
              </>)}
              <ShadowSettingsGroup title="Popup windows" prefix="popup" theme={theme} onChange={setColor} />
              <ShadowSettingsGroup title="Dropdown menus" prefix="dropdown" theme={theme} onChange={setColor} />
              <h5>Sidebar depth</h5>
              <div className="effects-grid shape-depth-grid sidebar-shadow-controls">
                <ToggleField label="Enable sidebar shadow" checked={themeToggleEnabled(theme.mediaSidebarShadowEnabled ?? DEFAULT_THEME.mediaSidebarShadowEnabled)} onChange={(value) => setColor("mediaSidebarShadowEnabled", value)} className="shadow-toggle-row" />
                <RangeField label="Shadow width" value={theme.mediaSidebarShadowWidth || DEFAULT_THEME.mediaSidebarShadowWidth} min="0" max="120" step="1" suffix="px" onChange={(value) => setColor("mediaSidebarShadowWidth", value)} />
                <RangeField label="Softness" value={theme.mediaSidebarShadowBlur || DEFAULT_THEME.mediaSidebarShadowBlur} min="0" max="80" step="1" suffix="px" onChange={(value) => setColor("mediaSidebarShadowBlur", value)} />
                <RangeField label="Horizontal bias" value={theme.mediaSidebarShadowOffsetX || DEFAULT_THEME.mediaSidebarShadowOffsetX} min="-32" max="32" step="1" suffix="px" onChange={(value) => setColor("mediaSidebarShadowOffsetX", value)} />
                <RangeField label="Vertical offset" value={theme.mediaSidebarShadowOffsetY || DEFAULT_THEME.mediaSidebarShadowOffsetY} min="-32" max="32" step="1" suffix="px" onChange={(value) => setColor("mediaSidebarShadowOffsetY", value)} />
                <RangeField label="Shadow transparency" value={(100 - parseFloat(theme.mediaSidebarShadowOpacity || DEFAULT_THEME.mediaSidebarShadowOpacity)) + "%"} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("mediaSidebarShadowOpacity", (100 - parseFloat(value)) + "%")} />
                <ColorField label="Shadow color" value={theme.mediaSidebarShadowColor || DEFAULT_THEME.mediaSidebarShadowColor} onChange={(value) => setColor("mediaSidebarShadowColor", value)} />
              </div>
              <h5>Sidebar highlight</h5>
              <div className="effects-grid shape-depth-grid sidebar-highlight-controls sidebar-gradient-controls">
                <ToggleField label="Enable sidebar highlight" checked={themeToggleEnabled(theme.mediaSidebarGradientEnabled ?? DEFAULT_THEME.mediaSidebarGradientEnabled)} onChange={(value) => setColor("mediaSidebarGradientEnabled", value)} className="shadow-toggle-row" />
                <RangeField label="Highlight width" value={theme.mediaSidebarGradientWidth || DEFAULT_THEME.mediaSidebarGradientWidth} min="0" max="240" step="1" suffix="px" onChange={(value) => setColor("mediaSidebarGradientWidth", value)} />
                <RangeField label="Highlight height" value={theme.mediaSidebarGradientHeight || DEFAULT_THEME.mediaSidebarGradientHeight} min="20" max="120" step="1" suffix="%" onChange={(value) => setColor("mediaSidebarGradientHeight", value)} />
                <RangeField label="Softness" value={theme.mediaSidebarGradientBlur || DEFAULT_THEME.mediaSidebarGradientBlur} min="0" max="100" step="1" suffix="px" onChange={(value) => setColor("mediaSidebarGradientBlur", value)} />
                <RangeField label="Horizontal bias" value={theme.mediaSidebarGradientOffsetX || DEFAULT_THEME.mediaSidebarGradientOffsetX} min="-80" max="80" step="1" suffix="px" onChange={(value) => setColor("mediaSidebarGradientOffsetX", value)} />
                <RangeField label="Vertical offset" value={theme.mediaSidebarGradientOffsetY || DEFAULT_THEME.mediaSidebarGradientOffsetY} min="-80" max="80" step="1" suffix="px" onChange={(value) => setColor("mediaSidebarGradientOffsetY", value)} />
                <RangeField label="Highlight transparency" value={(100 - parseFloat(theme.mediaSidebarGradientOpacity || DEFAULT_THEME.mediaSidebarGradientOpacity)) + "%"} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("mediaSidebarGradientOpacity", (100 - parseFloat(value)) + "%")} />
                <ColorField label="Highlight color" value={theme.mediaSidebarGradientColor || DEFAULT_THEME.mediaSidebarGradientColor} onChange={(value) => setColor("mediaSidebarGradientColor", value)} />
              </div>
              <h5>{isMisterApp ? "Panels and cards" : "Grid cards"}</h5>
              <div className="effects-grid shape-depth-grid">
                <ToggleField label="Enable shadow" checked={themeToggleEnabled(theme.cardShadowEnabled)} onChange={(value) => setColor("cardShadowEnabled", value)} className="shadow-toggle-row" />
                <RangeField label="Shadow size" value={theme.cardShadowSize || DEFAULT_THEME.cardShadowSize} min="-8" max="20" step="1" suffix="px" onChange={(value) => setColor("cardShadowSize", value)} />
                <RangeField label="Gaussian blur" value={theme.cardShadowBlur || DEFAULT_THEME.cardShadowBlur} min="0" max="48" step="1" suffix="px" onChange={(value) => setColor("cardShadowBlur", value)} />
                <RangeField label="Shadow transparency" value={(100 - parseFloat(theme.cardShadowOpacity || DEFAULT_THEME.cardShadowOpacity)) + "%"} min="0" max="100" step="5" suffix="%" onChange={(value) => setColor("cardShadowOpacity", (100 - parseFloat(value)) + "%")} />
                <ColorField label="Shadow color" value={theme.cardShadowColor || DEFAULT_THEME.cardShadowColor} onChange={(value) => setColor("cardShadowColor", value)} />
              </div>
              <h5>Header</h5>
              <div className="effects-grid shape-depth-grid">
                <ToggleField label="Enable shadow" checked={themeToggleEnabled(theme.headerShadowEnabled)} onChange={(value) => setColor("headerShadowEnabled", value)} className="shadow-toggle-row" />
                <RangeField label="Shadow size" value={theme.headerShadowSize || DEFAULT_THEME.headerShadowSize} min="-8" max="20" step="1" suffix="px" onChange={(value) => setColor("headerShadowSize", value)} />
                <RangeField label="Gaussian blur" value={theme.headerShadowBlur || DEFAULT_THEME.headerShadowBlur} min="0" max="48" step="1" suffix="px" onChange={(value) => setColor("headerShadowBlur", value)} />
                <RangeField label="Shadow transparency" value={(100 - parseFloat(theme.headerShadowOpacity || DEFAULT_THEME.headerShadowOpacity)) + "%"} min="0" max="100" step="5" suffix="%" onChange={(value) => setColor("headerShadowOpacity", (100 - parseFloat(value)) + "%")} />
                <ColorField label="Shadow color" value={theme.headerShadowColor || DEFAULT_THEME.headerShadowColor} onChange={(value) => setColor("headerShadowColor", value)} />
              </div>
              <h5>Filter bar</h5>
              <div className="effects-grid shape-depth-grid">
                <ToggleField label="Enable shadow" checked={themeToggleEnabled(theme.filterShadowEnabled)} onChange={(value) => setColor("filterShadowEnabled", value)} className="shadow-toggle-row" />
                <RangeField label="Shadow size" value={theme.filterShadowSize || DEFAULT_THEME.filterShadowSize} min="-8" max="20" step="1" suffix="px" onChange={(value) => setColor("filterShadowSize", value)} />
                <RangeField label="Gaussian blur" value={theme.filterShadowBlur || DEFAULT_THEME.filterShadowBlur} min="0" max="48" step="1" suffix="px" onChange={(value) => setColor("filterShadowBlur", value)} />
                <RangeField label="Shadow transparency" value={(100 - parseFloat(theme.filterShadowOpacity || DEFAULT_THEME.filterShadowOpacity)) + "%"} min="0" max="100" step="5" suffix="%" onChange={(value) => setColor("filterShadowOpacity", (100 - parseFloat(value)) + "%")} />
                <ColorField label="Shadow color" value={theme.filterShadowColor || DEFAULT_THEME.filterShadowColor} onChange={(value) => setColor("filterShadowColor", value)} />
              </div>
              <h5>Footer</h5>
              <div className="effects-grid shape-depth-grid">
                <ToggleField label="Enable shadow" checked={themeToggleEnabled(theme.footerShadowEnabled)} onChange={(value) => setColor("footerShadowEnabled", value)} className="shadow-toggle-row" />
                <RangeField label="Shadow size" value={theme.footerShadowSize || DEFAULT_THEME.footerShadowSize} min="-8" max="20" step="1" suffix="px" onChange={(value) => setColor("footerShadowSize", value)} />
                <RangeField label="Gaussian blur" value={theme.footerShadowBlur || DEFAULT_THEME.footerShadowBlur} min="0" max="48" step="1" suffix="px" onChange={(value) => setColor("footerShadowBlur", value)} />
                <RangeField label="Shadow transparency" value={(100 - parseFloat(theme.footerShadowOpacity || DEFAULT_THEME.footerShadowOpacity)) + "%"} min="0" max="100" step="5" suffix="%" onChange={(value) => setColor("footerShadowOpacity", (100 - parseFloat(value)) + "%")} />
                <ColorField label="Shadow color" value={theme.footerShadowColor || DEFAULT_THEME.footerShadowColor} onChange={(value) => setColor("footerShadowColor", value)} />
              </div>
            </div>
          </SettingsAccordionPanel>
          <button type="button" className="color-section-toggle shape-section-toggle" aria-expanded={shapeExpanded} onClick={() => setShapeExpanded((value) => !value)}>
            <span className="appearance-section-title"><span className="appearance-section-glyph appearance-shape-glyph" aria-hidden="true" /><span>Shape</span></span>
            <span className={shapeExpanded ? "color-section-chevron expanded" : "color-section-chevron"} aria-hidden="true" />
          </button>
          <SettingsAccordionPanel expanded={shapeExpanded}>
            <div className="shape-depth-content">
              <h5>Top header</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="Header height" value={theme.headerHeight || DEFAULT_THEME.headerHeight} min="24" max="90" step="1" suffix="px" onChange={(value) => setColor("headerHeight", value)} />
                <RangeField label="Header horizontal padding" value={theme.headerPaddingX || DEFAULT_THEME.headerPaddingX} min="0" max="36" step="1" suffix="px" onChange={(value) => setColor("headerPaddingX", value)} />
                <RangeField label="Header vertical padding" value={theme.headerPaddingY || DEFAULT_THEME.headerPaddingY} min="0" max="28" step="1" suffix="px" onChange={(value) => setColor("headerPaddingY", value)} />
              </div>
              <h5>Window frames</h5>
              <div className="effects-grid shape-depth-grid">
                <label className="appearance-control">
                  <span>App window border thickness</span>
                  <CustomSelect
                    value={`${Math.max(0, Math.min(2, Math.round(Number.parseFloat(theme.appWindowBorderWidth || DEFAULT_THEME.appWindowBorderWidth) || 0)))}px`}
                    onChange={(value) => setColor("appWindowBorderWidth", value)}
                    ariaLabel="App window border thickness"
                    options={[
                      { value: "0px", label: "0 px (off)" },
                      { value: "1px", label: "1 px" },
                      { value: "2px", label: "2 px" },
                    ]}
                  />
                </label>
                <RangeField label="App window radius" value={theme.appWindowRadius || DEFAULT_THEME.appWindowRadius} min="0" max="32" step="0.5" suffix="px" onChange={(value) => setColor("appWindowRadius", value)} />
                <ToggleField label="App window inner glow" checked={themeToggleEnabled(theme.appWindowInnerGlowEnabled ?? DEFAULT_THEME.appWindowInnerGlowEnabled)} onChange={(value) => setColor("appWindowInnerGlowEnabled", value)} className="app-window-inner-glow-toggle" />
                <RangeField label="Popup/modal radius" value={theme.modalRadius || theme.windowRadius || DEFAULT_THEME.modalRadius || DEFAULT_THEME.windowRadius} min="0" max="28" step="0.5" suffix="px" onChange={(value) => { setColor("modalRadius", value); setColor("windowRadius", value); }} />
                <RangeField label="Dropdown menu radius" value={theme.dropdownMenuRadius || DEFAULT_THEME.dropdownMenuRadius || theme.cardRadius || DEFAULT_THEME.cardRadius} min="0" max="28" step="0.5" suffix="px" onChange={(value) => setColor("dropdownMenuRadius", value)} />
              </div>
              <h5>{isMisterApp ? "Panels and cards" : "Cards and artwork"}</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="Grid card border thickness" value={theme.cardBorderWidth || DEFAULT_THEME.cardBorderWidth} min="0" max="5" step="0.5" suffix="px" onChange={(value) => setColor("cardBorderWidth", value)} />
                <RangeField label="Page header radius" value={theme.pageHeaderRadius || DEFAULT_THEME.pageHeaderRadius || theme.cardRadius || DEFAULT_THEME.cardRadius} min="0" max="24" step="0.5" suffix="px" onChange={(value) => setColor("pageHeaderRadius", value)} />
                <RangeField label="Panel/card radius" value={theme.cardRadius || DEFAULT_THEME.cardRadius} min="0" max="24" step="0.5" suffix="px" onChange={(value) => setColor("cardRadius", value)} />
                <RangeField label="Panel header radius" value={theme.panelHeaderRadius || DEFAULT_THEME.panelHeaderRadius || theme.cardRadius || DEFAULT_THEME.cardRadius} min="0" max="24" step="0.5" suffix="px" onChange={(value) => setColor("panelHeaderRadius", value)} />
                <RangeField label="List row radius" value={theme.listItemRadius || DEFAULT_THEME.listItemRadius || theme.controlRadius || DEFAULT_THEME.controlRadius} min="0" max="24" step="0.5" suffix="px" onChange={(value) => setColor("listItemRadius", value)} />
                <RangeField label="Progress bar radius" value={theme.progressRadius || DEFAULT_THEME.progressRadius || theme.controlRadius || DEFAULT_THEME.controlRadius} min="0" max="24" step="0.5" suffix="px" onChange={(value) => setColor("progressRadius", value)} />
                {!isMisterApp && <RangeField label="Artwork radius" value={theme.posterRadius || DEFAULT_THEME.posterRadius} min="0" max="24" step="0.5" suffix="px" onChange={(value) => setColor("posterRadius", value)} />}
              </div>
              <h5>Controls</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="General control radius" value={theme.controlRadius || DEFAULT_THEME.controlRadius} min="0" max="24" step="0.5" suffix="px" onChange={(value) => setColor("controlRadius", value)} />
                <RangeField label="Button radius" value={theme.buttonRadius || DEFAULT_THEME.buttonRadius || theme.controlRadius || DEFAULT_THEME.controlRadius} min="0" max="24" step="0.5" suffix="px" onChange={(value) => setColor("buttonRadius", value)} />
                <RangeField label="Text box radius" value={theme.textBoxRadius || DEFAULT_THEME.textBoxRadius} min="0" max="24" step="0.5" suffix="px" onChange={(value) => setColor("textBoxRadius", value)} />
                <RangeField label="Dropdown item radius" value={theme.dropdownItemRadius || DEFAULT_THEME.dropdownItemRadius} min="0" max="24" step="0.5" suffix="px" onChange={(value) => setColor("dropdownItemRadius", value)} />
                <RangeField label="Toggle track radius" value={theme.toggleRadius || DEFAULT_THEME.toggleRadius} min="0" max="11" step="1" suffix="px" onChange={(value) => setColor("toggleRadius", value)} />
                <RangeField label="Toggle thumb radius" value={theme.toggleThumbRadius || DEFAULT_THEME.toggleThumbRadius} min="0" max="8" step="1" suffix="px" onChange={(value) => setColor("toggleThumbRadius", value)} />
                <RangeField label="Checkbox radius" value={theme.checkboxRadius || DEFAULT_THEME.checkboxRadius} min="0" max="9" step="1" suffix="px" onChange={(value) => setColor("checkboxRadius", value)} />
                <RangeField label={isMisterApp ? "Main sidebar panel radius" : "Library sidebar panel radius"} value={theme.mediaSidebarRadius || DEFAULT_THEME.mediaSidebarRadius || theme.appWindowRadius || DEFAULT_THEME.appWindowRadius} min="0" max="32" step="0.5" suffix="px" onChange={(value) => setColor("mediaSidebarRadius", value)} />
                <RangeField label={isMisterApp ? "Main sidebar button radius" : "Library sidebar button radius"} value={theme.mediaSidebarButtonRadius || DEFAULT_THEME.mediaSidebarButtonRadius} min="0" max="24" step="0.5" suffix="px" onChange={(value) => setColor("mediaSidebarButtonRadius", value)} />
              </div>
              {appContext !== "mister" && (<>
              <h5>Badges and counters</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="Badge radius" value={theme.badgeRadius || DEFAULT_THEME.badgeRadius} min="0" max="14" step="1" suffix="px" onChange={(value) => setColor("badgeRadius", value)} />
                <RangeField label="Footer count border thickness" value={theme.footerCountBorderWidth || DEFAULT_THEME.footerCountBorderWidth} min="0" max="5" step="0.5" suffix="px" onChange={(value) => setColor("footerCountBorderWidth", value)} />
                <RangeField label="Footer count radius" value={theme.footerCountRadius || DEFAULT_THEME.footerCountRadius} min="0" max="24" step="1" suffix="px" onChange={(value) => setColor("footerCountRadius", value)} />
              </div>
              </>)}
              <h5>Layout density</h5>
              <div className="effects-grid shape-depth-grid">
                <ToggleField label="Compact header" checked={themeToggleEnabled(theme.compactHeaderEnabled ?? DEFAULT_THEME.compactHeaderEnabled)} onChange={(value) => setColor("compactHeaderEnabled", value)} className="compact-header-toggle" />
                <ToggleField label="Compact filter bar" checked={themeToggleEnabled(theme.compactFilterBarEnabled ?? DEFAULT_THEME.compactFilterBarEnabled)} onChange={(value) => setColor("compactFilterBarEnabled", value)} className="compact-filter-toggle" />
                <ToggleField label="Compact footer" checked={themeToggleEnabled(theme.compactFooterEnabled ?? DEFAULT_THEME.compactFooterEnabled)} onChange={(value) => setColor("compactFooterEnabled", value)} className="compact-footer-toggle" />
                <ToggleField label="Comfortable list spacing" checked={listRoomy} onChange={onListRoomyChange} className="list-padding-toggle" />
                <ToggleField label="Clean settings sidebar" checked={themeToggleEnabled(theme.cleanSidebarEnabled)} onChange={(value) => setColor("cleanSidebarEnabled", value)} className="clean-sidebar-toggle" />
              </div>
              <h5>Sidebars</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="Main sidebar width" value={theme.mediaSidebarWidth || DEFAULT_THEME.mediaSidebarWidth} min="190" max="320" step="1" suffix="px" onChange={(value) => setColor("mediaSidebarWidth", value)} />
                <RangeField label="Main sidebar horizontal padding" value={theme.mediaSidebarPaddingX || DEFAULT_THEME.mediaSidebarPaddingX} min="0" max="28" step="1" suffix="px" onChange={(value) => setColor("mediaSidebarPaddingX", value)} />
                <RangeField label="Main sidebar vertical padding" value={theme.mediaSidebarPaddingY || DEFAULT_THEME.mediaSidebarPaddingY} min="0" max="28" step="1" suffix="px" onChange={(value) => setColor("mediaSidebarPaddingY", value)} />
                <RangeField label="Settings sidebar width" value={theme.settingsSidebarWidth || DEFAULT_THEME.settingsSidebarWidth} min="190" max="320" step="1" suffix="px" onChange={(value) => setColor("settingsSidebarWidth", value)} />
                <RangeField label="Settings sidebar horizontal padding" value={theme.settingsSidebarPaddingX || DEFAULT_THEME.settingsSidebarPaddingX} min="0" max="28" step="1" suffix="px" onChange={(value) => setColor("settingsSidebarPaddingX", value)} />
                <RangeField label="Settings sidebar vertical padding" value={theme.settingsSidebarPaddingY || DEFAULT_THEME.settingsSidebarPaddingY} min="0" max="28" step="1" suffix="px" onChange={(value) => setColor("settingsSidebarPaddingY", value)} />
              </div>
              <h5>Sliders</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="Track height" value={theme.sliderTrackHeight || DEFAULT_THEME.sliderTrackHeight} min="2" max="16" step="1" suffix="px" onChange={(value) => setColor("sliderTrackHeight", value)} />
                <RangeField label="Thumb size" value={theme.sliderThumbSize || DEFAULT_THEME.sliderThumbSize} min="10" max="32" step="1" suffix="px" onChange={(value) => setColor("sliderThumbSize", value)} />
                <RangeField label="Thumb border size" value={theme.sliderThumbBorderWidth || DEFAULT_THEME.sliderThumbBorderWidth} min="0" max="6" step="1" suffix="px" onChange={(value) => setColor("sliderThumbBorderWidth", value)} />
                <RangeField label="Background height" value={theme.sliderBackgroundHeight || DEFAULT_THEME.sliderBackgroundHeight} min="30" max="72" step="1" suffix="px" onChange={(value) => setColor("sliderBackgroundHeight", value)} />
                <RangeField label="Background border size" value={theme.sliderBorderWidth || DEFAULT_THEME.sliderBorderWidth} min="0" max="4" step="1" suffix="px" onChange={(value) => setColor("sliderBorderWidth", value)} />
                <RangeField label="Horizontal padding" value={theme.sliderPaddingX || DEFAULT_THEME.sliderPaddingX} min="0" max="28" step="1" suffix="px" onChange={(value) => setColor("sliderPaddingX", value)} />
                <RangeField label="Vertical padding" value={theme.sliderPaddingY || DEFAULT_THEME.sliderPaddingY} min="0" max="22" step="1" suffix="px" onChange={(value) => setColor("sliderPaddingY", value)} />
              </div>
              <h5>Color picker</h5>
              <div className="effects-grid shape-depth-grid">
                <RangeField label="Circle border size" value={theme.colorPickerBorderWidth || DEFAULT_THEME.colorPickerBorderWidth} min="0" max="6" step="1" suffix="px" onChange={(value) => setColor("colorPickerBorderWidth", value)} />
              </div>
              <h5>Scrollbars</h5>
              <div className="effects-grid shape-depth-grid">
                {theme.appStyle === "macos9platinum" ? (
                  <ToggleField label="Place both arrow buttons at bottom" checked={themeToggleEnabled(theme.mac9ScrollbarButtonsAtBottom ?? DEFAULT_THEME.mac9ScrollbarButtonsAtBottom)} onChange={(value) => setColor("mac9ScrollbarButtonsAtBottom", value)} />
                ) : (<>
                  <RangeField label="Thickness" value={theme.scrollbarThickness || DEFAULT_THEME.scrollbarThickness} min="3" max="14" step="1" suffix="px" onChange={(value) => setColor("scrollbarThickness", value)} />
                  <RangeField label="Radius" value={theme.scrollbarRadius || DEFAULT_THEME.scrollbarRadius} min="0" max="14" step="1" suffix="px" onChange={(value) => setColor("scrollbarRadius", value)} />
                  <RangeField label="Right edge padding" value={theme.scrollbarEdgePadding || DEFAULT_THEME.scrollbarEdgePadding} min="0" max="28" step="1" suffix="px" onChange={(value) => setColor("scrollbarEdgePadding", value)} />
                  <RangeField label="Top/bottom height padding" value={theme.scrollbarBlockPadding || DEFAULT_THEME.scrollbarBlockPadding || DEFAULT_THEME.scrollbarEdgePadding} min="0" max="40" step="1" suffix="px" onChange={(value) => setColor("scrollbarBlockPadding", value)} />
                  <RangeField label="Dropdown edge padding" value={theme.dropdownScrollbarPadding || DEFAULT_THEME.dropdownScrollbarPadding} min="0" max="20" step="1" suffix="px" onChange={(value) => setColor("dropdownScrollbarPadding", value)} />
                </>)}
              </div>
            </div>
          </SettingsAccordionPanel>
          <button type="button" className="color-section-toggle glow-section-toggle" aria-expanded={glowExpanded} onClick={() => setGlowExpanded((value) => !value)}>
            <span className="appearance-section-title"><span className="appearance-section-glyph appearance-glow-glyph" aria-hidden="true" /><span>Glow</span></span>
            <span className={glowExpanded ? "color-section-chevron expanded" : "color-section-chevron"} aria-hidden="true" />
          </button>
          <SettingsAccordionPanel expanded={glowExpanded}>
            <div className="glow-settings-content">
              <section className="appearance-control-group">
                <h4>Surfaces</h4>
                <GlowSettingsGroup title={isMisterApp ? "Panels and cards" : "Grid cards"} prefix="card" theme={theme} onChange={setColor} hover />
                {!isMisterApp && <GlowSettingsGroup title="Artwork" prefix="poster" theme={theme} onChange={setColor} hover />}
                <GlowSettingsGroup title="Header" prefix="header" theme={theme} onChange={setColor} />
                <GlowSettingsGroup title="Filter bar" prefix="filter" theme={theme} onChange={setColor} />
                <GlowSettingsGroup title="Footer" prefix="footer" theme={theme} onChange={setColor} />
                <GlowSettingsGroup title="Windows" prefix="window" theme={theme} onChange={setColor} />
                <GlowSettingsGroup title="Settings sidebar" prefix="sidebar" theme={theme} onChange={setColor} />
              </section>
              <section className="appearance-control-group">
                <h4>Controls and components</h4>
                <GlowSettingsGroup title="Buttons and controls" prefix="control" theme={theme} onChange={setColor} hover />
                <GlowSettingsGroup title="Text boxes" prefix="textBox" theme={theme} onChange={setColor} hover />
                <GlowSettingsGroup title="Dropdown menus" prefix="dropdown" theme={theme} onChange={setColor} hover />
                <GlowSettingsGroup title="Panels and groups" prefix="panel" theme={theme} onChange={setColor} hover />
                {appContext !== "mister" && <GlowSettingsGroup title="Tags and badges" prefix="badge" theme={theme} onChange={setColor} hover />}
                <GlowSettingsGroup title="Sliders" prefix="slider" theme={theme} onChange={setColor} hover />
                <GlowSettingsGroup title="Scrollbars" prefix="scrollbar" theme={theme} onChange={setColor} hover />
              </section>
              <section className="appearance-control-group">
                <h4>Content</h4>
                <GlowSettingsGroup title="Text" prefix="text" theme={theme} onChange={setColor} />
                <GlowSettingsGroup title="Glyphs and icons" prefix="glyph" theme={theme} onChange={setColor} hover />
                <GlowSettingsGroup title="Logo" prefix="logo" theme={theme} onChange={setColor} hover />
              </section>
            </div>
          </SettingsAccordionPanel>
          </>)}
        </section>
        )}

        {settingsSection === "special-theme" && isSpecialEraStyle && (
        <section className="settings-panel special-theme-settings-panel">
          <SettingsSectionHeading
            title={`${specialThemeName} controls`}
            description={isWindows9XStyle
              ? "Controls that matter for the Windows 9X shell treatment. Modern blur, glow, radius, and motion controls are intentionally ignored by this style."
              : "Controls that matter for the Mac OS 9 Platinum shell treatment. The Platinum chrome uses a fixed classic structure, so modern blur, glow, radius, and motion controls are intentionally ignored."}
          />
          {isWindows9XStyle && (
            <>
              <div className="special-theme-audit-note">
                <strong>Windows 9X shell rules</strong>
                <span>Squared controls, beveled panels, compact rows, classic title bar, no modern blur, no radius, and minimal motion.</span>
              </div>
              <div className="settings-grid special-theme-settings-grid">
                <section className="settings-section">
                  <h3>Title bar</h3>
                  <RangeField label="Title bar height" value={theme.headerHeight || DEFAULT_THEME.headerHeight} min="18" max="34" step="1" suffix="px" onChange={(value) => setColor("headerHeight", value)} />
                  <ColorField label="Gradient start" value={theme.headerGradientStartColor || DEFAULT_THEME.headerGradientStartColor} onChange={(value) => setColor("headerGradientStartColor", value)} />
                  <ColorField label="Gradient end" value={theme.headerGradientEndColor || DEFAULT_THEME.headerGradientEndColor} onChange={(value) => setColor("headerGradientEndColor", value)} />
                </section>
                <section className="settings-section">
                  <h3>Sidebar</h3>
                  <RangeField label="Sidebar width" value={theme.mediaSidebarWidth || DEFAULT_THEME.mediaSidebarWidth} min="180" max="280" step="1" suffix="px" onChange={(value) => setColor("mediaSidebarWidth", value)} />
                  <RangeField label="Sidebar horizontal padding" value={theme.mediaSidebarPaddingX || DEFAULT_THEME.mediaSidebarPaddingX} min="0" max="24" step="1" suffix="px" onChange={(value) => setColor("mediaSidebarPaddingX", value)} />
                  <RangeField label="Sidebar vertical padding" value={theme.mediaSidebarPaddingY || DEFAULT_THEME.mediaSidebarPaddingY} min="0" max="24" step="1" suffix="px" onChange={(value) => setColor("mediaSidebarPaddingY", value)} />
                  <ColorField label="Selected button" value={theme.mediaSidebarButtonActiveBackgroundColor || DEFAULT_THEME.mediaSidebarButtonActiveBackgroundColor} onChange={(value) => setColor("mediaSidebarButtonActiveBackgroundColor", value)} />
                </section>
                <section className="settings-section">
                  <h3>Classic bevels</h3>
                  <RangeField label="Panel border thickness" value={theme.cardBorderWidth || DEFAULT_THEME.cardBorderWidth} min="1" max="4" step="1" suffix="px" onChange={(value) => setColor("cardBorderWidth", value)} />
                  <RangeField label="Scrollbar thickness" value={theme.scrollbarThickness || DEFAULT_THEME.scrollbarThickness} min="12" max="20" step="1" suffix="px" onChange={(value) => setColor("scrollbarThickness", value)} />
                  <ToggleField label="Disable interface animations" checked={!themeToggleEnabled(theme.pageTransitionsEnabled ?? DEFAULT_THEME.pageTransitionsEnabled)} onChange={(value) => { setColor("pageTransitionsEnabled", !value); setColor("buttonPressAnimationEnabled", !value); setColor("modalAnimationEnabled", !value); }} />
                </section>
              </div>
            </>
          )}
          {isMacOS9PlatinumStyle && (
            <>
              <div className="special-theme-audit-note">
                <strong>Platinum shell rules</strong>
                <span>Single classic window frame, seamless title bar, true square bevels, image-based caption controls, no radius, no glow, no modern glass.</span>
              </div>
              <div className="settings-grid special-theme-settings-grid platinum-special-settings-grid">
                <section className="settings-section">
                  <h3>Window chrome</h3>
                  <ColorField label="Chrome surface" value={theme.mac9ChromeColor || DEFAULT_THEME.mac9ChromeColor} onChange={(value) => setColor("mac9ChromeColor", value)} />
                  <ColorField label="Inner content" value={theme.mac9ContentColor || DEFAULT_THEME.mac9ContentColor} onChange={(value) => setColor("mac9ContentColor", value)} />
                  <ColorField label="Active outline" value={theme.mac9WindowActiveOutlineColor || DEFAULT_THEME.mac9WindowActiveOutlineColor} onChange={(value) => setColor("mac9WindowActiveOutlineColor", value)} />
                  <ColorField label="Inactive outline" value={theme.mac9WindowInactiveOutlineColor || DEFAULT_THEME.mac9WindowInactiveOutlineColor} onChange={(value) => setColor("mac9WindowInactiveOutlineColor", value)} />
                </section>
                <section className="settings-section">
                  <h3>Panels</h3>
                  <ColorField label="Panel surface" value={theme.mac9PanelBackgroundColor || DEFAULT_THEME.mac9PanelBackgroundColor} onChange={(value) => setColor("mac9PanelBackgroundColor", value)} />
                  <ColorField label="Title backing" value={theme.mac9PanelTitleBackgroundColor || DEFAULT_THEME.mac9PanelTitleBackgroundColor} onChange={(value) => setColor("mac9PanelTitleBackgroundColor", value)} />
                  <ColorField label="Panel text" value={theme.mac9PanelTextColor || DEFAULT_THEME.mac9PanelTextColor} onChange={(value) => setColor("mac9PanelTextColor", value)} />
                  <ColorField label="Panel title text" value={theme.mac9PanelTitleTextColor || DEFAULT_THEME.mac9PanelTitleTextColor} onChange={(value) => setColor("mac9PanelTitleTextColor", value)} />
                  <ColorField label="Groove dark line" value={theme.mac9PanelGrooveShadowColor || DEFAULT_THEME.mac9PanelGrooveShadowColor} onChange={(value) => setColor("mac9PanelGrooveShadowColor", value)} />
                  <ColorField label="Inner top/left highlight" value={theme.mac9PanelInnerHighlightColor || DEFAULT_THEME.mac9PanelInnerHighlightColor} onChange={(value) => setColor("mac9PanelInnerHighlightColor", value)} />
                  <ColorField label="Outer right/bottom highlight" value={theme.mac9PanelOuterHighlightColor || DEFAULT_THEME.mac9PanelOuterHighlightColor} onChange={(value) => setColor("mac9PanelOuterHighlightColor", value)} />
                </section>
                <section className="settings-section">
                  <h3>Title bar</h3>
                  <RangeField label="Title font size" value={theme.titlebarFontSize || DEFAULT_THEME.titlebarFontSize} min="10" max="18" step="1" suffix="px" onChange={(value) => setColor("titlebarFontSize", value)} />
                  <ColorField label="Active title text" value={theme.mac9TitlebarActiveTextColor || DEFAULT_THEME.mac9TitlebarActiveTextColor} onChange={(value) => setColor("mac9TitlebarActiveTextColor", value)} />
                  <ColorField label="Inactive title text" value={theme.mac9TitlebarInactiveTextColor || DEFAULT_THEME.mac9TitlebarInactiveTextColor} onChange={(value) => setColor("mac9TitlebarInactiveTextColor", value)} />
                  <RangeField label="Footer status size" value={theme.mac9FooterStatusFontSize || DEFAULT_THEME.mac9FooterStatusFontSize} min="9" max="16" step="1" suffix="px" onChange={(value) => setColor("mac9FooterStatusFontSize", value)} />
                </section>
                <section className="settings-section">
                  <h3>Bevels</h3>
                  <ToggleField label="Enable Platinum bevels" checked={themeToggleEnabled(theme.mac9BevelEnabled ?? DEFAULT_THEME.mac9BevelEnabled)} onChange={(value) => setColor("mac9BevelEnabled", value)} />
                  <ColorField label="Highlight" value={theme.mac9BevelLightColor || DEFAULT_THEME.mac9BevelLightColor} onChange={(value) => setColor("mac9BevelLightColor", value)} />
                  <ColorField label="Middle" value={theme.mac9BevelMidColor || DEFAULT_THEME.mac9BevelMidColor} onChange={(value) => setColor("mac9BevelMidColor", value)} />
                  <ColorField label="Shadow" value={theme.mac9BevelDarkColor || DEFAULT_THEME.mac9BevelDarkColor} onChange={(value) => setColor("mac9BevelDarkColor", value)} />
                  <ColorField label="Outline" value={theme.mac9BevelOutlineColor || DEFAULT_THEME.mac9BevelOutlineColor} onChange={(value) => setColor("mac9BevelOutlineColor", value)} />
                </section>
                <section className="settings-section">
                  <h3>Bevel widths</h3>
                  {[
                    ["Window", "mac9WindowBevelWidth"],
                    ["Panels", "mac9PanelBevelWidth"],
                    ["Controls", "mac9ControlBevelWidth"],
                    ["Fields", "mac9FieldBevelWidth"],
                    ["Lists", "mac9ListBevelWidth"],
                    ["Scrollbars", "mac9ScrollbarBevelWidth"],
                  ].map(([label, key]) => (
                    <label className="appearance-control" key={key}>
                      <span>{label}</span>
                      <CustomSelect
                        value={theme[key] || DEFAULT_THEME[key]}
                        onChange={(value) => setColor(key, value)}
                        ariaLabel={`Platinum ${label.toLowerCase()} bevel width`}
                        options={[0, 1, 2, 3].map((size) => ({ value: `${size}px`, label: `${size} px` }))}
                      />
                    </label>
                  ))}
                  <ToggleField label="Scrollbar arrows together at bottom" checked={themeToggleEnabled(theme.mac9ScrollbarButtonsAtBottom ?? DEFAULT_THEME.mac9ScrollbarButtonsAtBottom)} onChange={(value) => setColor("mac9ScrollbarButtonsAtBottom", value)} />
                </section>
              </div>
            </>
          )}
        </section>
        )}

        {settingsSection === "colors" && (
        <section className="settings-panel colors-settings-panel">
          <SettingsSectionHeading title="Theme colors" description={appContext === "mister" ? "Customize surfaces, text, controls, glyphs, sidebar dividers, and scrollbars." : "Customize surfaces, text, controls, glyphs, scrollbars, and format badges."} />
          <div className="settings-grid color-settings-grid">
            {visibleGroups.map(([title, fields]) => (
              <section className="settings-section" key={title}>
                <h3>{title}</h3>
                {fields.map(([key, label]) => <ColorField key={key} label={label} value={theme[key]} allowTransparency={key !== "mediaSidebarBackgroundColor"} onChange={(value) => setColor(key, value)} />)}
              </section>
            ))}
          </div>
        </section>
        )}

        {settingsSection === "fonts" && (
        <section className="settings-panel fonts-settings-panel">
          <SettingsSectionHeading title="Font library" description="Drop any number of TTF, OTF, WOFF, or WOFF2 files into the root Fonts folder, then reload the library." />
          <div className="custom-font-row">
            <div>
              <strong>{fontLibrary.length} custom {fontLibrary.length === 1 ? "font" : "fonts"}</strong>
              <span>Fonts remain separate files, so themes can independently assign any face in the library.</span>
            </div>
            <button type="button" className="secondary-button" onClick={openFontsFolder}>Open fonts folder</button>
            <button type="button" className="secondary-button" onClick={reloadFontLibrary}>Reload fonts</button>
          </div>
          {fontError && <div className="error-box modal-error">{fontError}</div>}
          <SettingsSectionHeading title="Text roles" description="Choose a typeface and emphasis independently for every category of interface text." />
          <div className="font-role-grid">
            {[["appFont", "Interface default"], ...effectiveFontRoleFields].map(([key, label]) => {
              const role = key === "appFont" ? "app" : key.slice(0, -4);
              const boldKey = `${role}FontBoldEnabled`;
              const italicKey = `${role}FontItalicEnabled`;
              return (
                <div className={`appearance-control font-role-control${key === "appFont" ? " app-font-control" : ""}`} key={key}>
                  <span className="font-role-label">{label}</span>
                  <CustomSelect
                    value={theme[key] || (key === "appFont" ? DEFAULT_THEME.appFont : "inherit")}
                    onChange={(value) => setColor(key, value)}
                    ariaLabel={`${label} typeface`}
                    options={key === "appFont" ? installedFontOptions : inheritedFontOptions}
                  />
                  <div className="font-role-emphasis" aria-label={`${label} emphasis`}>
                    <ToggleField label="Bold" checked={themeToggleEnabled(theme[boldKey] ?? DEFAULT_THEME[boldKey])} onChange={(value) => setColor(boldKey, value)} />
                    <ToggleField label="Italic" checked={themeToggleEnabled(theme[italicKey] ?? DEFAULT_THEME[italicKey])} onChange={(value) => setColor(italicKey, value)} />
                  </div>
                  {key === "appFont" && <small>Fallback for every role set to Use interface default.</small>}
                </div>
              );
            })}
          </div>
          <SettingsSectionHeading title="Text sizes" description="Set a base size, then fine-tune individual interface roles." />
          <div className="font-size-role-grid">
            <RangeField label="Base interface size" value={theme.appFontSize || DEFAULT_THEME.appFontSize} min="10" max="22" step="1" suffix="px" onChange={(value) => setColor("appFontSize", value)} />
            {effectiveFontSizeRoleFields.map(([key, label]) => (
              <RangeField
                key={key}
                label={label}
                value={theme[key] && theme[key] !== "inherit" ? theme[key] : (theme.appFontSize || DEFAULT_THEME.appFontSize)}
                min="9"
                max="30"
                step="1"
                suffix="px"
                onChange={(value) => setColor(key, value)}
              />
            ))}
            {theme.appStyle === "macos9platinum" && (
              <RangeField
                label="Footer connection status size"
                value={theme.mac9FooterStatusFontSize || DEFAULT_THEME.mac9FooterStatusFontSize}
                min="9"
                max="18"
                step="1"
                suffix="px"
                onChange={(value) => setColor("mac9FooterStatusFontSize", value)}
              />
            )}
          </div>
        </section>
        )}

        {settingsSection === "glyphs" && (
        <section className="settings-panel glyph-settings-panel">
          <SettingsSectionHeading title="Sidebar glyphs" description={isMisterApp ? "Use a PNG or SVG image for any MiSTer section. Images are stored locally with your app settings." : "Use a PNG or SVG image for any library or category. Images are stored locally with your app settings."} />
          <div className="sidebar-glyph-settings-grid">
            {sidebarGlyphTargets.map((target) => (
              <div className="sidebar-glyph-setting" key={target.id}>
                <SidebarGlyphArtwork
                  className="sidebar-glyph-preview"
                  glyphUrl={sidebarGlyphs[target.id] || defaultSidebarGlyphs[target.id]}
                  fallback={target.fallback}
                />
                <span className="sidebar-glyph-setting-label">{target.label}</span>
                <label className="secondary-button sidebar-glyph-file-button">
                  <span>{sidebarGlyphs[target.id] ? "Replace" : "Choose file"}</span>
                  <input type="file" accept=".png,.svg,image/png,image/svg+xml" onChange={(event) => {
                    chooseSidebarGlyph(target.id, event.target.files?.[0]);
                    event.target.value = "";
                  }} />
                </label>
                {sidebarGlyphs[target.id] && <button type="button" className="secondary-button sidebar-glyph-clear-button" onClick={() => clearSidebarGlyph(target.id)}>Clear</button>}
              </div>
            ))}
          </div>
          {glyphError && <div className="error-box glyph-settings-error">{glyphError}</div>}
        </section>
        )}


        {settingsSection === "devtools" && (
        <section className="settings-panel dev-tools-settings-panel">
          <SettingsSectionHeading title="Window edge calibration" description="Temporary live controls for tuning the inner and outer app-window glow layers. Values are stored with the active theme." />
          <div className="settings-note">The inner glow now starts after the border plus the edge gap, so it no longer brightens the border stroke. The outer glow is composited above the shadow and below the window surface.</div>

          <h4 className="dev-tools-subheading">Settings visibility</h4>
          <div className="effects-grid shape-depth-grid dev-tools-glow-grid">
            <ToggleField label="Disable blur behind Settings" checked={settingsBackdropBlurDisabled} onChange={setSettingsBackdropBlur} />
            <ToggleField label="Remove settings sidebar horizontal divider" checked={themeToggleEnabled(theme.settingsSidebarHorizontalDividerRemoved ?? DEFAULT_THEME.settingsSidebarHorizontalDividerRemoved)} onChange={(value) => setColor("settingsSidebarHorizontalDividerRemoved", value)} />
          </div>
          <div className="settings-note">Turns off only the full-window blur behind this Settings panel, allowing edge glow and shadow changes to remain visible while tuning. The divider option hides the line between Glyphs and Dev Tools while preserving the spacing.</div>

          <h4 className="dev-tools-subheading">Border geometry</h4>
          <div className="effects-grid shape-depth-grid dev-tools-glow-grid">
            <RangeField label="Master window radius" value={theme.appWindowRadius || DEFAULT_THEME.appWindowRadius} min="0" max="32" step="0.25" suffix="px" onChange={(value) => setColor("appWindowRadius", value)} />
            <label className="appearance-control">
              <span>Border thickness</span>
              <CustomSelect
                value={`${Math.max(0, Math.min(2, Math.round(Number.parseFloat(theme.appWindowBorderWidth || DEFAULT_THEME.appWindowBorderWidth) || 0)))}px`}
                onChange={(value) => setColor("appWindowBorderWidth", value)}
                ariaLabel="Border thickness"
                options={[
                  { value: "0px", label: "0 px (off)" },
                  { value: "1px", label: "1 px" },
                  { value: "2px", label: "2 px" },
                ]}
              />
            </label>
            <RangeField label="Content radius inset" value={theme.appWindowContentRadiusOffset || DEFAULT_THEME.appWindowContentRadiusOffset} min="0" max="2" step="0.25" suffix="px" onChange={(value) => setColor("appWindowContentRadiusOffset", value)} />
          </div>
          <div className="settings-note">All rounded layers now derive from one master radius. The inner surface radius equals the master radius minus border thickness and this additional inset. Try 0.5–1px to soften the exposed border corners.</div>
          <div className="settings-note dev-tools-readout">Geometry recipe: {theme.appWindowRadius || DEFAULT_THEME.appWindowRadius} outer radius, {theme.appWindowBorderWidth || DEFAULT_THEME.appWindowBorderWidth} border, {theme.appWindowContentRadiusOffset || DEFAULT_THEME.appWindowContentRadiusOffset} content inset.</div>

          <h4 className="dev-tools-subheading">Electron corner smoothing</h4>
          <div className="effects-grid shape-depth-grid dev-tools-glow-grid">
            <label className="appearance-control">
              <span>Smoothing mode</span>
              <CustomSelect
                value={theme.appWindowCornerSmoothingMode || DEFAULT_THEME.appWindowCornerSmoothingMode}
                onChange={(value) => setColor("appWindowCornerSmoothingMode", value)}
                ariaLabel="Electron corner smoothing mode"
                options={[
                  { value: "off", label: "Off (0%)" },
                  { value: "system-ui", label: "Match operating system" },
                  { value: "custom", label: "Custom percentage" },
                ]}
              />
            </label>
            {(theme.appWindowCornerSmoothingMode || DEFAULT_THEME.appWindowCornerSmoothingMode) === "custom" && (
              <RangeField label="Corner smoothing" value={theme.appWindowCornerSmoothingPercent || DEFAULT_THEME.appWindowCornerSmoothingPercent} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("appWindowCornerSmoothingPercent", value)} />
            )}
          </div>
          <div className="settings-note">Electron applies this experimental rule to the rounded app surface and its border, shadow, and glow layers. On Windows and Linux, <strong>Match operating system</strong> currently resolves to 0%; custom percentages are the useful comparison.</div>
          <div className="settings-note dev-tools-readout">Corner recipe: {(theme.appWindowCornerSmoothingMode || DEFAULT_THEME.appWindowCornerSmoothingMode) === "system-ui" ? "system-ui" : (theme.appWindowCornerSmoothingMode || DEFAULT_THEME.appWindowCornerSmoothingMode) === "custom" ? (theme.appWindowCornerSmoothingPercent || DEFAULT_THEME.appWindowCornerSmoothingPercent) : "0% (off)"}.</div>

          <h4 className="dev-tools-subheading">Inner glow</h4>
          <div className="effects-grid shape-depth-grid dev-tools-glow-grid">
            <ToggleField label="Enable inner glow" checked={themeToggleEnabled(theme.appWindowInnerGlowEnabled ?? DEFAULT_THEME.appWindowInnerGlowEnabled)} onChange={(value) => setColor("appWindowInnerGlowEnabled", value)} />
            <ToggleField label="Match app border color" checked={themeToggleEnabled(theme.appWindowInnerGlowUseBorderColor ?? DEFAULT_THEME.appWindowInnerGlowUseBorderColor)} onChange={(value) => setColor("appWindowInnerGlowUseBorderColor", value)} />
            <RangeField label="Edge gap" value={theme.appWindowInnerGlowGap || DEFAULT_THEME.appWindowInnerGlowGap} min="0" max="6" step="0.5" suffix="px" onChange={(value) => setColor("appWindowInnerGlowGap", value)} />
            <RangeField label="Glow size / blur" value={theme.appWindowInnerGlowSize || DEFAULT_THEME.appWindowInnerGlowSize} min="0" max="16" step="0.5" suffix="px" onChange={(value) => setColor("appWindowInnerGlowSize", value)} />
            <RangeField label="Glow spread" value={theme.appWindowInnerGlowSpread || DEFAULT_THEME.appWindowInnerGlowSpread} min="-6" max="10" step="0.5" suffix="px" onChange={(value) => setColor("appWindowInnerGlowSpread", value)} />
            <RangeField label="Focused transparency" value={(100 - parseFloat(theme.appWindowInnerGlowOpacity || DEFAULT_THEME.appWindowInnerGlowOpacity)) + "%"} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("appWindowInnerGlowOpacity", (100 - parseFloat(value)) + "%")} />
            <RangeField label="Unfocused transparency" value={(100 - parseFloat(theme.appWindowInnerGlowUnfocusedOpacity || DEFAULT_THEME.appWindowInnerGlowUnfocusedOpacity)) + "%"} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("appWindowInnerGlowUnfocusedOpacity", (100 - parseFloat(value)) + "%")} />
            {!themeToggleEnabled(theme.appWindowInnerGlowUseBorderColor ?? DEFAULT_THEME.appWindowInnerGlowUseBorderColor) && (
              <ColorField label="Custom inner glow color" value={theme.appWindowInnerGlowColor || DEFAULT_THEME.appWindowInnerGlowColor} onChange={(value) => setColor("appWindowInnerGlowColor", value)} allowTransparency={false} />
            )}
          </div>
          <div className="settings-note dev-tools-readout">Inner recipe: {theme.appWindowInnerGlowGap || DEFAULT_THEME.appWindowInnerGlowGap} edge gap, {theme.appWindowInnerGlowSize || DEFAULT_THEME.appWindowInnerGlowSize} blur, {theme.appWindowInnerGlowSpread || DEFAULT_THEME.appWindowInnerGlowSpread} spread, {theme.appWindowInnerGlowOpacity || DEFAULT_THEME.appWindowInnerGlowOpacity} focused opacity, {theme.appWindowInnerGlowUnfocusedOpacity || DEFAULT_THEME.appWindowInnerGlowUnfocusedOpacity} unfocused opacity.</div>

          <h4 className="dev-tools-subheading">Outer glow</h4>
          <div className="effects-grid shape-depth-grid dev-tools-glow-grid">
            <ToggleField label="Enable outer glow" checked={themeToggleEnabled(theme.appWindowOuterGlowEnabled ?? DEFAULT_THEME.appWindowOuterGlowEnabled)} onChange={(value) => setColor("appWindowOuterGlowEnabled", value)} />
            <ToggleField label="Match app border color" checked={themeToggleEnabled(theme.appWindowOuterGlowUseBorderColor ?? DEFAULT_THEME.appWindowOuterGlowUseBorderColor)} onChange={(value) => setColor("appWindowOuterGlowUseBorderColor", value)} />
            <RangeField label="Glow size / blur" value={theme.appWindowOuterGlowSize || DEFAULT_THEME.appWindowOuterGlowSize} min="0" max="40" step="0.5" suffix="px" onChange={(value) => setColor("appWindowOuterGlowSize", value)} />
            <RangeField label="Glow spread" value={theme.appWindowOuterGlowSpread || DEFAULT_THEME.appWindowOuterGlowSpread} min="-8" max="16" step="0.5" suffix="px" onChange={(value) => setColor("appWindowOuterGlowSpread", value)} />
            <RangeField label="Focused transparency" value={(100 - parseFloat(theme.appWindowOuterGlowOpacity || DEFAULT_THEME.appWindowOuterGlowOpacity)) + "%"} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("appWindowOuterGlowOpacity", (100 - parseFloat(value)) + "%")} />
            <RangeField label="Unfocused transparency" value={(100 - parseFloat(theme.appWindowOuterGlowUnfocusedOpacity || DEFAULT_THEME.appWindowOuterGlowUnfocusedOpacity)) + "%"} min="0" max="100" step="1" suffix="%" onChange={(value) => setColor("appWindowOuterGlowUnfocusedOpacity", (100 - parseFloat(value)) + "%")} />
            {!themeToggleEnabled(theme.appWindowOuterGlowUseBorderColor ?? DEFAULT_THEME.appWindowOuterGlowUseBorderColor) && (
              <ColorField label="Custom outer glow color" value={theme.appWindowOuterGlowColor || DEFAULT_THEME.appWindowOuterGlowColor} onChange={(value) => setColor("appWindowOuterGlowColor", value)} allowTransparency={false} />
            )}
          </div>
          <div className="settings-note dev-tools-readout">Outer recipe: {theme.appWindowOuterGlowSize || DEFAULT_THEME.appWindowOuterGlowSize} blur, {theme.appWindowOuterGlowSpread || DEFAULT_THEME.appWindowOuterGlowSpread} spread, {theme.appWindowOuterGlowOpacity || DEFAULT_THEME.appWindowOuterGlowOpacity} focused opacity, {theme.appWindowOuterGlowUnfocusedOpacity || DEFAULT_THEME.appWindowOuterGlowUnfocusedOpacity} unfocused opacity.</div>
        </section>
        )}

        {settingsSection === "flash-tools" && flashToolsPanel && (
        <section className="settings-panel flash-tools-settings-panel">
          {flashToolsPanel}
        </section>
        )}

        {settingsSection === "backend" && backendPanel && (
        <section className="settings-panel backend-settings-panel">
          {backendPanel}
        </section>
        )}

        {settingsSection === "covers" && (
        <section className="settings-panel">
          <SettingsSectionHeading title="Artwork source" description="Choose which image library supplies covers in the main collection." />
          <div className="cover-source-row">
            <label className="appearance-control">
              <span>Cover source</span>
              <CustomSelect value={theme.coverSource === "local" ? "local" : "tmdb"} onChange={(value) => setColor("coverSource", value)} ariaLabel="Cover source" options={[
                { value: "tmdb", label: "TMDB posters" },
                { value: "local", label: "Local" },
              ]} />
            </label>
          </div>
          <p className="settings-note">Local shows imported artwork first and falls back to TMDB posters when no local cover is available.</p>
        </section>
        )}

        {settingsSection === "library" && (
        <section className="settings-panel">
          <SettingsSectionHeading
            title={appContext === "mister" ? "Sidebar" : "Libraries"}
            description={appContext === "mister" ? "Rename, reorder, hide, or show the MiSTer sections available in the sidebar." : "Rename, reorder, hide, or show the libraries available in the sidebar."}
          />
          <div className="library-management-list">
            {mediaLibraries.map((library, index) => (
              <div className={`library-management-row${library.hidden ? " is-hidden" : ""}`} key={library.id}>
                <SidebarGlyphArtwork
                  className="library-management-glyph"
                  glyphUrl={sidebarGlyphs[`library:${library.id}`] || defaultSidebarGlyphs[`library:${library.id}`]}
                  fallback={library.glyph}
                />
                <LibraryNameField library={library} onRename={(name) => updateMediaLibrary(library.id, { name })} />
                <div className="library-order-buttons" role="group" aria-label={`Reorder ${library.name}`}>
                  <button type="button" className="quiet-button" aria-label={`Move ${library.name} up`} title="Move up" disabled={index === 0} onClick={() => moveMediaLibrary(library.id, -1)}>↑</button>
                  <button type="button" className="quiet-button" aria-label={`Move ${library.name} down`} title="Move down" disabled={index === mediaLibraries.length - 1} onClick={() => moveMediaLibrary(library.id, 1)}>↓</button>
                </div>
                <button
                  type="button"
                  className={`library-visibility-button${library.hidden ? "" : " visible"}`}
                  aria-pressed={!library.hidden}
                  onClick={() => updateMediaLibrary(library.id, { hidden: !library.hidden })}
                >
                  {library.hidden ? "Hidden" : "Shown"}
                </button>
              </div>
            ))}
          </div>
          {appContext !== "mister" && (
            <>
              <button type="button" className="secondary-button add-library-settings-button" onClick={onCreateLibrary}>+ New Library</button>
              <SettingsSectionHeading title="Library actions" description="Back up, restore, replace, or reset the portable library." />
              <div className="settings-action-grid">
                <button className="secondary-button" onClick={onExportZip} disabled={archiveBusy || !hasLibrary}>{archiveBusy ? "Working..." : "Export ZIP"}</button>
                <button className="secondary-button" onClick={onImportZip} disabled={archiveBusy}>Import ZIP</button>
                <button className="secondary-button" onClick={onLoadXml}>Load new XML</button>
                <button className="secondary-button danger-action" onClick={onResetLibrary} disabled={!hasLibrary}>Reset library</button>
              </div>
              <LibraryInformation info={libraryInfo} />
            </>
          )}
        </section>
        )}

        {settingsSection === "health" && (
        <section className="settings-panel health-settings-panel">
          <LibraryHealthContent
            items={healthItems}
            coverSource={theme.coverSource || "tmdb"}
            metadataBusy={metadataBusy}
            metadataProgress={metadataProgress}
            onEdit={onHealthEdit}
            onRemove={onHealthRemove}
            onFetchMissing={() => apiKey ? onFetchMissingMetadata() : setSettingsSection("api")}
            onRefreshAll={() => apiKey ? onRefreshAllMetadata() : setSettingsSection("api")}
          />
        </section>
        )}

        {settingsSection === "api" && (
        <section className="settings-panel">
          {appContext === "mister" && apiPanel ? apiPanel : (
            <>
              <SettingsSectionHeading title="TMDB" description="Configure metadata, artwork, ratings, and trailer lookup." />
              <div className="tmdb-settings-row">
                <label className="tmdb-key-field">
                  <span>TMDB API key</span>
                  <input value={apiKey} onChange={(e) => onApiKeyChange(e.target.value.trim())} placeholder="Paste your TMDB API key..." />
                </label>
                <button className="secondary-button" onClick={() => onApiKeyChange("")} disabled={!apiKey}>Clear key</button>
              </div>
              <SettingsSectionHeading title="Connected services" description="Open authenticated sessions used by external media services." />
              <div className="api-login-row">
                <button className="secondary-button" onClick={onOpenLddbSession}>LDDB login</button>
                <button className="secondary-button" onClick={onOpenYoutubeLogin}>YouTube login</button>
              </div>
            </>
          )}
        </section>
        )}

        {settingsSection === "about" && (
        <section className="settings-panel about-settings-panel">
          <div className="about-logo-stage">
            {aboutLogoUrl ? <img src={aboutLogoUrl} alt={appName} className="about-settings-logo" /> : <strong className="about-settings-wordmark">{appName}</strong>}
          </div>
          <div className="about-information-box" role="textbox" aria-label={`${appName} build information and acknowledgements`} aria-readonly="true" tabIndex="0">
            <pre>{acknowledgementText}</pre>
          </div>
        </section>
        )}
        </div>
        <ThemedScrollbar scrollRef={settingsScrollRef} className="settings-themed-scrollbar" />
        </section>
        </div>
        {themeNameOpen && <ThemeNameModal placeholder={`My ${appName} Theme`} onSave={onSaveCurrent} onClose={() => setThemeNameOpen(false)} />}
      </div>
    </div>
  );
}
