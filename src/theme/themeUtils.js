/**
 * themeUtils.js
 * Auto-split from the original monolithic main.jsx.
 * Exports: isLightThemeColor, themeColorWithAlpha, readableTextColor, applyStyleAppearance, applyStyleSelection, THEME_PRESETS, hydrateTheme, themeIdentitySignature, loadSavedTheme, saveTheme, loadSavedThemes, saveSavedThemes, themeToggleEnabled, themeStyle, useCustomFont, parseThemeColor, colorWithOpacity
 */

import { useEffect } from "react";
import { DEFAULT_THEME, PRESET_AUDIT_OVERRIDES, PRESET_COMPONENT_OVERRIDES, PRESET_PRESENTATION, RAW_THEME_PRESETS, STYLE_DEPTH_PRESETS, STYLE_EFFECT_PRESETS } from "./themePresets";


const PLATINUM_TYPOGRAPHY_VERSION = "2";
const PLATINUM_VIRTUE_FONT_STACK = '"Virtue", Charcoal, Chicago, Geneva, "Lucida Grande", Tahoma, "MS Sans Serif", system-ui, sans-serif';
const PLATINUM_GENEVA_FONT_STACK = '"Geneva Embedded", Geneva, "Lucida Grande", Tahoma, "MS Sans Serif", Arial, sans-serif';
const LEGACY_PLATINUM_FONT_STACKS = new Set([
  'Charcoal, Chicago, Geneva, "Lucida Grande", Tahoma, "MS Sans Serif", system-ui, sans-serif',
  'Chicago, Charcoal, Geneva, "Lucida Grande", Tahoma, "MS Sans Serif", system-ui, sans-serif',
  'Chicago, Charcoal, Geneva, "Lucida Grande", Tahoma, system-ui, sans-serif',
  'Chicago, Charcoal, Geneva, "Lucida Grande", Tahoma, sans-serif',
  'Geneva, "Lucida Grande", Tahoma, "MS Sans Serif", Arial, sans-serif',
  'Charcoal, Geneva, "Lucida Grande", Tahoma, "MS Sans Serif", Arial, sans-serif',
]);
const PLATINUM_FONT_ROLE_KEYS = [
  "titlebarFont",
  "headerFont",
  "filterFont",
  "cardFont",
  "cardTitleFont",
  "metadataFont",
  "controlFont",
  "badgeFont",
  "windowFont",
  "detailsFont",
  "settingsFont",
  "footerFont",
  "sidebarFont",
];
const LEGACY_PLATINUM_FONT_SIZE_DEFAULTS = {
  appFontSize: "11px",
  titlebarFontSize: "12px",
  headerFontSize: "14px",
  filterFontSize: "11px",
  cardFontSize: "11px",
  cardTitleFontSize: "11px",
  metadataFontSize: "10px",
  controlFontSize: "11px",
  badgeFontSize: "10px",
  windowFontSize: "11px",
  detailsFontSize: "11px",
  settingsFontSize: "11px",
  footerFontSize: "10px",
  sidebarFontSize: "11px",
  mac9FooterStatusFontSize: "11px",
};

/** Upgrades untouched Platinum typography defaults without replacing user-selected fonts or sizes. */
function migratePlatinumTypography(value = {}) {
  if (String(value.appStyle || "").toLowerCase() !== "macos9platinum"
      || value.platinumTypographyVersion === PLATINUM_TYPOGRAPHY_VERSION) {
    return value;
  }

  const migrated = {
    ...value,
    platinumTypographyVersion: PLATINUM_TYPOGRAPHY_VERSION,
  };
  const currentAppFont = String(value.appFont || "").trim();
  const appFontUsesLegacyDefault = !currentAppFont || LEGACY_PLATINUM_FONT_STACKS.has(currentAppFont);
  migrated.appFont = appFontUsesLegacyDefault ? PLATINUM_VIRTUE_FONT_STACK : currentAppFont;

  PLATINUM_FONT_ROLE_KEYS.forEach((key) => {
    const current = String(value[key] || "").trim();
    const usesFormerBuiltInDefault = !current
      || current === "inherit"
      || LEGACY_PLATINUM_FONT_STACKS.has(current)
      || current === PLATINUM_VIRTUE_FONT_STACK;

    if (key === "metadataFont" && usesFormerBuiltInDefault) {
      // Description and subtitle copy uses Geneva by default, while every
      // genuinely custom metadata face remains untouched.
      migrated[key] = PLATINUM_GENEVA_FONT_STACK;
    } else if ((!current || current === "inherit" || LEGACY_PLATINUM_FONT_STACKS.has(current))) {
      migrated[key] = appFontUsesLegacyDefault ? PLATINUM_VIRTUE_FONT_STACK : "inherit";
    }
  });

  Object.entries(LEGACY_PLATINUM_FONT_SIZE_DEFAULTS).forEach(([key, legacyDefault]) => {
    const current = String(value[key] || "").trim();
    if (!current || current === "inherit" || current === legacyDefault) migrated[key] = "12px";
  });

  return migrated;
}
import { SAVED_THEMES_STORAGE_KEY, THEME_STORAGE_KEY } from "../constants/storageKeys";
import { getHostBridge } from "../framework/host/hostBridge";

/** Heuristic check for whether a hex color counts as "light" (for choosing readable foreground colors). */
export function isLightThemeColor(value) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(String(value || ""));
  if (!match) return false;
  const [red, green, blue] = match.slice(1).map((part) => parseInt(part, 16));
  return (red * 299 + green * 587 + blue * 114) / 255000 > 0.62;
}

/** Appends an alpha channel to a hex color, tolerating colors that already include one. */
export function themeColorWithAlpha(value, alpha = "33") {
  const color = String(value || "");
  return /^#[\da-f]{6}$/i.test(color) ? color + alpha : color;
}

/** Picks black or white text for readable contrast against a given background color. */
export function readableTextColor(background) {
  return isLightThemeColor(String(background || "").slice(0, 7)) ? "#101014" : "#f7f7fb";
}

