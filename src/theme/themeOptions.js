/**
 * themeOptions.js
 * Auto-split from the original monolithic main.jsx.
 * Exports: APP_STYLE_OPTIONS, WINDOW_CONTROL_STYLE_OPTIONS, FONT_OPTIONS, FONT_ROLE_FIELDS, FONT_SIZE_ROLE_FIELDS
 */

export const APP_STYLE_OPTIONS = [
  ["classic", "MiSTer Classic"],
  ["macos", "macOS Glass"],
  ["windows", "Windows Modern"],
  ["windows9x", "Windows 9X"],
  ["macos9platinum", "Mac OS 9 Platinum"],
  ["gnome", "GNOME Clean"],
  ["material", "Material You"],
  ["terminal", "Terminal"],
  ["cinema", "Cinema Marquee"],
  ["minimal", "Minimal Gallery"],
  ["neon", "Neon Arcade"],
  ["brutalist", "Brutalist"],
];

export const WINDOW_CONTROL_STYLE_OPTIONS = [
  ["laservault", "MiSTer Classic"],
  ["windows", "Windows Style"],
  ["windows9x", "Windows 9X"],
  ["macos9platinum", "Mac OS 9 Platinum"],
  ["gnome", "GNOME Style"],
  ["macos", "macOS (Traffic Lights)"],
];

export const FONT_OPTIONS = [
  ["\"Virtue\", Charcoal, Chicago, Geneva, \"Lucida Grande\", Tahoma, \"MS Sans Serif\", system-ui, sans-serif", "Virtue (Embedded)"],
  ["\"Geneva Embedded\", Geneva, \"Lucida Grande\", Tahoma, \"MS Sans Serif\", Arial, sans-serif", "Geneva (Embedded)"],
  ["Inter, Segoe UI, system-ui, sans-serif", "Inter"],
  ["\"Roboto\", Arial, sans-serif", "Roboto"],
  ["\"Open Sans\", Arial, sans-serif", "Open Sans"],
  ["\"Lato\", Arial, sans-serif", "Lato"],
  ["\"Montserrat\", Arial, sans-serif", "Montserrat"],
  ["\"Source Sans 3\", \"Source Sans Pro\", Arial, sans-serif", "Source Sans"],
  ["\"Noto Sans\", Arial, sans-serif", "Noto Sans"],
  ["\"Ubuntu\", Arial, sans-serif", "Ubuntu"],
  ["\"Fira Sans\", Arial, sans-serif", "Fira Sans"],
  ["\"IBM Plex Sans\", Arial, sans-serif", "IBM Plex Sans"],
  ["\"Merriweather Sans\", Arial, sans-serif", "Merriweather Sans"],
  ["\"Atkinson Hyperlegible\", Arial, sans-serif", "Atkinson Hyperlegible"],
  ["\"JetBrains Mono\", \"Fira Code\", Consolas, monospace", "JetBrains Mono"],
  ["\"Space Grotesk\", Arial, sans-serif", "Space Grotesk"],
  ["\"Manrope\", Arial, sans-serif", "Manrope"],
  ["\"DM Sans\", Arial, sans-serif", "DM Sans"],
  ["\"Work Sans\", Arial, sans-serif", "Work Sans"],
  ["\"Barlow\", Arial, sans-serif", "Barlow"],
  ["\"Archivo\", Arial, sans-serif", "Archivo"],
  ["\"Raleway\", Arial, sans-serif", "Raleway"],
  ["\"Nunito Sans\", Arial, sans-serif", "Nunito Sans"],
  ["\"Exo 2\", Arial, sans-serif", "Exo 2"],
  ["\"Urbanist\", Arial, sans-serif", "Urbanist"],
  ["Aptos, Segoe UI, system-ui, sans-serif", "Aptos"],
  ["Georgia, serif", "Georgia"],
  ["Consolas, \"Cascadia Mono\", monospace", "Consolas Mono"],
];

export const FONT_ROLE_FIELDS = [
  ["titlebarFont", "Window title bars"],
  ["headerFont", "Page headers"],
  ["filterFont", "Toolbars and filters"],
  ["cardFont", "Panels, cards, and lists"],
  ["cardTitleFont", "Panel and card titles"],
  ["metadataFont", "Metadata and secondary text"],
  ["controlFont", "Buttons, fields, and controls"],
  ["badgeFont", "Status badges and counters"],
  ["windowFont", "Dialog and popup content"],
  ["detailsFont", "Detail views"],
  ["settingsFont", "Settings content"],
  ["footerFont", "Footer and connection status"],
  ["sidebarFont", "Sidebar navigation"],
];

export const FONT_SIZE_ROLE_FIELDS = [
  ["titlebarFontSize", "Window title bars"],
  ["headerFontSize", "Page headers"],
  ["filterFontSize", "Toolbars and filters"],
  ["cardFontSize", "Panels, cards, and lists"],
  ["cardTitleFontSize", "Panel and card titles"],
  ["metadataFontSize", "Metadata and secondary text"],
  ["controlFontSize", "Buttons, fields, and controls"],
  ["badgeFontSize", "Status badges and counters"],
  ["windowFontSize", "Dialog and popup content"],
  ["detailsFontSize", "Detail views"],
  ["settingsFontSize", "Settings content"],
  ["footerFontSize", "Footer and connection status"],
  ["sidebarFontSize", "Sidebar navigation"],
];