/** Expands a named app style (e.g. "brutalist") into the full set of concrete theme values it implies. */
export function applyStyleAppearance(theme, style = theme.appStyle || "classic") {
  const depth = STYLE_DEPTH_PRESETS[style] || STYLE_DEPTH_PRESETS.classic;
  const shadowColor = style === "neon" || style === "brutalist"
    ? theme.highlightColor
    : (isLightThemeColor(theme.appBackground) ? theme.mutedTextColor : "#000000");
  const windows9xChromeDefaults = style === "windows9x" ? {
    windowControlStyle: "windows9x",
    headerHeight: "24px",
    headerPaddingX: "3px",
    headerPaddingY: "2px",
    headerGradientEnabled: true,
    headerGradientAngle: "90deg",
    headerGradientStartColor: "#000080",
    headerGradientEndColor: "#1084d0",
    headerGradientStartStop: "0%",
    headerGradientEndStop: "100%",
    compactHeaderEnabled: false,
    pageTransitionsEnabled: false,
    buttonPressAnimationEnabled: false,
    cardHoverAnimationEnabled: false,
    modalAnimationEnabled: false,
    progressShimmerEnabled: false,
    settingsAccordionAnimationEnabled: false,
    installCardRevealAnimationEnabled: false,
  } : {};
  const macos9ChromeDefaults = style === "macos9platinum" ? {
    windowControlStyle: "macos9platinum",
    windowControlsLeft: false,
    mac9SmallerWindow: theme.mac9SmallerWindow ?? false,
    headerHeight: "20px",
    headerPaddingX: "4px",
    headerPaddingY: "2px",
    headerGradientEnabled: false,
    compactHeaderEnabled: false,
    pageTransitionsEnabled: false,
    buttonPressAnimationEnabled: false,
    cardHoverAnimationEnabled: false,
    modalAnimationEnabled: false,
    progressShimmerEnabled: false,
    settingsAccordionAnimationEnabled: false,
    installCardRevealAnimationEnabled: false,
    mac9ChromeColor: theme.mac9ChromeColor || "#cccccc",
    mac9ContentColor: theme.mac9ContentColor || "#e1e1e1",
    mac9TitlebarActiveTextColor: theme.mac9TitlebarActiveTextColor || "#202020",
    mac9TitlebarInactiveTextColor: theme.mac9TitlebarInactiveTextColor || "#444444",
    mac9WindowActiveOutlineColor: theme.mac9WindowActiveOutlineColor || "#222222",
    mac9WindowInactiveOutlineColor: theme.mac9WindowInactiveOutlineColor || "#444444",
    mac9FooterStatusTextColor: theme.mac9FooterStatusTextColor || "#202020",
    mac9FooterStatusFontSize: theme.mac9FooterStatusFontSize || "11px",
    mac9PanelBackgroundColor: theme.mac9PanelBackgroundColor || "#d6d6d6",
    mac9PanelTitleBackgroundColor: theme.mac9PanelTitleBackgroundColor || "#d6d6d6",
    mac9PanelTextColor: theme.mac9PanelTextColor || "#000000",
    mac9PanelTitleTextColor: theme.mac9PanelTitleTextColor || "#000000",
    mac9PanelGrooveShadowColor: theme.mac9PanelGrooveShadowColor || "#808080",
    mac9PanelInnerHighlightColor: theme.mac9PanelInnerHighlightColor || "#ffffff",
    mac9PanelOuterHighlightColor: theme.mac9PanelOuterHighlightColor || "#ffffff",
    mac9BodyTextColor: theme.mac9BodyTextColor || "#202020",
    mac9SecondaryTextColor: theme.mac9SecondaryTextColor || "#404040",
    mac9DisabledTextColor: theme.mac9DisabledTextColor || "#777777",
    mac9LinkTextColor: theme.mac9LinkTextColor || "#000080",
    mac9ToolbarBackgroundColor: theme.mac9ToolbarBackgroundColor || "#cccccc",
    mac9SubheaderBackgroundColor: theme.mac9SubheaderBackgroundColor || "#d6d6d6",
    mac9FieldBackgroundColor: theme.mac9FieldBackgroundColor || "#ffffff",
    mac9FieldTextColor: theme.mac9FieldTextColor || "#000000",
    mac9MenuBackgroundColor: theme.mac9MenuBackgroundColor || "#d6d6d6",
    mac9MenuTextColor: theme.mac9MenuTextColor || "#000000",
    mac9FileBrowserTextColor: theme.mac9FileBrowserTextColor || theme.mac9BodyTextColor || "#202020",
    mac9RowBackgroundColor: theme.mac9RowBackgroundColor || "#eeeeee",
    mac9RowAlternateBackgroundColor: theme.mac9RowAlternateBackgroundColor || "#dddddd",
    mac9RowHoverBackgroundColor: theme.mac9RowHoverBackgroundColor || "#50202020",
    mac9RowHoverTextColor: theme.mac9RowHoverTextColor || theme.mac9FileBrowserTextColor || theme.mac9BodyTextColor || "#202020",
    mac9RowSelectedBackgroundColor: theme.mac9RowSelectedBackgroundColor || "#c5c3e5",
    mac9RowSelectedTextColor: theme.mac9RowSelectedTextColor || "#000000",
    mac9SelectedColumnBackgroundColor: theme.mac9SelectedColumnBackgroundColor || "#cccccc",
    mac9SelectedColumnAlternateBackgroundColor: theme.mac9SelectedColumnAlternateBackgroundColor || "#bbbbbb",
    mac9SelectedColumnHoverBackgroundColor: theme.mac9SelectedColumnHoverBackgroundColor || "#9f9f9f",
    mac9SelectedColumnHoverTextColor: theme.mac9SelectedColumnHoverTextColor || theme.mac9FileBrowserTextColor || theme.mac9BodyTextColor || "#202020",
    mac9SelectionBackgroundColor: theme.mac9SelectionBackgroundColor || "#989efa",
    mac9SelectionTextColor: theme.mac9SelectionTextColor || "#000000",
    mac9FocusRingColor: theme.mac9FocusRingColor || "#0000ff",
    mac9ScrollbarTrackColor: theme.mac9ScrollbarTrackColor || "#b9b9b9",
    mac9ScrollbarThumbColor: theme.mac9ScrollbarThumbColor || "#7770d8",
    mac9ScrollbarThumbBorderColor: theme.mac9ScrollbarThumbBorderColor || "#232323",
    mac9DocumentViewportColor: theme.mac9DocumentViewportColor || "#222222",
    mac9AssetColorizeEnabled: theme.mac9AssetColorizeEnabled ?? false,
    mac9AssetColorizeAmount: theme.mac9AssetColorizeAmount || "100%",
    mac9AssetHueRotate: theme.mac9AssetHueRotate || "0deg",
    mac9AssetSaturation: theme.mac9AssetSaturation || "100%",
    mac9AssetBrightness: theme.mac9AssetBrightness || "100%",
    mac9AssetContrast: theme.mac9AssetContrast || "100%",
    mac9BevelEnabled: theme.mac9BevelEnabled ?? true,
    mac9BevelLightColor: theme.mac9BevelLightColor || "#ffffff",
    mac9BevelMidColor: theme.mac9BevelMidColor || "#cccccc",
    mac9BevelDarkColor: theme.mac9BevelDarkColor || "#777777",
    mac9BevelOutlineColor: theme.mac9BevelOutlineColor || "#202020",
    mac9BevelShadowOffset: theme.mac9BevelShadowOffset || "1px",
    mac9WindowBevelWidth: theme.mac9WindowBevelWidth || "1px",
    mac9PanelBevelWidth: theme.mac9PanelBevelWidth || "1px",
    mac9ControlBevelWidth: theme.mac9ControlBevelWidth || "1px",
    mac9FieldBevelWidth: theme.mac9FieldBevelWidth || "1px",
    mac9ListBevelWidth: theme.mac9ListBevelWidth || "1px",
    mac9ScrollbarBevelWidth: theme.mac9ScrollbarBevelWidth || "1px",
    mac9ScrollbarButtonsAtBottom: theme.mac9ScrollbarButtonsAtBottom ?? false,
    mac9WindowShadowEnabled: theme.mac9WindowShadowEnabled ?? true,
    mac9WindowShadowOffsetX: theme.mac9WindowShadowOffsetX || "1px",
    mac9WindowShadowOffsetY: theme.mac9WindowShadowOffsetY || "1px",
    mac9WindowShadowBlur: theme.mac9WindowShadowBlur || "1px",
    mac9WindowShadowOpacity: theme.mac9WindowShadowOpacity || "100%",
    mac9ChromeShadowEnabled: theme.mac9ChromeShadowEnabled ?? true,
    mac9ChromeShadowOffsetX: theme.mac9ChromeShadowOffsetX || "1px",
    mac9ChromeShadowOffsetY: theme.mac9ChromeShadowOffsetY || "1px",
    mac9ChromeShadowBlur: theme.mac9ChromeShadowBlur || "1px",
    mac9ChromeShadowOpacity: theme.mac9ChromeShadowOpacity || "100%",
  } : {};
  return {
    ...theme,
    ...windows9xChromeDefaults,
    ...macos9ChromeDefaults,
    appStyle: style,
    headerBackgroundColor: style === "minimal" ? theme.appBackground : theme.panelBackground,
    headerSurfaceOpacity: theme.surfaceOpacity ?? "1",
    headerBlurAmount: theme.blurAmount ?? "0px",
    filterBackgroundColor: style === "minimal" ? theme.appBackground : theme.panelBackground,
    filterSurfaceOpacity: theme.surfaceOpacity ?? "1",
    filterBlurAmount: theme.blurAmount ?? "0px",
    footerBackgroundColor: style === "minimal" ? theme.appBackground : theme.panelBackground,
    footerSurfaceOpacity: theme.surfaceOpacity ?? "1",
    footerBlurAmount: theme.blurAmount ?? "0px",
    headerDividerColor: theme.borderColor,
    toolbarDividerColor: theme.borderColor,
    footerDividerColor: theme.borderColor,
    cardBorderColor: theme.borderColor,
    cardHoverBorderColor: theme.highlightColor,
    cardHoverBackgroundColor: theme.modalBackground,
    editHighlightColor: theme.dangerColor,
    buttonBackgroundColor: theme.panelBackground,
    buttonHoverBackgroundColor: theme.modalBackground,
    buttonPressedColor: theme.highlightColor,
    buttonSelectedBackgroundColor: theme.highlightColor,
    buttonDisabledBackgroundColor: theme.appBackground,
    buttonBorderColor: theme.borderColor,
    buttonHoverBorderColor: theme.highlightColor,
    buttonPressedBorderColor: theme.highlightColor,
    buttonSelectedBorderColor: theme.highlightColor,
    buttonDisabledBorderColor: theme.borderColor,
    buttonTextColor: theme.mutedTextColor,
    buttonHoverTextColor: theme.textColor,
    buttonPressedTextColor: theme.appBackground,
    buttonSelectedTextColor: theme.appBackground,
    buttonDisabledTextColor: theme.faintTextColor,
    glyphColor: theme.mutedTextColor,
    glyphHoverColor: theme.textColor,
    glyphPressedColor: theme.appBackground,
    glyphSelectedColor: theme.appBackground,
    glyphDisabledColor: theme.faintTextColor,
    searchGlyphColor: theme.mutedTextColor,
    searchGlyphHoverColor: theme.textColor,
    searchGlyphFocusColor: theme.highlightColor,
    sliderBackgroundColor: theme.panelBackground,
    sliderBorderColor: theme.borderColor,
    sliderTrackColor: theme.borderColor,
    sliderThumbColor: theme.highlightColor,
    sliderThumbBorderColor: theme.textColor,
    colorPickerBorderColor: theme.borderColor,
    colorPickerBorderWidth: theme.colorPickerBorderWidth || "1px",
    toggleTrackOffColor: theme.toggleTrackOffColor || theme.appBackground,
    toggleTrackOnColor: theme.toggleTrackOnColor || theme.highlightColor,
    toggleThumbOffColor: theme.toggleThumbOffColor || theme.mutedTextColor,
    toggleThumbOnColor: theme.toggleThumbOnColor || theme.buttonSelectedTextColor || theme.appBackground,
    toggleBorderOffColor: theme.toggleBorderOffColor || theme.borderColor,
    toggleBorderOnColor: theme.toggleBorderOnColor || theme.highlightColor,
    toggleRadius: theme.toggleRadius || theme.controlRadius || "11px",
    toggleThumbRadius: theme.toggleThumbRadius || "8px",
    checkboxBackgroundColor: theme.checkboxBackgroundColor || theme.appBackground,
    checkboxCheckedBackgroundColor: theme.checkboxCheckedBackgroundColor || theme.highlightColor,
    checkboxBorderColor: theme.checkboxBorderColor || theme.borderColor,
    checkboxCheckColor: theme.checkboxCheckColor || readableTextColor(theme.checkboxCheckedBackgroundColor || theme.highlightColor),
    checkboxRadius: theme.checkboxRadius || theme.badgeRadius || "4px",
    scrollbarTrackColor: themeColorWithAlpha(theme.borderColor, "33"),
    scrollbarThumbColor: theme.borderColor,
    scrollbarThumbHoverColor: theme.highlightColor,
    dropdownMenuBackgroundColor: theme.modalBackground,
    dropdownMenuBorderColor: theme.borderColor,
    dropdownItemBackgroundColor: "#00000000",
    dropdownItemTextColor: theme.mutedTextColor,
    dropdownItemBorderColor: "#00000000",
    dropdownItemHoverBackgroundColor: theme.modalBackground,
    dropdownItemHoverTextColor: theme.textColor,
    dropdownItemHoverBorderColor: theme.highlightColor,
    dropdownItemSelectedBackgroundColor: theme.highlightColor,
    dropdownItemSelectedTextColor: theme.appBackground,
    dropdownItemSelectedBorderColor: theme.highlightColor,
    dropdownItemPressedBackgroundColor: theme.highlightColor,
    dropdownItemPressedTextColor: theme.appBackground,
    dropdownItemPressedBorderColor: theme.highlightColor,
    dropdownGroupTextColor: theme.faintTextColor,
    textBoxBackgroundColor: theme.panelBackground,
    textBoxBorderColor: theme.borderColor,
    textBoxTextColor: theme.textColor,
    textBoxPlaceholderColor: theme.faintTextColor,
    textBoxHoverBorderColor: theme.highlightColor,
    textBoxFocusBackgroundColor: theme.modalBackground,
    textBoxFocusBorderColor: theme.highlightColor,
    textBoxSelectionBackgroundColor: theme.highlightColor,
    textBoxSelectionTextColor: theme.appBackground,
    cleanSidebarEnabled: theme.cleanSidebarEnabled ?? true,
    settingsSidebarBackgroundColor: theme.settingsSidebarBackgroundColor || theme.panelBackground,
    settingsSidebarSurfaceOpacity: theme.settingsSidebarSurfaceOpacity ?? theme.surfaceOpacity ?? "1",
    settingsSidebarBlurAmount: theme.settingsSidebarBlurAmount || theme.blurAmount || "0px",
    settingsSidebarTextColor: theme.settingsSidebarTextColor || theme.mutedTextColor,
    settingsSidebarActiveColor: theme.settingsSidebarActiveColor || themeColorWithAlpha(theme.highlightColor, "2e"),
    settingsSidebarActiveTextColor: theme.settingsSidebarActiveTextColor || readableTextColor(theme.settingsSidebarActiveColor || theme.highlightColor),
    settingsSidebarPressedColor: theme.settingsSidebarPressedColor || themeColorWithAlpha(theme.highlightColor, "66"),
    settingsSidebarPressedTextColor: theme.settingsSidebarPressedTextColor || readableTextColor(theme.settingsSidebarPressedColor || theme.highlightColor),
    settingsSubheaderColor: theme.mutedTextColor,
    mediaSidebarBackgroundColor: theme.mediaSidebarBackgroundColor || theme.panelBackground,
    mediaSidebarSurfaceOpacity: theme.mediaSidebarSurfaceOpacity ?? theme.surfaceOpacity ?? "1",
    mediaSidebarBlurAmount: theme.mediaSidebarBlurAmount || theme.blurAmount || "0px",
    mediaSidebarBorderColor: theme.mediaSidebarBorderColor || theme.borderColor,
    mediaSidebarDividerColor: theme.mediaSidebarDividerColor || theme.borderColor,
    mediaSidebarTextColor: theme.mediaSidebarTextColor || theme.textColor,
    mediaSidebarMutedTextColor: theme.mediaSidebarMutedTextColor || theme.mutedTextColor,
    mediaSidebarSectionTextColor: theme.mediaSidebarSectionTextColor || theme.mutedTextColor,
    mediaSidebarCountTextColor: theme.mediaSidebarCountTextColor || theme.mutedTextColor,
    mediaSidebarButtonBackgroundColor: theme.mediaSidebarButtonBackgroundColor || "#00000000",
    mediaSidebarButtonHoverBackgroundColor: theme.mediaSidebarButtonHoverBackgroundColor || theme.modalBackground,
    mediaSidebarButtonActiveBackgroundColor: theme.mediaSidebarButtonActiveBackgroundColor || themeColorWithAlpha(theme.highlightColor, "33"),
    mediaSidebarButtonBorderColor: theme.mediaSidebarButtonBorderColor || "#00000000",
    mediaSidebarButtonHoverBorderColor: theme.mediaSidebarButtonHoverBorderColor || theme.highlightColor,
    mediaSidebarButtonActiveBorderColor: theme.mediaSidebarButtonActiveBorderColor || theme.highlightColor,
    mediaSidebarButtonTextColor: theme.mediaSidebarButtonTextColor || theme.textColor,
    mediaSidebarButtonHoverTextColor: theme.mediaSidebarButtonHoverTextColor || theme.textColor,
    mediaSidebarButtonActiveTextColor: theme.mediaSidebarButtonActiveTextColor || theme.textColor,
    mediaSidebarGlyphColor: theme.mediaSidebarGlyphColor || theme.mutedTextColor,
    mediaSidebarGlyphHoverColor: theme.mediaSidebarGlyphHoverColor || theme.textColor,
    mediaSidebarGlyphActiveColor: theme.mediaSidebarGlyphActiveColor || theme.highlightColor,
    sidebarToggleBackgroundColor: theme.sidebarToggleBackgroundColor || "#00000000",
    sidebarToggleHoverBackgroundColor: theme.sidebarToggleHoverBackgroundColor || theme.buttonHoverBackgroundColor || theme.modalBackground,
    sidebarToggleBorderColor: theme.sidebarToggleBorderColor || theme.buttonBorderColor || theme.borderColor,
    sidebarToggleHoverBorderColor: theme.sidebarToggleHoverBorderColor || theme.buttonHoverBorderColor || theme.highlightColor,
    sidebarToggleGlyphColor: theme.sidebarToggleGlyphColor || theme.glyphColor || theme.mutedTextColor,
    sidebarToggleHoverGlyphColor: theme.sidebarToggleHoverGlyphColor || theme.glyphHoverColor || theme.textColor,
    mediaSidebarRadius: theme.mediaSidebarRadius || depth.windowRadius,
    mediaSidebarButtonRadius: theme.mediaSidebarButtonRadius || depth.controlRadius,
    mediaSidebarShadowWidth: theme.mediaSidebarShadowWidth || "52px",
    mediaSidebarShadowColor: theme.mediaSidebarShadowColor || shadowColor,
    mediaSidebarGradientEnabled: theme.mediaSidebarGradientEnabled ?? true,
    mediaSidebarGradientOffsetX: theme.mediaSidebarGradientOffsetX || "0px",
    mediaSidebarGradientOffsetY: theme.mediaSidebarGradientOffsetY || "0px",
    mediaSidebarGradientBlur: theme.mediaSidebarGradientBlur || "24px",
    mediaSidebarGradientWidth: theme.mediaSidebarGradientWidth || "148px",
    mediaSidebarGradientHeight: theme.mediaSidebarGradientHeight || "100%",
    mediaSidebarGradientColor: theme.mediaSidebarGradientColor || "#eaf2ff",
    mediaSidebarGradientStartColor: theme.mediaSidebarGradientStartColor || "#eaf2ff",
    mediaSidebarGradientEndColor: theme.mediaSidebarGradientEndColor || "#eaf2ff",
    mediaSidebarGradientHighlightColor: theme.mediaSidebarGradientHighlightColor || "#eaf2ff",
    mediaSidebarGradientOpacity: theme.mediaSidebarGradientOpacity || "22%",
    mediaSidebarActiveGradientStartColor: theme.mediaSidebarActiveGradientStartColor || themeColorWithAlpha(theme.highlightColor, "34"),
    mediaSidebarActiveGradientEndColor: theme.mediaSidebarActiveGradientEndColor || themeColorWithAlpha(theme.panelBackground, "00"),
    mediaSidebarActiveGradientBorderColor: theme.mediaSidebarActiveGradientBorderColor || theme.highlightColor,
    mediaSidebarActiveGradientOpacity: theme.mediaSidebarActiveGradientOpacity || "100%",
    ...depth,
    appWindowRadius: theme.appWindowRadius || depth.windowRadius,
    appWindowBorderWidth: theme.appWindowBorderWidth || "1px",
    appWindowContentRadiusOffset: theme.appWindowContentRadiusOffset || "0.5px",
    appWindowBorderColor: theme.appWindowBorderColor || theme.borderColor,
    appWindowUnfocusedBorderColor: theme.appWindowUnfocusedBorderColor || themeColorWithAlpha(theme.borderColor, "99"),
    appWindowCornerSmoothingMode: theme.appWindowCornerSmoothingMode || "off",
    appWindowCornerSmoothingPercent: theme.appWindowCornerSmoothingPercent || "60%",
    appWindowInnerGlowEnabled: theme.appWindowInnerGlowEnabled ?? true,
    appWindowInnerGlowUseBorderColor: theme.appWindowInnerGlowUseBorderColor ?? true,
    appWindowInnerGlowColor: theme.appWindowInnerGlowColor || theme.appWindowBorderColor || theme.borderColor,
    appWindowInnerGlowSize: theme.appWindowInnerGlowSize || "3px",
    appWindowInnerGlowSpread: theme.appWindowInnerGlowSpread || "0px",
    appWindowInnerGlowOpacity: theme.appWindowInnerGlowOpacity || "24%",
    appWindowInnerGlowUnfocusedOpacity: theme.appWindowInnerGlowUnfocusedOpacity || "16%",
    appWindowShadowEnabled: theme.appWindowShadowEnabled ?? true,
    appWindowShadowMargin: theme.appWindowShadowMargin || "18px",
    appWindowShadowOffsetX: theme.appWindowShadowOffsetX || "0px",
    appWindowShadowOffsetY: theme.appWindowShadowOffsetY || "6px",
    appWindowShadowBlur: theme.appWindowShadowBlur || "18px",
    appWindowShadowSpread: theme.appWindowShadowSpread || "0px",
    appWindowShadowColor: theme.appWindowShadowColor || shadowColor,
    appWindowShadowOpacity: theme.appWindowShadowOpacity || "42%",
    appWindowUnfocusedShadowColor: theme.appWindowUnfocusedShadowColor || shadowColor,
    appWindowUnfocusedShadowOpacity: theme.appWindowUnfocusedShadowOpacity || "20%",
    popupShadowColor: theme.popupShadowColor || shadowColor,
    dropdownShadowColor: theme.dropdownShadowColor || shadowColor,
    dropdownItemRadius: depth.controlRadius,
    textBoxRadius: depth.controlRadius,
    cardShadowColor: shadowColor,
    headerShadowColor: shadowColor,
    filterShadowColor: shadowColor,
    footerShadowColor: shadowColor,
    cardShadowVersion: DEFAULT_THEME.cardShadowVersion,
  };
}

/** Applies a style preset selection to a theme, then re-derives its appearance. */
export function applyStyleSelection(theme, style) {
  return applyStyleAppearance({
    ...theme,
    ...(STYLE_EFFECT_PRESETS[style] || STYLE_EFFECT_PRESETS.classic),
  }, style);
}

export const THEME_PRESETS = RAW_THEME_PRESETS.map((preset) => {
  if (["MiSTer Companion EX", "MiSTer Companion Classic", "macOS Platinum"].includes(preset.name)) {
    // These presets are canonical Settings exports. Hydrate them exactly as an
    // imported theme instead of re-deriving its authored component values.
    return { ...preset, theme: hydrateTheme(preset.theme) };
  }

  const [appStyle, surfaceOpacity, blurAmount] = PRESET_PRESENTATION[preset.name] || ["classic", "1", "0px"];
  const styledTheme = applyStyleAppearance({
    ...preset.theme,
    appStyle,
    surfaceOpacity,
    blurAmount,
  }, appStyle);
  const componentOverrides = { ...(PRESET_COMPONENT_OVERRIDES[preset.name] || {}), ...(PRESET_AUDIT_OVERRIDES[preset.name] || {}) };
  const presetHighlight = componentOverrides.highlightColor || styledTheme.highlightColor;
  const presetText = componentOverrides.textColor || styledTheme.textColor;
  const presetMuted = componentOverrides.mutedTextColor || styledTheme.mutedTextColor;
  const presetPanel = componentOverrides.panelBackground || styledTheme.panelBackground;
  const presetApp = componentOverrides.appBackground || styledTheme.appBackground;
  const presetBorder = componentOverrides.borderColor || styledTheme.borderColor;
  const presetAppWindowBorder = componentOverrides.appWindowBorderColor || presetBorder;
  const presetAppWindowUnfocusedBorder = componentOverrides.appWindowUnfocusedBorderColor || themeColorWithAlpha(presetBorder, "99");
  return {
    ...preset,
    theme: {
      ...styledTheme,
      ...componentOverrides,
      appWindowBorderColor: presetAppWindowBorder,
      appWindowUnfocusedBorderColor: presetAppWindowUnfocusedBorder,
      settingsSidebarBackgroundColor: componentOverrides.settingsSidebarBackgroundColor || presetPanel,
      settingsSidebarTextColor: componentOverrides.settingsSidebarTextColor || presetMuted,
      settingsSidebarActiveColor: componentOverrides.settingsSidebarActiveColor || presetHighlight,
      settingsSidebarActiveTextColor: componentOverrides.settingsSidebarActiveTextColor || readableTextColor(componentOverrides.settingsSidebarActiveColor || presetHighlight),
      settingsSidebarPressedColor: componentOverrides.settingsSidebarPressedColor || componentOverrides.buttonPressedColor || styledTheme.buttonPressedColor || presetHighlight,
      settingsSidebarPressedTextColor: componentOverrides.settingsSidebarPressedTextColor || readableTextColor(componentOverrides.settingsSidebarPressedColor || componentOverrides.buttonPressedColor || styledTheme.buttonPressedColor || presetHighlight),
      settingsSidebarHeaderColor: componentOverrides.settingsSidebarHeaderColor || presetText,
      settingsPageHeaderColor: componentOverrides.settingsPageHeaderColor || presetText,
      settingsSectionHeaderColor: componentOverrides.settingsSectionHeaderColor || presetText,
      settingsSubheaderColor: componentOverrides.settingsSubheaderColor || presetMuted,
      footerCountBackgroundColor: componentOverrides.footerCountBackgroundColor || componentOverrides.footerBackgroundColor || componentOverrides.panelBackground || styledTheme.footerBackgroundColor || styledTheme.panelBackground,
      footerCountBorderColor: componentOverrides.footerCountBorderColor || componentOverrides.borderColor || styledTheme.borderColor,
      footerCountTextColor: componentOverrides.footerCountTextColor || componentOverrides.mutedTextColor || styledTheme.mutedTextColor,
      toggleTrackOffColor: componentOverrides.toggleTrackOffColor || presetApp,
      toggleTrackOnColor: componentOverrides.toggleTrackOnColor || presetHighlight,
      toggleThumbOffColor: componentOverrides.toggleThumbOffColor || presetMuted,
      toggleThumbOnColor: componentOverrides.toggleThumbOnColor || componentOverrides.buttonSelectedTextColor || styledTheme.buttonSelectedTextColor || presetApp,
      toggleBorderOffColor: componentOverrides.toggleBorderOffColor || presetBorder,
      toggleBorderOnColor: componentOverrides.toggleBorderOnColor || presetHighlight,
      toggleRadius: componentOverrides.toggleRadius || styledTheme.controlRadius,
      toggleThumbRadius: componentOverrides.toggleThumbRadius || styledTheme.toggleThumbRadius || "8px",
      checkboxBackgroundColor: componentOverrides.checkboxBackgroundColor || presetApp,
      checkboxCheckedBackgroundColor: componentOverrides.checkboxCheckedBackgroundColor || presetHighlight,
      checkboxBorderColor: componentOverrides.checkboxBorderColor || presetBorder,
      checkboxCheckColor: componentOverrides.checkboxCheckColor || readableTextColor(componentOverrides.checkboxCheckedBackgroundColor || presetHighlight),
      checkboxRadius: componentOverrides.checkboxRadius || styledTheme.badgeRadius || "4px",
      badgeFontSize: componentOverrides.badgeFontSize || "10px",
    },
  };
});