/** Single source of truth for Platinum color controls. Each theme key appears once. */
export const PLATINUM_COLOR_GROUPS = [
  ["Platinum Chrome", [["mac9ChromeColor", "Window chrome"], ["mac9ContentColor", "Window content"], ["mac9WindowActiveOutlineColor", "Active window outline"], ["mac9WindowInactiveOutlineColor", "Inactive window outline"]]],
  ["Platinum Panels", [["mac9PanelBackgroundColor", "Panel surface"], ["mac9PanelTitleBackgroundColor", "Title backing"], ["mac9PanelTextColor", "Panel text"], ["mac9PanelTitleTextColor", "Panel title text"], ["mac9PanelGrooveShadowColor", "Groove dark line"], ["mac9PanelInnerHighlightColor", "Inner top/left highlight"], ["mac9PanelOuterHighlightColor", "Outer right/bottom highlight"]]],
  ["Platinum Title Bar", [["mac9TitlebarActiveTextColor", "Active title text"], ["mac9TitlebarInactiveTextColor", "Inactive title text"]]],
  ["Platinum Text", [["mac9BodyTextColor", "Primary text"], ["mac9SecondaryTextColor", "Secondary text"], ["mac9DisabledTextColor", "Disabled text"], ["mac9LinkTextColor", "Links"], ["mac9FooterStatusTextColor", "Status text"]]],
  ["Platinum Headings", [["settingsSidebarHeaderColor", "Settings sidebar heading"], ["settingsPageHeaderColor", "Settings page heading"], ["settingsSectionHeaderColor", "Section headings"], ["settingsSubheaderColor", "Section descriptions"], ["headerTextColor", "Page header text"], ["footerTextColor", "Footer text"]]],
  ["Platinum Navigation Text", [["mediaSidebarTextColor", "Sidebar text"], ["mediaSidebarSectionTextColor", "Sidebar section text"], ["mediaSidebarButtonTextColor", "Button text"], ["mediaSidebarButtonHoverTextColor", "Button hover text"], ["mediaSidebarButtonActiveTextColor", "Button selected text"], ["settingsSidebarTextColor", "Settings navigation"], ["settingsSidebarActiveTextColor", "Settings selected text"], ["settingsSidebarPressedTextColor", "Settings pressed text"]]],
  ["Platinum Surfaces", [["mac9ToolbarBackgroundColor", "Toolbars"], ["mac9SubheaderBackgroundColor", "Subheaders"], ["mac9FieldBackgroundColor", "Fields"], ["textBoxBorderColor", "Field border"], ["textBoxFocusBorderColor", "Focused field border"], ["mac9MenuBackgroundColor", "Menus"], ["dropdownMenuBorderColor", "Menu border"], ["mac9DocumentViewportColor", "Document viewport"]]],
  ["Platinum Field and Menu Text", [["mac9FieldTextColor", "Field text"], ["textBoxPlaceholderColor", "Placeholder text"], ["mac9MenuTextColor", "Menu text"]]],
  ["Platinum File Browser", [["mac9FileBrowserTextColor", "Row text"], ["mac9RowBackgroundColor", "Rows"], ["mac9RowAlternateBackgroundColor", "Alternate rows"], ["mac9SelectedColumnBackgroundColor", "Active column"], ["mac9SelectedColumnAlternateBackgroundColor", "Active column alternate"], ["mac9RowHoverBackgroundColor", "Inactive column hover background"], ["mac9RowHoverTextColor", "Inactive column hover text"], ["mac9SelectedColumnHoverBackgroundColor", "Active column hover background"], ["mac9SelectedColumnHoverTextColor", "Active column hover text"], ["mac9RowSelectedBackgroundColor", "Selected row background"], ["mac9RowSelectedTextColor", "Selected row text"]]],
  ["Platinum Selection", [["mac9SelectionBackgroundColor", "Selection"], ["mac9SelectionTextColor", "Selection text"], ["mac9FocusRingColor", "Keyboard focus ring"]]],
  ["Platinum Scrollbars", [["mac9ScrollbarTrackColor", "Track"], ["mac9ScrollbarThumbColor", "Thumb"], ["mac9ScrollbarThumbBorderColor", "Thumb border"]]],
  ["Platinum Bevels", [["mac9BevelLightColor", "General highlight"], ["mac9BevelMidColor", "General middle"], ["mac9BevelDarkColor", "General shadow"], ["mac9BevelOutlineColor", "General outline"]]],
  ["Button Surfaces", [["buttonBackgroundColor", "Normal"], ["buttonHoverBackgroundColor", "Hover"], ["buttonPressedColor", "Pressed"], ["buttonSelectedBackgroundColor", "Selected"], ["buttonDisabledBackgroundColor", "Disabled"]]],
  ["Button Text", [["buttonTextColor", "Normal"], ["buttonHoverTextColor", "Hover"], ["buttonPressedTextColor", "Pressed"], ["buttonSelectedTextColor", "Selected"], ["buttonDisabledTextColor", "Disabled"]]],
  ["Glyphs", [["glyphColor", "Normal"], ["glyphHoverColor", "Hover"], ["glyphPressedColor", "Pressed"], ["glyphSelectedColor", "Selected"], ["glyphDisabledColor", "Disabled"]]],
  ["Dropdown Items", [["dropdownItemTextColor", "Normal text"], ["dropdownItemHoverBackgroundColor", "Hover background"], ["dropdownItemHoverTextColor", "Hover text"], ["dropdownItemSelectedBackgroundColor", "Selected background"], ["dropdownItemSelectedTextColor", "Selected text"], ["dropdownGroupTextColor", "Group text"]]],
];