/** Fills in any missing fields on a (possibly partial/legacy) saved theme with current defaults. */
export function hydrateTheme(value = {}) {
  value = migratePlatinumTypography(value);
  const merged = { ...DEFAULT_THEME, ...value };
  const usesCurrentSchema = value.themeSchemaVersion === DEFAULT_THEME.themeSchemaVersion;
  const legacyGlowActive = value.appStyle === "neon" && themeToggleEnabled(value.neonGlowEnabled);
  const legacyGlowEnabled = (legacyKey) => legacyGlowActive && themeToggleEnabled(value[legacyKey]);
  return {
    ...merged,
    headerDividerColor: value.headerDividerColor || value.borderColor || merged.headerDividerColor,
    toolbarDividerColor: value.toolbarDividerColor || value.borderColor || merged.toolbarDividerColor,
    footerDividerColor: value.footerDividerColor || value.borderColor || merged.footerDividerColor,
    headerBackgroundColor: value.headerBackgroundColor || value.panelBackground || merged.headerBackgroundColor,
    headerSurfaceOpacity: value.headerSurfaceOpacity || value.surfaceOpacity || merged.headerSurfaceOpacity,
    headerBlurAmount: value.headerBlurAmount || value.blurAmount || merged.headerBlurAmount,
    headerHeight: value.headerHeight || merged.headerHeight,
    headerPaddingX: value.headerPaddingX || merged.headerPaddingX,
    headerPaddingY: value.headerPaddingY || merged.headerPaddingY,
    headerGradientEnabled: value.headerGradientEnabled ?? merged.headerGradientEnabled,
    headerGradientAngle: value.headerGradientAngle || merged.headerGradientAngle,
    headerGradientStartColor: value.headerGradientStartColor || value.headerBackgroundColor || merged.headerGradientStartColor,
    headerGradientEndColor: value.headerGradientEndColor || value.headerBackgroundColor || merged.headerGradientEndColor,
    headerGradientStartStop: value.headerGradientStartStop || merged.headerGradientStartStop,
    headerGradientEndStop: value.headerGradientEndStop || merged.headerGradientEndStop,
    filterBackgroundColor: value.filterBackgroundColor || value.panelBackground || merged.filterBackgroundColor,
    filterSurfaceOpacity: value.filterSurfaceOpacity || value.surfaceOpacity || merged.filterSurfaceOpacity,
    filterBlurAmount: value.filterBlurAmount || value.blurAmount || merged.filterBlurAmount,
    footerBackgroundColor: value.footerBackgroundColor || value.panelBackground || merged.footerBackgroundColor,
    footerSurfaceOpacity: value.footerSurfaceOpacity || value.surfaceOpacity || merged.footerSurfaceOpacity,
    footerBlurAmount: value.footerBlurAmount || value.blurAmount || merged.footerBlurAmount,
    footerCountBackgroundColor: value.footerCountBackgroundColor || value.footerBackgroundColor || value.panelBackground || merged.footerCountBackgroundColor,
    footerCountBorderColor: value.footerCountBorderColor || value.borderColor || merged.footerCountBorderColor,
    footerCountTextColor: value.footerCountTextColor || value.mutedTextColor || merged.footerCountTextColor,
    editHighlightColor: value.editHighlightColor || value.dangerColor || merged.editHighlightColor,
    cardBorderColor: value.cardBorderColor || value.borderColor || merged.cardBorderColor,
    cardHoverBorderColor: value.cardHoverBorderColor || value.highlightColor || merged.cardHoverBorderColor,
    cardHoverBackgroundColor: value.cardHoverBackgroundColor || value.buttonHoverBackgroundColor || value.panelBackground || merged.cardHoverBackgroundColor,
    cardShadowSize: value.cardShadowVersion === "2" ? merged.cardShadowSize : DEFAULT_THEME.cardShadowSize,
    cardShadowBlur: value.cardShadowVersion === "2" ? merged.cardShadowBlur : (value.cardShadowSize || DEFAULT_THEME.cardShadowBlur),
    cardShadowOpacity: value.cardShadowVersion ? merged.cardShadowOpacity : DEFAULT_THEME.cardShadowOpacity,
    cardShadowVersion: DEFAULT_THEME.cardShadowVersion,
    buttonBackgroundColor: value.buttonBackgroundColor || value.panelBackground || merged.buttonBackgroundColor,
    buttonHoverBackgroundColor: value.buttonHoverBackgroundColor || value.modalBackground || value.panelBackground || merged.buttonHoverBackgroundColor,
    buttonPressedColor: value.buttonPressedColor || value.highlightColor || merged.buttonPressedColor,
    buttonSelectedBackgroundColor: value.buttonSelectedBackgroundColor || value.highlightColor || merged.buttonSelectedBackgroundColor,
    buttonDisabledBackgroundColor: value.buttonDisabledBackgroundColor || value.panelBackground || merged.buttonDisabledBackgroundColor,
    buttonBorderColor: value.buttonBorderColor || value.borderColor || merged.buttonBorderColor,
    buttonHoverBorderColor: value.buttonHoverBorderColor || value.highlightColor || merged.buttonHoverBorderColor,
    buttonPressedBorderColor: value.buttonPressedBorderColor || value.buttonPressedColor || value.highlightColor || merged.buttonPressedBorderColor,
    buttonSelectedBorderColor: value.buttonSelectedBorderColor || value.highlightColor || merged.buttonSelectedBorderColor,
    buttonDisabledBorderColor: value.buttonDisabledBorderColor || value.borderColor || merged.buttonDisabledBorderColor,
    buttonTextColor: value.buttonTextColor || value.mutedTextColor || merged.buttonTextColor,
    buttonHoverTextColor: value.buttonHoverTextColor || value.textColor || merged.buttonHoverTextColor,
    buttonPressedTextColor: value.buttonPressedTextColor || value.textColor || merged.buttonPressedTextColor,
    buttonSelectedTextColor: value.buttonSelectedTextColor || value.appBackground || merged.buttonSelectedTextColor,
    buttonDisabledTextColor: value.buttonDisabledTextColor || value.faintTextColor || merged.buttonDisabledTextColor,
    glyphColor: value.glyphColor || value.mutedTextColor || merged.glyphColor,
    glyphHoverColor: value.glyphHoverColor || value.textColor || merged.glyphHoverColor,
    glyphPressedColor: value.glyphPressedColor || value.glyphActiveColor || value.textColor || merged.glyphPressedColor,
    glyphSelectedColor: value.glyphSelectedColor || value.glyphActiveColor || value.appBackground || merged.glyphSelectedColor,
    glyphDisabledColor: value.glyphDisabledColor || value.faintTextColor || merged.glyphDisabledColor,
    searchGlyphColor: usesCurrentSchema && value.searchGlyphColor ? value.searchGlyphColor : (value.glyphColor || value.mutedTextColor || merged.mutedTextColor),
    searchGlyphHoverColor: usesCurrentSchema && value.searchGlyphHoverColor ? value.searchGlyphHoverColor : (value.glyphHoverColor || value.textColor || merged.textColor),
    searchGlyphFocusColor: usesCurrentSchema && value.searchGlyphFocusColor ? value.searchGlyphFocusColor : (value.highlightColor || merged.highlightColor),
    sliderBackgroundColor: value.sliderBackgroundColor || value.panelBackground || merged.sliderBackgroundColor,
    sliderBorderColor: value.sliderBorderColor || value.borderColor || merged.sliderBorderColor,
    sliderTrackColor: value.sliderTrackColor || value.borderColor || merged.sliderTrackColor,
    sliderThumbColor: value.sliderThumbColor || value.highlightColor || merged.sliderThumbColor,
    sliderThumbBorderColor: value.sliderThumbBorderColor || value.textColor || merged.sliderThumbBorderColor,
    colorPickerBorderColor: value.colorPickerBorderColor || value.borderColor || merged.colorPickerBorderColor,
    colorPickerBorderWidth: value.colorPickerBorderWidth || merged.colorPickerBorderWidth,
    toggleTrackOffColor: value.toggleTrackOffColor || value.appBackground || merged.toggleTrackOffColor,
    toggleTrackOnColor: value.toggleTrackOnColor || value.highlightColor || merged.toggleTrackOnColor,
    toggleThumbOffColor: value.toggleThumbOffColor || value.mutedTextColor || merged.toggleThumbOffColor,
    toggleThumbOnColor: value.toggleThumbOnColor || value.buttonSelectedTextColor || value.appBackground || merged.toggleThumbOnColor,
    toggleBorderOffColor: value.toggleBorderOffColor || value.borderColor || merged.toggleBorderOffColor,
    toggleBorderOnColor: value.toggleBorderOnColor || value.highlightColor || merged.toggleBorderOnColor,
    toggleRadius: value.toggleRadius || value.controlRadius || merged.toggleRadius,
    toggleThumbRadius: value.toggleThumbRadius || merged.toggleThumbRadius,
    checkboxBackgroundColor: value.checkboxBackgroundColor || value.appBackground || merged.checkboxBackgroundColor,
    checkboxCheckedBackgroundColor: value.checkboxCheckedBackgroundColor || value.highlightColor || merged.checkboxCheckedBackgroundColor,
    checkboxBorderColor: value.checkboxBorderColor || value.borderColor || merged.checkboxBorderColor,
    checkboxCheckColor: value.checkboxCheckColor || readableTextColor(value.checkboxCheckedBackgroundColor || value.highlightColor || merged.checkboxCheckedBackgroundColor),
    checkboxRadius: value.checkboxRadius || value.badgeRadius || merged.checkboxRadius,
    badgeFontSize: value.badgeFontSize && value.badgeFontSize !== "inherit" ? value.badgeFontSize : DEFAULT_THEME.badgeFontSize,
    scrollbarTrackColor: value.scrollbarTrackColor || themeColorWithAlpha(value.borderColor || merged.borderColor, "33"),
    scrollbarThumbColor: value.scrollbarThumbColor || value.borderColor || merged.scrollbarThumbColor,
    scrollbarThumbHoverColor: value.scrollbarThumbHoverColor || value.highlightColor || merged.scrollbarThumbHoverColor,
    dropdownMenuBackgroundColor: value.dropdownMenuBackgroundColor || value.modalBackground || merged.dropdownMenuBackgroundColor,
    dropdownMenuBorderColor: value.dropdownMenuBorderColor || value.borderColor || merged.dropdownMenuBorderColor,
    dropdownBlurAmount: value.dropdownBlurAmount || value.blurAmount || merged.dropdownBlurAmount,
    dropdownItemBackgroundColor: value.dropdownItemBackgroundColor || merged.dropdownItemBackgroundColor,
    dropdownItemTextColor: value.dropdownItemTextColor || value.mutedTextColor || merged.dropdownItemTextColor,
    dropdownItemBorderColor: value.dropdownItemBorderColor || merged.dropdownItemBorderColor,
    dropdownItemHoverBackgroundColor: value.dropdownItemHoverBackgroundColor || value.buttonHoverBackgroundColor || value.panelBackground || merged.dropdownItemHoverBackgroundColor,
    dropdownItemHoverTextColor: value.dropdownItemHoverTextColor || value.buttonHoverTextColor || value.textColor || merged.dropdownItemHoverTextColor,
    dropdownItemHoverBorderColor: value.dropdownItemHoverBorderColor || value.buttonHoverBorderColor || value.highlightColor || merged.dropdownItemHoverBorderColor,
    dropdownItemSelectedBackgroundColor: value.dropdownItemSelectedBackgroundColor || value.buttonSelectedBackgroundColor || value.highlightColor || merged.dropdownItemSelectedBackgroundColor,
    dropdownItemSelectedTextColor: value.dropdownItemSelectedTextColor || value.buttonSelectedTextColor || value.appBackground || merged.dropdownItemSelectedTextColor,
    dropdownItemSelectedBorderColor: value.dropdownItemSelectedBorderColor || value.buttonSelectedBorderColor || value.highlightColor || merged.dropdownItemSelectedBorderColor,
    dropdownItemPressedBackgroundColor: value.dropdownItemPressedBackgroundColor || value.buttonPressedColor || value.highlightColor || merged.dropdownItemPressedBackgroundColor,
    dropdownItemPressedTextColor: value.dropdownItemPressedTextColor || value.buttonPressedTextColor || value.appBackground || merged.dropdownItemPressedTextColor,
    dropdownItemPressedBorderColor: value.dropdownItemPressedBorderColor || value.buttonPressedBorderColor || value.highlightColor || merged.dropdownItemPressedBorderColor,
    dropdownGroupTextColor: value.dropdownGroupTextColor || value.faintTextColor || merged.dropdownGroupTextColor,
    pageHeaderRadius: value.pageHeaderRadius || value.cardRadius || merged.pageHeaderRadius,
    panelHeaderRadius: value.panelHeaderRadius || value.cardRadius || merged.panelHeaderRadius,
    listItemRadius: value.listItemRadius || value.controlRadius || merged.listItemRadius,
    progressRadius: value.progressRadius || value.scrollbarRadius || value.controlRadius || merged.progressRadius,
    buttonRadius: value.buttonRadius || value.controlRadius || merged.buttonRadius,
    dropdownMenuRadius: value.dropdownMenuRadius || value.cardRadius || merged.dropdownMenuRadius,
    modalRadius: value.modalRadius || value.windowRadius || merged.modalRadius,
    dropdownItemRadius: value.dropdownItemRadius || value.controlRadius || merged.dropdownItemRadius,
    textBoxBackgroundColor: value.textBoxBackgroundColor || value.panelBackground || merged.textBoxBackgroundColor,
    textBoxBorderColor: value.textBoxBorderColor || value.borderColor || merged.textBoxBorderColor,
    textBoxTextColor: value.textBoxTextColor || value.textColor || merged.textBoxTextColor,
    textBoxPlaceholderColor: value.textBoxPlaceholderColor || value.faintTextColor || merged.textBoxPlaceholderColor,
    textBoxHoverBorderColor: value.textBoxHoverBorderColor || value.highlightColor || merged.textBoxHoverBorderColor,
    textBoxFocusBackgroundColor: value.textBoxFocusBackgroundColor || value.modalBackground || value.panelBackground || merged.textBoxFocusBackgroundColor,
    textBoxFocusBorderColor: value.textBoxFocusBorderColor || value.highlightColor || merged.textBoxFocusBorderColor,
    textBoxSelectionBackgroundColor: value.textBoxSelectionBackgroundColor || value.highlightColor || merged.textBoxSelectionBackgroundColor,
    textBoxSelectionTextColor: value.textBoxSelectionTextColor || value.appBackground || merged.textBoxSelectionTextColor,
    textBoxRadius: value.textBoxRadius || value.controlRadius || merged.textBoxRadius,
    appWindowRadius: value.appWindowRadius || value.windowRadius || merged.appWindowRadius,
    appWindowBorderWidth: value.appWindowBorderWidth || merged.appWindowBorderWidth,
    appWindowContentRadiusOffset: value.appWindowContentRadiusOffset || merged.appWindowContentRadiusOffset,
    appWindowBorderColor: value.appWindowBorderColor || value.borderColor || merged.appWindowBorderColor,
    appWindowUnfocusedBorderColor: value.appWindowUnfocusedBorderColor || themeColorWithAlpha(value.borderColor || merged.borderColor, "99"),
    appWindowCornerSmoothingMode: value.appWindowCornerSmoothingMode || merged.appWindowCornerSmoothingMode,
    appWindowCornerSmoothingPercent: value.appWindowCornerSmoothingPercent || merged.appWindowCornerSmoothingPercent,
    appWindowInnerGlowEnabled: value.appWindowInnerGlowEnabled ?? merged.appWindowInnerGlowEnabled,
    appWindowInnerGlowUseBorderColor: value.appWindowInnerGlowUseBorderColor ?? merged.appWindowInnerGlowUseBorderColor,
    appWindowInnerGlowColor: value.appWindowInnerGlowColor || merged.appWindowInnerGlowColor,
    appWindowInnerGlowSize: value.appWindowInnerGlowSize || merged.appWindowInnerGlowSize,
    appWindowInnerGlowSpread: value.appWindowInnerGlowSpread || merged.appWindowInnerGlowSpread,
    appWindowInnerGlowOpacity: value.appWindowInnerGlowOpacity || merged.appWindowInnerGlowOpacity,
    appWindowInnerGlowUnfocusedOpacity: value.appWindowInnerGlowUnfocusedOpacity || merged.appWindowInnerGlowUnfocusedOpacity,
    appWindowShadowEnabled: value.appWindowShadowEnabled ?? merged.appWindowShadowEnabled,
    appWindowShadowMargin: value.appWindowShadowMargin || merged.appWindowShadowMargin,
    appWindowShadowOffsetX: value.appWindowShadowOffsetX || merged.appWindowShadowOffsetX,
    appWindowShadowOffsetY: value.appWindowShadowOffsetY || merged.appWindowShadowOffsetY,
    appWindowShadowBlur: value.appWindowShadowBlur || merged.appWindowShadowBlur,
    appWindowShadowSpread: value.appWindowShadowSpread || merged.appWindowShadowSpread,
    appWindowShadowColor: value.appWindowShadowColor || merged.appWindowShadowColor,
    appWindowShadowOpacity: value.appWindowShadowOpacity || merged.appWindowShadowOpacity,
    appWindowUnfocusedShadowColor: value.appWindowUnfocusedShadowColor || value.appWindowShadowColor || merged.appWindowUnfocusedShadowColor,
    appWindowUnfocusedShadowOpacity: value.appWindowUnfocusedShadowOpacity || merged.appWindowUnfocusedShadowOpacity,
    scrollbarRadius: usesCurrentSchema
      ? `${Math.min(14, Math.max(0, parseFloat(merged.scrollbarRadius) || 0))}px`
      : DEFAULT_THEME.scrollbarRadius,
    settingsSidebarBackgroundColor: usesCurrentSchema && value.settingsSidebarBackgroundColor ? value.settingsSidebarBackgroundColor : (value.panelBackground || merged.panelBackground),
    settingsSidebarSurfaceOpacity: usesCurrentSchema && value.settingsSidebarSurfaceOpacity ? value.settingsSidebarSurfaceOpacity : (value.surfaceOpacity || merged.surfaceOpacity),
    settingsSidebarBlurAmount: usesCurrentSchema && value.settingsSidebarBlurAmount ? value.settingsSidebarBlurAmount : (value.blurAmount || merged.blurAmount),
    settingsSidebarTextColor: value.settingsSidebarTextColor || value.mutedTextColor || merged.settingsSidebarTextColor,
    settingsSidebarActiveColor: usesCurrentSchema && value.settingsSidebarActiveColor ? value.settingsSidebarActiveColor : (value.highlightColor || merged.highlightColor),
    settingsSidebarActiveTextColor: value.settingsSidebarActiveTextColor || readableTextColor(value.settingsSidebarActiveColor || value.highlightColor || merged.settingsSidebarActiveColor),
    settingsSidebarPressedColor: usesCurrentSchema && value.settingsSidebarPressedColor ? value.settingsSidebarPressedColor : (value.buttonPressedColor || value.highlightColor || merged.settingsSidebarPressedColor),
    settingsSidebarPressedTextColor: value.settingsSidebarPressedTextColor || readableTextColor(value.settingsSidebarPressedColor || value.buttonPressedColor || value.highlightColor || merged.settingsSidebarPressedColor),
    settingsSidebarHeaderColor: usesCurrentSchema && value.settingsSidebarHeaderColor ? value.settingsSidebarHeaderColor : (value.textColor || merged.textColor),
    settingsPageHeaderColor: usesCurrentSchema && value.settingsPageHeaderColor ? value.settingsPageHeaderColor : (value.textColor || merged.textColor),
    settingsSectionHeaderColor: usesCurrentSchema && value.settingsSectionHeaderColor ? value.settingsSectionHeaderColor : (value.textColor || merged.textColor),
    settingsSubheaderColor: usesCurrentSchema && value.settingsSubheaderColor ? value.settingsSubheaderColor : (value.mutedTextColor || merged.mutedTextColor),
    mediaSidebarBackgroundColor: parseThemeColor(value.mediaSidebarBackgroundColor || value.panelBackground || merged.mediaSidebarBackgroundColor).hex,
    mediaSidebarSurfaceOpacity: usesCurrentSchema && value.mediaSidebarSurfaceOpacity != null ? String(value.mediaSidebarSurfaceOpacity) : (value.surfaceOpacity || merged.mediaSidebarSurfaceOpacity),
    mediaSidebarBlurAmount: usesCurrentSchema && value.mediaSidebarBlurAmount ? value.mediaSidebarBlurAmount : (value.blurAmount || merged.mediaSidebarBlurAmount),
    mediaSidebarBorderColor: value.mediaSidebarBorderColor || value.borderColor || merged.mediaSidebarBorderColor,
    mediaSidebarDividerColor: value.mediaSidebarDividerColor || value.borderColor || merged.mediaSidebarDividerColor,
    mediaSidebarTextColor: value.mediaSidebarTextColor || value.textColor || merged.mediaSidebarTextColor,
    mediaSidebarMutedTextColor: value.mediaSidebarMutedTextColor || value.mutedTextColor || merged.mediaSidebarMutedTextColor,
    mediaSidebarSectionTextColor: value.mediaSidebarSectionTextColor || value.mutedTextColor || merged.mediaSidebarSectionTextColor,
    mediaSidebarCountTextColor: value.mediaSidebarCountTextColor || value.mutedTextColor || merged.mediaSidebarCountTextColor,
    mediaSidebarButtonBackgroundColor: value.mediaSidebarButtonBackgroundColor || merged.mediaSidebarButtonBackgroundColor,
    mediaSidebarButtonHoverBackgroundColor: value.mediaSidebarButtonHoverBackgroundColor || value.buttonHoverBackgroundColor || merged.mediaSidebarButtonHoverBackgroundColor,
    mediaSidebarButtonActiveBackgroundColor: value.mediaSidebarButtonActiveBackgroundColor || value.settingsSidebarActiveColor || value.highlightColor || merged.mediaSidebarButtonActiveBackgroundColor,
    mediaSidebarButtonBorderColor: value.mediaSidebarButtonBorderColor || merged.mediaSidebarButtonBorderColor,
    mediaSidebarButtonHoverBorderColor: value.mediaSidebarButtonHoverBorderColor || value.buttonHoverBorderColor || value.highlightColor || merged.mediaSidebarButtonHoverBorderColor,
    mediaSidebarButtonActiveBorderColor: value.mediaSidebarButtonActiveBorderColor || value.highlightColor || merged.mediaSidebarButtonActiveBorderColor,
    mediaSidebarButtonTextColor: value.mediaSidebarButtonTextColor || value.textColor || merged.mediaSidebarButtonTextColor,
    mediaSidebarButtonHoverTextColor: value.mediaSidebarButtonHoverTextColor || value.textColor || merged.mediaSidebarButtonHoverTextColor,
    mediaSidebarButtonActiveTextColor: value.mediaSidebarButtonActiveTextColor || value.textColor || merged.mediaSidebarButtonActiveTextColor,
    mediaSidebarGlyphColor: value.mediaSidebarGlyphColor || value.mutedTextColor || merged.mediaSidebarGlyphColor,
    mediaSidebarGlyphHoverColor: value.mediaSidebarGlyphHoverColor || value.textColor || merged.mediaSidebarGlyphHoverColor,
    mediaSidebarGlyphActiveColor: value.mediaSidebarGlyphActiveColor || value.highlightColor || merged.mediaSidebarGlyphActiveColor,
    sidebarToggleBackgroundColor: value.sidebarToggleBackgroundColor || merged.sidebarToggleBackgroundColor,
    sidebarToggleHoverBackgroundColor: value.sidebarToggleHoverBackgroundColor || value.buttonHoverBackgroundColor || merged.sidebarToggleHoverBackgroundColor,
    sidebarToggleBorderColor: value.sidebarToggleBorderColor || value.buttonBorderColor || merged.sidebarToggleBorderColor,
    sidebarToggleHoverBorderColor: value.sidebarToggleHoverBorderColor || value.buttonHoverBorderColor || merged.sidebarToggleHoverBorderColor,
    sidebarToggleGlyphColor: value.sidebarToggleGlyphColor || value.glyphColor || merged.sidebarToggleGlyphColor,
    sidebarToggleHoverGlyphColor: value.sidebarToggleHoverGlyphColor || value.glyphHoverColor || merged.sidebarToggleHoverGlyphColor,
    mediaSidebarRadius: value.mediaSidebarRadius || value.windowRadius || merged.mediaSidebarRadius,
    mediaSidebarButtonRadius: value.mediaSidebarButtonRadius || value.controlRadius || merged.mediaSidebarButtonRadius,
    mediaSidebarGradientEnabled: value.mediaSidebarGradientEnabled ?? merged.mediaSidebarGradientEnabled,
    mediaSidebarGradientOffsetX: value.mediaSidebarGradientOffsetX || merged.mediaSidebarGradientOffsetX,
    mediaSidebarGradientOffsetY: value.mediaSidebarGradientOffsetY || merged.mediaSidebarGradientOffsetY,
    mediaSidebarGradientBlur: value.mediaSidebarGradientBlur || merged.mediaSidebarGradientBlur,
    mediaSidebarGradientWidth: value.mediaSidebarGradientWidth || merged.mediaSidebarGradientWidth,
    mediaSidebarGradientHeight: value.mediaSidebarGradientHeight || merged.mediaSidebarGradientHeight,
    mediaSidebarGradientColor: value.mediaSidebarGradientColor || merged.mediaSidebarGradientColor,
    mediaSidebarGradientStartColor: value.mediaSidebarGradientStartColor || value.mediaSidebarGradientColor || merged.mediaSidebarGradientStartColor,
    mediaSidebarGradientEndColor: value.mediaSidebarGradientEndColor || value.mediaSidebarGradientColor || merged.mediaSidebarGradientEndColor,
    mediaSidebarGradientHighlightColor: value.mediaSidebarGradientHighlightColor || value.mediaSidebarGradientColor || merged.mediaSidebarGradientHighlightColor,
    mediaSidebarGradientOpacity: value.mediaSidebarGradientOpacity || merged.mediaSidebarGradientOpacity,
    mediaSidebarActiveGradientStartColor: value.mediaSidebarActiveGradientStartColor || value.highlightColor || merged.mediaSidebarActiveGradientStartColor,
    mediaSidebarActiveGradientEndColor: value.mediaSidebarActiveGradientEndColor || value.panelBackground || merged.mediaSidebarActiveGradientEndColor,
    mediaSidebarActiveGradientBorderColor: value.mediaSidebarActiveGradientBorderColor || value.highlightColor || merged.mediaSidebarActiveGradientBorderColor,
    mediaSidebarActiveGradientOpacity: value.mediaSidebarActiveGradientOpacity || merged.mediaSidebarActiveGradientOpacity,
    themeSchemaVersion: DEFAULT_THEME.themeSchemaVersion,
    cardGlowEnabled: value.cardGlowEnabled ?? legacyGlowEnabled("neonGlowCardsEnabled"),
    cardGlowSize: value.cardGlowSize || value.neonGlowSize || merged.cardGlowSize,
    cardGlowSpread: value.cardGlowSpread || value.neonGlowSpread || merged.cardGlowSpread,
    cardGlowHoverBoost: value.cardGlowHoverBoost || value.neonGlowHoverBoost || merged.cardGlowHoverBoost,
    cardGlowColor: value.cardGlowColor || value.neonGlowColor || value.highlightColor || merged.cardGlowColor,
    cardGlowOpacity: value.cardGlowOpacity || value.neonGlowOpacity || merged.cardGlowOpacity,
    cardGlowOutlineOpacity: value.cardGlowOutlineOpacity || value.neonGlowOutlineOpacity || merged.cardGlowOutlineOpacity,
    headerGlowEnabled: value.headerGlowEnabled ?? legacyGlowEnabled("neonGlowBarsEnabled"),
    headerGlowSize: value.headerGlowSize || value.neonGlowSize || merged.headerGlowSize,
    headerGlowSpread: value.headerGlowSpread || value.neonGlowSpread || merged.headerGlowSpread,
    headerGlowColor: value.headerGlowColor || value.neonGlowColor || value.highlightColor || merged.headerGlowColor,
    headerGlowOpacity: value.headerGlowOpacity || value.neonGlowOpacity || merged.headerGlowOpacity,
    headerGlowOutlineOpacity: value.headerGlowOutlineOpacity || value.neonGlowOutlineOpacity || merged.headerGlowOutlineOpacity,
    filterGlowEnabled: value.filterGlowEnabled ?? legacyGlowEnabled("neonGlowBarsEnabled"),
    filterGlowSize: value.filterGlowSize || value.neonGlowSize || merged.filterGlowSize,
    filterGlowSpread: value.filterGlowSpread || value.neonGlowSpread || merged.filterGlowSpread,
    filterGlowColor: value.filterGlowColor || value.neonGlowColor || value.highlightColor || merged.filterGlowColor,
    filterGlowOpacity: value.filterGlowOpacity || value.neonGlowOpacity || merged.filterGlowOpacity,
    filterGlowOutlineOpacity: value.filterGlowOutlineOpacity || value.neonGlowOutlineOpacity || merged.filterGlowOutlineOpacity,
    footerGlowEnabled: value.footerGlowEnabled ?? legacyGlowEnabled("neonGlowBarsEnabled"),
    footerGlowSize: value.footerGlowSize || value.neonGlowSize || merged.footerGlowSize,
    footerGlowSpread: value.footerGlowSpread || value.neonGlowSpread || merged.footerGlowSpread,
    footerGlowColor: value.footerGlowColor || value.neonGlowColor || value.highlightColor || merged.footerGlowColor,
    footerGlowOpacity: value.footerGlowOpacity || value.neonGlowOpacity || merged.footerGlowOpacity,
    footerGlowOutlineOpacity: value.footerGlowOutlineOpacity || value.neonGlowOutlineOpacity || merged.footerGlowOutlineOpacity,
    windowGlowEnabled: value.windowGlowEnabled ?? legacyGlowEnabled("neonGlowWindowsEnabled"),
    windowGlowSize: value.windowGlowSize || value.neonGlowSize || merged.windowGlowSize,
    windowGlowSpread: value.windowGlowSpread || value.neonGlowSpread || merged.windowGlowSpread,
    windowGlowColor: value.windowGlowColor || value.neonGlowColor || value.highlightColor || merged.windowGlowColor,
    windowGlowOpacity: value.windowGlowOpacity || value.neonGlowOpacity || merged.windowGlowOpacity,
    windowGlowOutlineOpacity: value.windowGlowOutlineOpacity || value.neonGlowOutlineOpacity || merged.windowGlowOutlineOpacity,
    controlGlowEnabled: value.controlGlowEnabled ?? legacyGlowEnabled("neonGlowControlsEnabled"),
    controlGlowSize: value.controlGlowSize || value.neonGlowSize || merged.controlGlowSize,
    controlGlowSpread: value.controlGlowSpread || value.neonGlowSpread || merged.controlGlowSpread,
    controlGlowHoverBoost: value.controlGlowHoverBoost || value.neonGlowHoverBoost || merged.controlGlowHoverBoost,
    controlGlowColor: value.controlGlowColor || value.neonGlowColor || value.highlightColor || merged.controlGlowColor,
    controlGlowOpacity: value.controlGlowOpacity || value.neonGlowOpacity || merged.controlGlowOpacity,
    controlGlowOutlineOpacity: value.controlGlowOutlineOpacity || value.neonGlowOutlineOpacity || merged.controlGlowOutlineOpacity,
  };
}

/** Builds a stable signature of a theme's identity (ignoring cover source) for comparison/dedup. */
export function themeIdentitySignature(value = {}) {
  const hydrated = hydrateTheme(value);
  return JSON.stringify(
    Object.keys(DEFAULT_THEME)
      .filter((key) => key !== "coverSource")
      .sort()
      .map((key) => [key, hydrated[key] ?? null]),
  );
}

/** Loads the user's saved theme from localStorage, hydrated against current defaults. */
export function loadSavedTheme() {
  try {
    const savedTheme = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) || "{}").theme || {};
    return hydrateTheme(savedTheme);
  } catch {
    return DEFAULT_THEME;
  }
}

/** Persists the given theme to localStorage. */
export function saveTheme(theme) {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ theme }));
}

/** Loads the user's saved custom theme presets (legacy + portable formats), de-duplicated by name. */
export function loadSavedThemes() {
  let portableThemes = [];
  try {
    const portable = getHostBridge()?.loadThemes?.();
    if (Array.isArray(portable)) portableThemes = portable;
  } catch {}
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_THEMES_STORAGE_KEY) || "[]");
    const legacyThemes = Array.isArray(saved) ? saved : [];
    return [...legacyThemes, ...portableThemes].filter((item, index, all) => item?.name && item?.theme && all.findLastIndex((candidate) => candidate.name === item.name) === index);
  } catch {
    return portableThemes;
  }
}

/** Persists the user's saved custom theme presets to localStorage. */
export function saveSavedThemes(themes) {
  localStorage.setItem(SAVED_THEMES_STORAGE_KEY, JSON.stringify(themes));
}

/** Normalizes a theme boolean-ish toggle value (handles legacy string/undefined representations). */
export function themeToggleEnabled(value) {
  return value !== false && value !== "false" && value !== "0";
}

/** Converts a theme object into a React inline `style` object of CSS custom properties. */
export function themeStyle(theme) {
  const merged = { ...DEFAULT_THEME, ...theme };
  const style = Object.fromEntries(Object.entries(merged).map(([key, value]) => ["--" + key.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase()), String(value)]));
  ["card", "header", "filter", "footer"].forEach((surface) => {
    const enabledKey = surface + "ShadowEnabled";
    const opacityKey = surface + "ShadowOpacity";
    style["--" + surface + "-shadow-opacity-effective"] = themeToggleEnabled(merged[enabledKey]) ? merged[opacityKey] : "0%";
  });
  const deriveThemeValue = (key, fallback) => {
    const current = merged[key];
    const defaultValue = DEFAULT_THEME[key];
    return (current === undefined || current === defaultValue) ? fallback : current;
  };
  const derivedSidebar = {
    mediaSidebarBackgroundColor: deriveThemeValue("mediaSidebarBackgroundColor", merged.panelBackground),
    mediaSidebarBorderColor: deriveThemeValue("mediaSidebarBorderColor", merged.borderColor),
    mediaSidebarDividerColor: deriveThemeValue("mediaSidebarDividerColor", merged.borderColor),
    mediaSidebarTextColor: deriveThemeValue("mediaSidebarTextColor", merged.textColor),
    mediaSidebarMutedTextColor: deriveThemeValue("mediaSidebarMutedTextColor", merged.mutedTextColor),
    mediaSidebarSectionTextColor: deriveThemeValue("mediaSidebarSectionTextColor", merged.mutedTextColor),
    mediaSidebarCountTextColor: deriveThemeValue("mediaSidebarCountTextColor", merged.mutedTextColor),
    mediaSidebarButtonHoverBackgroundColor: deriveThemeValue("mediaSidebarButtonHoverBackgroundColor", merged.modalBackground),
    mediaSidebarButtonHoverBorderColor: deriveThemeValue("mediaSidebarButtonHoverBorderColor", merged.highlightColor),
    mediaSidebarButtonActiveBackgroundColor: deriveThemeValue("mediaSidebarButtonActiveBackgroundColor", themeColorWithAlpha(merged.highlightColor, "33")),
    mediaSidebarButtonActiveBorderColor: deriveThemeValue("mediaSidebarButtonActiveBorderColor", merged.highlightColor),
    mediaSidebarButtonTextColor: deriveThemeValue("mediaSidebarButtonTextColor", merged.textColor),
    mediaSidebarButtonHoverTextColor: deriveThemeValue("mediaSidebarButtonHoverTextColor", merged.textColor),
    mediaSidebarButtonActiveTextColor: deriveThemeValue("mediaSidebarButtonActiveTextColor", merged.textColor),
    mediaSidebarGlyphColor: deriveThemeValue("mediaSidebarGlyphColor", merged.mutedTextColor),
    mediaSidebarGlyphHoverColor: deriveThemeValue("mediaSidebarGlyphHoverColor", merged.textColor),
    mediaSidebarGlyphActiveColor: deriveThemeValue("mediaSidebarGlyphActiveColor", merged.highlightColor),
    mediaSidebarGradientOffsetX: deriveThemeValue("mediaSidebarGradientOffsetX", merged.mediaSidebarGradientOffsetX || "0px"),
    mediaSidebarGradientOffsetY: deriveThemeValue("mediaSidebarGradientOffsetY", merged.mediaSidebarGradientOffsetY || "0px"),
    mediaSidebarGradientBlur: deriveThemeValue("mediaSidebarGradientBlur", merged.mediaSidebarGradientBlur || "24px"),
    mediaSidebarGradientWidth: deriveThemeValue("mediaSidebarGradientWidth", merged.mediaSidebarGradientWidth || "148px"),
    mediaSidebarGradientHeight: deriveThemeValue("mediaSidebarGradientHeight", merged.mediaSidebarGradientHeight || "100%"),
    mediaSidebarGradientColor: deriveThemeValue("mediaSidebarGradientColor", "#eaf2ff"),
    mediaSidebarGradientStartColor: deriveThemeValue("mediaSidebarGradientStartColor", merged.mediaSidebarGradientColor || "#eaf2ff"),
    mediaSidebarGradientEndColor: deriveThemeValue("mediaSidebarGradientEndColor", merged.mediaSidebarGradientColor || "#eaf2ff"),
    mediaSidebarGradientHighlightColor: deriveThemeValue("mediaSidebarGradientHighlightColor", merged.mediaSidebarGradientColor || "#eaf2ff"),
    mediaSidebarActiveGradientStartColor: deriveThemeValue("mediaSidebarActiveGradientStartColor", `color-mix(in srgb, ${merged.highlightColor} 28%, ${merged.panelBackground} 72%)`),
    mediaSidebarActiveGradientEndColor: deriveThemeValue("mediaSidebarActiveGradientEndColor", `color-mix(in srgb, ${merged.highlightColor} 14%, ${merged.panelBackground} 86%)`),
    mediaSidebarActiveGradientBorderColor: deriveThemeValue("mediaSidebarActiveGradientBorderColor", `color-mix(in srgb, ${merged.highlightColor} 62%, ${merged.borderColor} 38%)`),
    settingsSidebarBackgroundColor: deriveThemeValue("settingsSidebarBackgroundColor", merged.panelBackground),
    settingsSidebarTextColor: deriveThemeValue("settingsSidebarTextColor", merged.mutedTextColor),
    settingsSidebarActiveColor: deriveThemeValue("settingsSidebarActiveColor", merged.highlightColor),
    settingsSidebarActiveTextColor: deriveThemeValue("settingsSidebarActiveTextColor", readableTextColor(merged.highlightColor)),
  };
  Object.entries(derivedSidebar).forEach(([key, value]) => {
    style["--" + key.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase())] = String(value);
  });
  const headerGradientEnabled = themeToggleEnabled(merged.headerGradientEnabled);
  style["--header-gradient-image"] = headerGradientEnabled
    ? `linear-gradient(${merged.headerGradientAngle || "90deg"}, ${merged.headerGradientStartColor || merged.headerBackgroundColor || DEFAULT_THEME.headerGradientStartColor} ${merged.headerGradientStartStop || "0%"}, ${merged.headerGradientEndColor || merged.headerBackgroundColor || DEFAULT_THEME.headerGradientEndColor} ${merged.headerGradientEndStop || "100%"})`
    : "none";
  style["--workspace-gradient-angle"] = String(merged.workspaceGradientAngle || "180deg");
  style["--workspace-gradient-start-color"] = String(merged.workspaceGradientStartColor || merged.appBackground);
  style["--workspace-gradient-mid-color"] = String(merged.workspaceGradientMidColor || merged.panelBackground);
  style["--workspace-gradient-end-color"] = String(merged.workspaceGradientEndColor || merged.appBackground);
  style["--workspace-gradient-start-stop"] = String(merged.workspaceGradientStartStop || "0%");
  style["--workspace-gradient-mid-stop"] = String(merged.workspaceGradientMidStop || "50%");
  style["--workspace-gradient-end-stop"] = String(merged.workspaceGradientEndStop || "100%");
  style["--workspace-gradient-opacity-effective"] = themeToggleEnabled(merged.workspaceGradientEnabled) ? String(merged.workspaceGradientOpacity || "100%") : "0%";
  style["--workspace-bloom-opacity-effective"] = themeToggleEnabled(merged.workspaceBloomEnabled) ? String(merged.workspaceBloomOpacity || "0%") : "0%";
  style["--workspace-bloom-color"] = String(merged.workspaceBloomColor || merged.highlightColor);
  style["--workspace-bloom-x"] = String(merged.workspaceBloomX || "18%");
  style["--workspace-bloom-y"] = String(merged.workspaceBloomY || "8%");
  style["--workspace-bloom-size"] = String(merged.workspaceBloomSize || "520px");
  style["--panel-gradient-angle"] = String(merged.panelGradientAngle || "180deg");
  style["--panel-gradient-start-color"] = String(merged.panelGradientStartColor || merged.textColor);
  style["--panel-gradient-mid-color"] = String(merged.panelGradientMidColor || merged.panelBackground);
  style["--panel-gradient-end-color"] = String(merged.panelGradientEndColor || merged.panelBackground);
  style["--panel-gradient-start-stop"] = String(merged.panelGradientStartStop || "0%");
  style["--panel-gradient-mid-stop"] = String(merged.panelGradientMidStop || "38%");
  style["--panel-gradient-end-stop"] = String(merged.panelGradientEndStop || "100%");
  style["--panel-gradient-start-opacity-effective"] = themeToggleEnabled(merged.panelGradientEnabled) ? String(merged.panelGradientStartOpacity || "4%") : "0%";
  style["--panel-gradient-mid-opacity-effective"] = themeToggleEnabled(merged.panelGradientEnabled) ? String(merged.panelGradientMidOpacity || "0%") : "0%";
  style["--panel-gradient-end-opacity-effective"] = themeToggleEnabled(merged.panelGradientEnabled) ? String(merged.panelGradientEndOpacity || "0%") : "0%";
  const panelGradientEnabled = themeToggleEnabled(merged.panelGradientEnabled);
  const panelGradientStop = (color, opacity, stop) => `${colorWithOpacity(color, panelGradientEnabled ? (parseFloat(opacity) || 0) / 100 : 0)} ${stop}`;
  style["--panel-gradient-image"] = `linear-gradient(${merged.panelGradientAngle || "180deg"}, ${panelGradientStop(merged.panelGradientStartColor || merged.textColor, merged.panelGradientStartOpacity || "4%", merged.panelGradientStartStop || "0%")}, ${panelGradientStop(merged.panelGradientMidColor || merged.panelBackground, merged.panelGradientMidOpacity || "0%", merged.panelGradientMidStop || "38%")}, ${panelGradientStop(merged.panelGradientEndColor || merged.panelBackground, merged.panelGradientEndOpacity || "0%", merged.panelGradientEndStop || "100%")})`;
  style["--section-header-gradient-angle"] = String(merged.sectionHeaderGradientAngle || "90deg");
  style["--section-header-gradient-color"] = String(merged.sectionHeaderGradientColor || merged.highlightColor);
  style["--section-header-gradient-opacity-effective"] = themeToggleEnabled(merged.sectionHeaderGradientEnabled) ? String(merged.sectionHeaderGradientOpacity || "14%") : "0%";
  style["--section-header-gradient-reach"] = String(merged.sectionHeaderGradientReach || "44%");
  style["--section-header-bloom-color"] = String(merged.sectionHeaderBloomColor || merged.highlightColor);
  style["--section-header-bloom-opacity-effective"] = themeToggleEnabled(merged.sectionHeaderBloomEnabled) ? String(merged.sectionHeaderBloomOpacity || "19%") : "0%";
  style["--section-header-bloom-width"] = String(merged.sectionHeaderBloomWidth || "430px");
  const surfaceNoiseEnabled = themeToggleEnabled(merged.surfaceNoiseEnabled);
  const surfaceNoiseFrequencies = { fine: "0.82", medium: "0.48", heavy: "0.24" };
  const surfaceNoiseFrequency = surfaceNoiseFrequencies[merged.surfaceNoiseStyle] || surfaceNoiseFrequencies.fine;
  const surfaceNoiseOpacity = Math.max(0, Math.min(1, (Number.parseFloat(merged.surfaceNoiseAmount || "4") || 0) / 100));
  const surfaceNoiseTint = String(merged.surfaceNoiseTint || "#ffffff");
  const surfaceNoiseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${surfaceNoiseFrequency}" numOctaves="3" seed="37" stitchTiles="stitch" result="noise"/><feColorMatrix in="noise" type="saturate" values="0" result="mono"/><feFlood flood-color="${surfaceNoiseTint}" result="tint"/><feComposite in="tint" in2="mono" operator="in" result="colored"/><feComponentTransfer in="colored"><feFuncA type="linear" slope="${surfaceNoiseOpacity}"/></feComponentTransfer></filter><rect width="128" height="128" filter="url(#n)"/></svg>`;
  const surfaceNoiseUrl = `url("data:image/svg+xml,${encodeURIComponent(surfaceNoiseSvg)}")`;
  style["--surface-noise-image"] = surfaceNoiseEnabled ? surfaceNoiseUrl : "none";
  style["--workspace-noise-image"] = surfaceNoiseEnabled && themeToggleEnabled(merged.surfaceNoiseWorkspaceEnabled) ? surfaceNoiseUrl : "none";
  style["--panel-noise-image"] = surfaceNoiseEnabled && themeToggleEnabled(merged.surfaceNoisePanelsEnabled) ? surfaceNoiseUrl : "none";
  style["--surface-noise-size"] = String(merged.surfaceNoiseScale || "96px");
  style["--surface-noise-blend-mode"] = String(merged.surfaceNoiseBlendMode || "soft-light");
  const sidebarNoiseFrequencies = { fine: "0.82", medium: "0.48", heavy: "0.24" };
  const sidebarNoiseFrequency = sidebarNoiseFrequencies[merged.sidebarSurfaceNoiseStyle] || sidebarNoiseFrequencies.fine;
  const sidebarNoiseOpacity = Math.max(0, Math.min(1, (Number.parseFloat(merged.sidebarSurfaceNoiseAmount || "4") || 0) / 100));
  const sidebarNoiseTint = String(merged.sidebarSurfaceNoiseTint || "#ffffff");
  const sidebarNoiseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${sidebarNoiseFrequency}" numOctaves="3" seed="73" stitchTiles="stitch" result="noise"/><feColorMatrix in="noise" type="saturate" values="0" result="mono"/><feFlood flood-color="${sidebarNoiseTint}" result="tint"/><feComposite in="tint" in2="mono" operator="in" result="colored"/><feComponentTransfer in="colored"><feFuncA type="linear" slope="${sidebarNoiseOpacity}"/></feComponentTransfer></filter><rect width="128" height="128" filter="url(#n)"/></svg>`;
  const sidebarNoiseUrl = `url("data:image/svg+xml,${encodeURIComponent(sidebarNoiseSvg)}")`;
  style["--sidebar-noise-image"] = themeToggleEnabled(merged.sidebarSurfaceNoiseEnabled) ? sidebarNoiseUrl : "none";
  style["--sidebar-noise-size"] = String(merged.sidebarSurfaceNoiseScale || "96px");
  style["--sidebar-noise-blend-mode"] = String(merged.sidebarSurfaceNoiseBlendMode || "soft-light");
  style["--mister-section-accent"] = String(merged.highlightColor);
  style["--mister-section-accent-ink"] = String(readableTextColor(merged.highlightColor));
  style["--mister-soft-surface"] = `color-mix(in srgb, ${merged.panelBackground} calc(${merged.surfaceOpacity ?? "1"} * 100%), transparent)`;
  style["--mister-soft-surface-strong"] = `color-mix(in srgb, ${merged.modalBackground} calc(${merged.surfaceOpacity ?? "1"} * 100%), transparent)`;
  const appWindowCornerSmoothingMode = merged.appWindowCornerSmoothingMode || "off";
  style["--app-window-corner-smoothing-effective"] = appWindowCornerSmoothingMode === "system-ui"
    ? "system-ui"
    : appWindowCornerSmoothingMode === "custom"
      ? (merged.appWindowCornerSmoothingPercent || "60%")
      : "0%";
  const themedAppWindowBorderColor = (!merged.appWindowBorderColor || merged.appWindowBorderColor === DEFAULT_THEME.appWindowBorderColor)
    ? (merged.borderColor || DEFAULT_THEME.borderColor)
    : merged.appWindowBorderColor;
  const themedAppWindowUnfocusedBorderColor = (!merged.appWindowUnfocusedBorderColor || merged.appWindowUnfocusedBorderColor === DEFAULT_THEME.appWindowUnfocusedBorderColor)
    ? themeColorWithAlpha(merged.borderColor || DEFAULT_THEME.borderColor, "99")
    : merged.appWindowUnfocusedBorderColor;
  style["--app-window-border-color"] = String(themedAppWindowBorderColor);
  style["--app-window-unfocused-border-color"] = String(themedAppWindowUnfocusedBorderColor);
  const appWindowShadowEnabled = themeToggleEnabled(merged.appWindowShadowEnabled);
  style["--app-window-shadow-opacity-effective"] = appWindowShadowEnabled ? merged.appWindowShadowOpacity : "0%";
  style["--app-window-unfocused-shadow-opacity-effective"] = appWindowShadowEnabled ? merged.appWindowUnfocusedShadowOpacity : "0%";
  style["--app-window-shadow-margin-effective"] = appWindowShadowEnabled ? merged.appWindowShadowMargin : "0px";
  const appWindowRadiusValue = Number.parseFloat(merged.appWindowRadius || "0") || 0;
  const appWindowContentRadiusOffsetValue = Math.max(0, Number.parseFloat(merged.appWindowContentRadiusOffset || "0") || 0);
  style["--app-window-master-radius"] = `${appWindowRadiusValue}px`;
  style["--app-window-content-radius-offset-effective"] = `${appWindowContentRadiusOffsetValue}px`;
  style["--app-window-border-radius-effective"] = `${appWindowRadiusValue}px`;
  // Filled border geometry rasterizes most consistently at whole-pixel widths.
  // Normalize legacy/custom theme values to the supported 0px, 1px, or 2px set.
  const appWindowBorderWidthValue = Math.max(0, Math.min(2, Math.round(Number.parseFloat(merged.appWindowBorderWidth || "0") || 0)));
  style["--app-window-border-width-effective"] = `${appWindowBorderWidthValue}px`;
  const appWindowInnerRadiusValue = Math.max(0, appWindowRadiusValue - appWindowBorderWidthValue - appWindowContentRadiusOffsetValue);
  style["--app-window-inner-radius-effective"] = `${appWindowInnerRadiusValue}px`;
  style["--app-window-hairline-radius-effective"] = `${appWindowInnerRadiusValue}px`;
  style["--app-window-outer-effects-radius-effective"] = `${appWindowRadiusValue}px`;
  style["--app-window-border-opacity-effective"] = appWindowBorderWidthValue > 0 ? "100%" : "0%";
  style["--app-window-border-soft-width-effective"] = appWindowBorderWidthValue > 0 ? `calc(${merged.appWindowBorderWidth} + 0.75px)` : "0px";
  style["--app-window-border-soft-opacity-effective"] = appWindowBorderWidthValue > 0 ? "22%" : "0%";
  style["--app-window-border-soft-unfocused-opacity-effective"] = appWindowBorderWidthValue > 0 ? "18%" : "0%";
  style["--app-window-border-hairline-opacity-effective"] = appWindowBorderWidthValue > 0 ? "38%" : "0%";
  style["--app-window-border-hairline-unfocused-opacity-effective"] = appWindowBorderWidthValue > 0 ? "28%" : "0%";
  style["--app-window-border-inner-highlight-opacity-effective"] = appWindowBorderWidthValue > 0 ? "10%" : "0%";
  style["--app-window-border-inner-highlight-unfocused-opacity-effective"] = appWindowBorderWidthValue > 0 ? "6%" : "0%";
  const appWindowInnerGlowEnabled = appWindowBorderWidthValue > 0 && themeToggleEnabled(merged.appWindowInnerGlowEnabled);
  const appWindowInnerGlowUseBorderColor = themeToggleEnabled(merged.appWindowInnerGlowUseBorderColor);
  style["--app-window-inner-glow-color-effective"] = appWindowInnerGlowUseBorderColor ? themedAppWindowBorderColor : merged.appWindowInnerGlowColor;
  style["--app-window-inner-glow-unfocused-color-effective"] = appWindowInnerGlowUseBorderColor ? themedAppWindowUnfocusedBorderColor : merged.appWindowInnerGlowColor;
  style["--app-window-inner-glow-size-effective"] = appWindowInnerGlowEnabled ? merged.appWindowInnerGlowSize : "0px";
  style["--app-window-inner-glow-spread-effective"] = appWindowInnerGlowEnabled ? merged.appWindowInnerGlowSpread : "0px";
  style["--app-window-inner-glow-opacity-effective"] = appWindowInnerGlowEnabled ? merged.appWindowInnerGlowOpacity : "0%";
  style["--app-window-inner-glow-unfocused-opacity-effective"] = appWindowInnerGlowEnabled ? merged.appWindowInnerGlowUnfocusedOpacity : "0%";
  style["--app-window-inner-glow-gap-effective"] = appWindowInnerGlowEnabled ? merged.appWindowInnerGlowGap : "0px";
  const appWindowOuterGlowEnabled = themeToggleEnabled(merged.appWindowOuterGlowEnabled);
  const appWindowOuterGlowUseBorderColor = themeToggleEnabled(merged.appWindowOuterGlowUseBorderColor);
  style["--app-window-outer-glow-color-effective"] = appWindowOuterGlowUseBorderColor ? themedAppWindowBorderColor : merged.appWindowOuterGlowColor;
  style["--app-window-outer-glow-unfocused-color-effective"] = appWindowOuterGlowUseBorderColor ? themedAppWindowUnfocusedBorderColor : merged.appWindowOuterGlowColor;
  style["--app-window-outer-glow-size-effective"] = appWindowOuterGlowEnabled ? merged.appWindowOuterGlowSize : "0px";
  style["--app-window-outer-glow-spread-effective"] = appWindowOuterGlowEnabled ? merged.appWindowOuterGlowSpread : "0px";
  style["--app-window-outer-glow-opacity-effective"] = appWindowOuterGlowEnabled ? merged.appWindowOuterGlowOpacity : "0%";
  style["--app-window-outer-glow-unfocused-opacity-effective"] = appWindowOuterGlowEnabled ? merged.appWindowOuterGlowUnfocusedOpacity : "0%";
  style["--popup-shadow-opacity-effective"] = themeToggleEnabled(merged.popupShadowEnabled) ? merged.popupShadowOpacity : "0%";
  style["--dropdown-shadow-opacity-effective"] = themeToggleEnabled(merged.dropdownShadowEnabled) ? merged.dropdownShadowOpacity : "0%";
  const mediaSidebarShadowEnabled = themeToggleEnabled(merged.mediaSidebarShadowEnabled);
  style["--media-sidebar-shadow-opacity-effective"] = mediaSidebarShadowEnabled ? merged.mediaSidebarShadowOpacity : "0%";
  style["--media-sidebar-shadow-width-effective"] = mediaSidebarShadowEnabled ? (merged.mediaSidebarShadowWidth || "52px") : "0px";
  const mediaSidebarGradientEnabled = themeToggleEnabled(merged.mediaSidebarGradientEnabled);
  style["--media-sidebar-gradient-opacity-effective"] = mediaSidebarGradientEnabled ? merged.mediaSidebarGradientOpacity : "0%";
  style["--media-sidebar-gradient-width-effective"] = mediaSidebarGradientEnabled ? (merged.mediaSidebarGradientWidth || "148px") : "0px";
  style["--media-sidebar-gradient-height-effective"] = mediaSidebarGradientEnabled ? (merged.mediaSidebarGradientHeight || "100%") : "0%";
  style["--media-sidebar-active-gradient-opacity-effective"] = mediaSidebarGradientEnabled ? merged.mediaSidebarActiveGradientOpacity : "0%";
  ["card", "poster", "header", "filter", "footer", "window", "sidebar", "control", "textBox", "dropdown", "panel", "badge", "slider", "scrollbar", "text", "glyph", "logo"].forEach((surface) => {
    const enabled = themeToggleEnabled(merged[`${surface}GlowEnabled`]);
    const cssSurface = surface.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
    style[`--${cssSurface}-glow-opacity-effective`] = enabled ? merged[`${surface}GlowOpacity`] : "0%";
    style[`--${cssSurface}-glow-outline-opacity-effective`] = enabled ? merged[`${surface}GlowOutlineOpacity`] : "0%";
  });
  ["titlebar", "header", "filter", "card", "cardTitle", "metadata", "control", "badge", "window", "details", "settings", "footer", "sidebar"].forEach((role) => {
    const key = `${role}Font`;
    const sizeKey = `${role}FontSize`;
    const cssRole = role.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
    style[`--${cssRole}-font-effective`] = merged[key] && merged[key] !== "inherit"
      ? merged[key]
      : merged.appFont;
    style[`--${cssRole}-font-size-effective`] = merged[sizeKey] && merged[sizeKey] !== "inherit"
      ? merged[sizeKey]
      : merged.appFontSize;
    style[`--${cssRole}-font-weight-effective`] = themeToggleEnabled(merged[`${role}FontBoldEnabled`]) ? "700" : "400";
    style[`--${cssRole}-font-style-effective`] = themeToggleEnabled(merged[`${role}FontItalicEnabled`]) ? "italic" : "normal";
  });
  style["--app-font-weight-effective"] = themeToggleEnabled(merged.appFontBoldEnabled) ? "700" : "400";
  style["--app-font-style-effective"] = themeToggleEnabled(merged.appFontItalicEnabled) ? "italic" : "normal";
  style["--mac9-chrome-color"] = String(merged.mac9ChromeColor || "#cccccc");
  style["--mac9-content-color"] = String(merged.mac9ContentColor || "#e1e1e1");
  style["--mac9-titlebar-active-text-color"] = String(merged.mac9TitlebarActiveTextColor || "#202020");
  style["--mac9-titlebar-inactive-text-color"] = String(merged.mac9TitlebarInactiveTextColor || "#444444");
  style["--mac9-window-active-outline-color"] = String(merged.mac9WindowActiveOutlineColor || "#222222");
  style["--mac9-window-inactive-outline-color"] = String(merged.mac9WindowInactiveOutlineColor || "#444444");
  style["--mac9-footer-status-text-color"] = String(merged.mac9FooterStatusTextColor || "#202020");
  style["--mac9-panel-background-color"] = String(merged.mac9PanelBackgroundColor || "#d6d6d6");
  style["--mac9-panel-title-background-color"] = String(merged.mac9PanelTitleBackgroundColor || merged.mac9PanelBackgroundColor || "#d6d6d6");
  style["--mac9-panel-text-color"] = String(merged.mac9PanelTextColor || "#000000");
  style["--mac9-panel-title-text-color"] = String(merged.mac9PanelTitleTextColor || "#000000");
  style["--mac9-panel-groove-shadow-color"] = String(merged.mac9PanelGrooveShadowColor || "#808080");
  style["--mac9-panel-inner-highlight-color"] = String(merged.mac9PanelInnerHighlightColor || "#ffffff");
  style["--mac9-panel-outer-highlight-color"] = String(merged.mac9PanelOuterHighlightColor || "#ffffff");
  const platinumColorVariables = {
    "body-text": ["mac9BodyTextColor", "#202020"],
    "secondary-text": ["mac9SecondaryTextColor", "#404040"],
    "disabled-text": ["mac9DisabledTextColor", "#777777"],
    "link-text": ["mac9LinkTextColor", "#000080"],
    "toolbar-background": ["mac9ToolbarBackgroundColor", "#cccccc"],
    "subheader-background": ["mac9SubheaderBackgroundColor", "#d6d6d6"],
    "field-background": ["mac9FieldBackgroundColor", "#ffffff"],
    "field-text": ["mac9FieldTextColor", "#000000"],
    "menu-background": ["mac9MenuBackgroundColor", "#d6d6d6"],
    "menu-text": ["mac9MenuTextColor", "#000000"],
    "file-browser-text": ["mac9FileBrowserTextColor", "#202020"],
    "row-background": ["mac9RowBackgroundColor", "#eeeeee"],
    "row-alternate-background": ["mac9RowAlternateBackgroundColor", "#dddddd"],
    "row-hover-background": ["mac9RowHoverBackgroundColor", "#50202020"],
    "row-hover-text": ["mac9RowHoverTextColor", "#202020"],
    "row-selected-background": ["mac9RowSelectedBackgroundColor", "#c5c3e5"],
    "row-selected-text": ["mac9RowSelectedTextColor", "#000000"],
    "selected-column-background": ["mac9SelectedColumnBackgroundColor", "#cccccc"],
    "selected-column-alternate-background": ["mac9SelectedColumnAlternateBackgroundColor", "#bbbbbb"],
    "selected-column-hover-background": ["mac9SelectedColumnHoverBackgroundColor", "#9f9f9f"],
    "selected-column-hover-text": ["mac9SelectedColumnHoverTextColor", "#202020"],
    "selection-background": ["mac9SelectionBackgroundColor", "#989efa"],
    "selection-text": ["mac9SelectionTextColor", "#000000"],
    "focus-ring": ["mac9FocusRingColor", "#0000ff"],
    "scrollbar-track": ["mac9ScrollbarTrackColor", "#b9b9b9"],
    "scrollbar-thumb": ["mac9ScrollbarThumbColor", "#7770d8"],
    "scrollbar-thumb-border": ["mac9ScrollbarThumbBorderColor", "#232323"],
    "document-viewport": ["mac9DocumentViewportColor", "#222222"],
  };
  Object.entries(platinumColorVariables).forEach(([cssName, [themeKey, fallback]]) => {
    style[`--mac9-${cssName}-color`] = String(merged[themeKey] || fallback);
  });
  style["--mac9-asset-filter-effective"] = themeToggleEnabled(merged.mac9AssetColorizeEnabled)
    ? `sepia(${merged.mac9AssetColorizeAmount || "100%"}) hue-rotate(${merged.mac9AssetHueRotate || "0deg"}) saturate(${merged.mac9AssetSaturation || "100%"}) brightness(${merged.mac9AssetBrightness || "100%"}) contrast(${merged.mac9AssetContrast || "100%"})`
    : "none";
  style["--mac9-bevel-light-color"] = String(merged.mac9BevelLightColor || "#ffffff");
  style["--mac9-bevel-mid-color"] = String(merged.mac9BevelMidColor || "#cccccc");
  style["--mac9-bevel-dark-color"] = String(merged.mac9BevelDarkColor || "#777777");
  style["--mac9-bevel-outline-color"] = String(merged.mac9BevelOutlineColor || "#202020");
  const mac9BevelEnabled = themeToggleEnabled(merged.mac9BevelEnabled);
  ["window", "panel", "control", "field", "list", "scrollbar"].forEach((role) => {
    const key = `mac9${role[0].toUpperCase()}${role.slice(1)}BevelWidth`;
    style[`--mac9-${role}-bevel-width-effective`] = mac9BevelEnabled ? String(merged[key] || "1px") : "0px";
  });
  const mac9WindowShadowEnabled = themeToggleEnabled(merged.mac9WindowShadowEnabled);
  style["--mac9-window-shadow-offset-x"] = String(merged.mac9WindowShadowOffsetX || "1px");
  style["--mac9-window-shadow-offset-y"] = String(merged.mac9WindowShadowOffsetY || "1px");
  style["--mac9-window-shadow-blur"] = String(merged.mac9WindowShadowBlur || "1px");
  style["--mac9-window-shadow-opacity-effective"] = mac9WindowShadowEnabled
    ? String(merged.mac9WindowShadowOpacity || "100%")
    : "0%";
  const mac9ChromeShadowEnabled = themeToggleEnabled(merged.mac9ChromeShadowEnabled);
  style["--mac9-chrome-shadow-offset-x"] = String(merged.mac9ChromeShadowOffsetX || "1px");
  style["--mac9-chrome-shadow-offset-y"] = String(merged.mac9ChromeShadowOffsetY || "1px");
  style["--mac9-chrome-shadow-blur"] = String(merged.mac9ChromeShadowBlur || "1px");
  style["--mac9-chrome-shadow-opacity-effective"] = mac9ChromeShadowEnabled
    ? String(merged.mac9ChromeShadowOpacity || "100%")
    : "0%";

  const motionLevel = String(merged.interfaceAnimations || "subtle");
  const motionEnabled = motionLevel !== "off";
  const motionSpeed = String(merged.animationSpeed || "fast");
  const speedMultiplier = motionSpeed === "slow" ? 1.35 : motionSpeed === "normal" ? 1 : 0.78;
  const levelMultiplier = motionLevel === "standard" ? 1.12 : 0.88;
  const motionMs = (base, key) => {
    const specificEnabled = key ? themeToggleEnabled(merged[key] ?? DEFAULT_THEME[key]) : true;
    return motionEnabled && specificEnabled ? `${Math.round(base * speedMultiplier * levelMultiplier)}ms` : "0ms";
  };
  const motionDistance = motionEnabled ? (motionLevel === "standard" ? "6px" : "4px") : "0px";
  const motionLift = motionEnabled && themeToggleEnabled(merged.cardHoverAnimationEnabled ?? DEFAULT_THEME.cardHoverAnimationEnabled) ? (motionLevel === "standard" ? "-2px" : "-1px") : "0px";
  const motionPressY = motionEnabled && themeToggleEnabled(merged.buttonPressAnimationEnabled ?? DEFAULT_THEME.buttonPressAnimationEnabled) ? "1px" : "0px";
  style["--motion-page-duration"] = motionMs(160, "pageTransitionsEnabled");
  style["--motion-page-distance"] = motionDistance;
  style["--motion-modal-duration"] = motionMs(145, "modalAnimationEnabled");
  style["--motion-modal-scale-start"] = motionEnabled && themeToggleEnabled(merged.modalAnimationEnabled ?? DEFAULT_THEME.modalAnimationEnabled) ? (motionLevel === "standard" ? ".975" : ".987") : "1";
  style["--motion-button-duration"] = motionMs(110, "buttonPressAnimationEnabled");
  style["--motion-button-press-y"] = motionPressY;
  style["--motion-button-press-scale"] = motionPressY === "0px" ? "1" : ".992";
  style["--motion-card-duration"] = motionMs(155, "cardHoverAnimationEnabled");
  style["--motion-card-hover-y"] = motionLift;
  style["--motion-accordion-duration"] = motionMs(170, "settingsAccordionAnimationEnabled");
  style["--motion-progress-duration"] = motionMs(1350, "progressShimmerEnabled");
  style["--motion-progress-shimmer-opacity"] = motionEnabled && themeToggleEnabled(merged.progressShimmerEnabled ?? DEFAULT_THEME.progressShimmerEnabled) ? (motionLevel === "standard" ? "34%" : "22%") : "0%";
  style["--motion-status-duration"] = motionMs(165, "statusTransitionEnabled");
  style["--motion-reveal-duration"] = motionMs(190, "installCenterCardRevealEnabled");
  style["--motion-ease-out"] = "cubic-bezier(.2,.8,.2,1)";
  return style;
}

/** Injects every font found in the root Fonts library, plus a legacy theme font
 * reference when opening themes created before the multi-font library existed. */
export function useCustomFont(theme) {
  useEffect(() => {
    let active = true;
    const styleElement = document.getElementById("laservault-custom-font") || document.createElement("style");
    styleElement.id = "laservault-custom-font";
    if (!styleElement.parentNode) document.head.appendChild(styleElement);

    const updateFontFaces = () => {
      const host = typeof window !== "undefined" ? (window.vaultKit || window.laserVault || {}) : {};
      let library = [];
      try { library = host.loadFonts?.() || []; } catch {}
      const faces = Array.isArray(library) ? [...library] : [];
      const legacyFamily = String(theme?.customFontFamily || "").trim();
      const legacyUrl = String(theme?.customFontUrl || "").trim();
      if (legacyFamily && legacyUrl && !faces.some((font) => font?.family === legacyFamily)) {
        faces.push({ family: legacyFamily, url: legacyUrl });
      }
      if (!active) return;
      styleElement.textContent = faces
        .filter((font) => font?.family && font?.url)
        .map((font) => `@font-face{font-family:${JSON.stringify(font.family)};src:url(${JSON.stringify(font.url)});font-display:swap}`)
        .join("\n");
    };

    updateFontFaces();
    window.addEventListener("vaultkit-font-library-changed", updateFontFaces);
    return () => {
      active = false;
      window.removeEventListener("vaultkit-font-library-changed", updateFontFaces);
      styleElement.remove();
    };
  }, [theme?.customFontFamily, theme?.customFontUrl]);
}

/** Parses a theme color value into its hex and alpha components for the color-picker UI. */
export function parseThemeColor(value) {
  const color = String(value || "").trim();
  const shortHex = /^#([\da-f])([\da-f])([\da-f])$/i.exec(color);
  if (shortHex) return { hex: "#" + shortHex.slice(1).map((part) => part + part).join(""), opacity: 1 };
  const longHex = /^#([\da-f]{6})([\da-f]{2})?$/i.exec(color);
  if (longHex) return { hex: "#" + longHex[1], opacity: longHex[2] ? parseInt(longHex[2], 16) / 255 : 1 };
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(color);
  if (rgba) {
    const hex = "#" + rgba.slice(1, 4).map((part) => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, "0")).join("");
    return { hex, opacity: rgba[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(rgba[4]))) };
  }
  return { hex: "#000000", opacity: 1 };
}

/** Combines a hex color and a 0-100 opacity value into a single theme color string. */
export function colorWithOpacity(value, opacity) {
  const normalized = parseThemeColor(value).hex;
  const alpha = Math.max(0, Math.min(1, Number(opacity)));
  if (alpha >= 0.999) return normalized;
  const red = parseInt(normalized.slice(1, 3), 16);
  const green = parseInt(normalized.slice(3, 5), 16);
  const blue = parseInt(normalized.slice(5, 7), 16);
  // Explicit rgba() avoids premultiplied-alpha quirks seen when translucent
  // eight-digit hex colors pass through inherited text, filters, or color-mix().
  return `rgba(${red}, ${green}, ${blue}, ${Number(alpha.toFixed(4))})`;
}
