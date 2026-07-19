# v0.4.53-alpha

- Removed the manual Add GitHub Package entry point and dialog from the Install Center.
- Made the Companion EX Hub the sole user-facing source for adding and maintaining catalog entries.
- Replaced the custom plus-button/count wrapper with the standard beveled page-header status box.
- Updated the Install Center header count with correct singular/plural item labeling.

# v0.4.52-alpha

- Changed Install Center grid artwork frames from square to the Hub-native 4:3 aspect ratio.
- Changed grid thumbnail scaling from `cover` to `contain` so complete artwork remains visible inside its border.
- Applied the uncropped 4:3 behavior across standard and macOS Platinum themes without changing the larger item-details artwork.

# v0.4.51-alpha

- Updated the embedded MiSTer Companion backend core from v6.3.1 to v6.4.0.
- Added the trusted DreamSTer Install Center handler with online and SD Card Mode status, install, update, and uninstall support.
- Added DreamSTer to the bundled fallback catalog and backend handler registry.
- Preserved the MiSTer Companion EX Hub fork, fresh source-metadata refresh, remote artwork resolution, custom GitHub packages, Electron JSON-RPC bridge, and EX-specific root paths.

# v0.4.50-alpha

- Fixed Hub-hosted Install Center thumbnails being mistaken for bundled app artwork.
- Added remote image URL resolution and cache-busting so replaced thumbnails appear after refresh.
- Changed manual Install Center refresh to read source item metadata first, with generated media enrichment.
- Added cache-busting to fresh catalog requests and synchronized an open item dialog after catalog updates.
- Added a bundled DreamSTer thumbnail fallback for offline and transient-network use.

# v0.4.49-alpha

- Switched the Install Center catalog source to the MiSTer Companion EX Hub at `Arcanthur/mister-companion-EX-hub`.
- Updated Install Center network requests to identify themselves as MiSTer Companion EX.
- Retained the embedded MiSTer Companion backend core at v6.3.1.

# v0.4.48-alpha

- Updated the embedded MiSTer Companion backend core from v6.2.0 to v6.3.1.
- Added Companion Remote 2.0.0 and the updated remote-daemon cache/fallback behavior.
- Added x86_64 and ARM64 MC-Updater selection across Windows, Linux, and macOS.
- Added Windows ARM64 balena-cli fallback support for Flash SD.
- RetroAchievements core installs and removals now keep the required MiSTer.ini block synchronized.
- Preserved the Electron JSON-RPC bridge, root Data/Backend and Tools paths, SD backup support, Install Center extensions, runtime ScreenScraper credentials, and ZapScripts compatibility enhancements.

# v0.4.47-alpha

- Replaced Platinum dropdown hover/focus chrome with overlapped, non-repeating three-slice backgrounds to eliminate selected-state tiling and end-cap seams.
- Restored normal dropdown-bar chrome immediately after a custom menu closes.
- Aligned Flash SD Refresh Drives and SaveManager Save Retention buttons to the labeled control baseline.
- Widened the RetroAchievements Achievements-panel Set and Show dropdowns without changing their height.

# v0.4.46-alpha

- Reduced the macOS Platinum shared horizontal control spacing from 16px to 14px.
- Normalized SaveManager command, retention, and restore rows around explicit center or field-baseline alignment.
- Aligned ZapScraper button rows, source controls, and inline status text to the same 14px rhythm.
- Standardized RetroAchievements toolbar, search/filter, and Recent/All Games spacing.
- Standardized Manuals toolbar, search/checkbox, selected-manual, and action-button spacing and alignment.

# v0.4.45-alpha Platinum control spacing and alignment

- Standardized horizontal spacing between adjacent Platinum buttons, single-line fields, and dropdown controls at 16px.
- Rebuilt dropdown bars with composite three-slice border-image assets to eliminate center/right seams at fractional widths.
- Aligned Flash SD Refresh Drives with the Drive dropdown rail.
- Normalized SaveManager retention, action, restore, checkbox, selector, and button baselines.
- Rebuilt the File Browser command strip as a shared grid so New Folder Name aligns with adjacent buttons.

# v0.4.44-alpha Platinum control and page refinement

- Increased Platinum dropdown selection confirmation to three flashes over 750 ms and return closed dropdown triggers to normal chrome after selection.
- Added shared vertical-alignment rules for dropdown/button rows, single-line field/button rows, and checkbox labels.
- Restyled the Scripts selector as a flat Platinum library list matching the ZapScripts panel rather than command-button assets.
- Moved RetroAchievements Recent and All Games controls below the Games list and assigned secondary button assets.
- Matched the Flash SD Installer and Target / Source Drive panel heights.

# v0.4.43-alpha Platinum page button hierarchy

- Standardized the requested Platinum page actions on the secondary button asset family.
- Reserved primary button assets for Connect/Reconnect, Return to Menu, Flash SD Card, Back Up SD Card, Backup Saves, Scan Source, and Scrape Selected.
- Kept Remote controller face buttons and structural list/navigation controls on their existing specialized artwork.
- Applied secondary hierarchy to Scripts and ZapScraper configuration/review dialogs as well as their main pages.

# v0.4.42-alpha Platinum slider end-cap repair

- Rebuilt Platinum range tracks as a true border-image three-slice control.
- Prevented the center track slice from rendering beneath the transparent left and right caps.
- Preserved the supplied 21 × 24 px thumb and native 10 px track height.
- Added `slider-track-composite.png` to the editable Platinum slider asset library.

# v0.4.39-alpha Platinum checkbox, radio, and Geneva refresh

- Added editable Platinum checkbox and radio artwork under `Assets/macos9/inputs`.
- Supplied checkbox PNGs now provide checked and pressed states; radio PNGs provide normal and selected/pressed states.
- Retained a matching neutral checkbox frame for the unchecked state.
- Replaced the bundled `Geneva Embedded` font binary while preserving its existing family name and saved-theme compatibility.

# v0.4.36-alpha Platinum Install Center window integration

- Rebuilt Install Center popup frames around the same four-pixel Platinum window boundary used by the main application shell.
- Reduced popup title bars to the main window's 23 px chrome and joined them seamlessly to the outer frame without a second boxed border.
- Removed footer-like slack beneath popup command rows.
- Routed popup titles, descriptions, metadata, badges, fields, and buttons through their corresponding theme font roles.
- Matched the Install Center category selector text inset to every other Platinum dropdown.
- Standardized all Install Center command buttons, including Install and Add Package, on the secondary PNG asset family.
- Removed the redundant legacy close button from the Add GitHub Package dialog.

# v0.4.35-alpha Platinum Install Center dialog polish

- Increased Platinum Install Center popup artwork to 130 × 130 px and anchored the Author/Version wells to its lower edge.
- Added category-label padding and allowed status badges such as Unknown and Needs connection to render without clipping.
- Switched Install Center popup action buttons to the Platinum secondary PNG asset family.
- Rebuilt the popup chrome as a 26 px inset Platinum title bar inside a beveled outer window frame.
- Removed the redundant legacy close button from Install Center item dialogs.

# v0.4.34-alpha Platinum Install Center refinement

- Corrected the Platinum category selector rail so its 37 px sliced artwork is vertically centered and no longer clipped by the toolbar bevel.
- Rebuilt the Platinum catalog as a compact five-column grid at the standard and smaller window presets.
- Reformatted card metadata into a readable title, category/status row, and labeled Author/Version facts.
- Repaired Install Center item dialogs by containing artwork inside a positioned 104 px thumbnail, reducing the dialog footprint, and removing the redundant second close button in Platinum.

# v0.4.33-alpha Root font and theme asset libraries

- Added root-level `Fonts` and `Assets` folders beside `Data`, `Themes`, and `Tools`.
- Replaced the single custom-font slot with a multi-font library that discovers every TTF, OTF, WOFF, and WOFF2 file in `Fonts`.
- Added Settings actions to open and reload the font library.
- Moved all MiSTer theme artwork, including Platinum controls, progress bars, scrollbars, sidebar glyphs, and Install Center defaults, behind the editable root `Assets` folder.
- Added Settings actions to open the Assets folder and reload theme artwork without using cached files.
- Added checksum-aware asset synchronization: untouched stock files can receive app updates, while user-modified replacements remain preserved.
- Added migration of legacy `Data/fonts` and nested asset folders into the new root libraries.

# Changelog

## v0.4.32-alpha

- Replaced the macOS Platinum progress meters with the six user-supplied pre-sliced background and fill assets.
- Built every Platinum meter from dedicated left, repeating-middle, and right slices at their native 20 px / 18 px heights.
- Reserved four pixels inside the track for the fill cap's baked-in right-side shadow and clipped the complete meter at the outer background frame, preventing the shadow from leaking beyond the bar.
- Applied the same artwork to install, file-transfer, Flash SD, RetroAchievements, status-check, and shared progress rails while leaving other themes unchanged.

## v0.4.31-alpha

- Renamed the packaged portable data folder from `MiSTerCompanionVaultKitData` to `Data`.
- Renamed the writable Python backend state folder from `Data/python-backend-data` to `Data/Backend`.
- Moved saved theme JSON files and `theme-state.json` into a root-level `Themes` folder beside the portable executable.
- Moved downloaded Flash SD utilities into a persistent root-level `Tools` folder instead of the portable app's temporary extraction directory.
- Removed the duplicate backend copy from `app.asar`; packaged builds now carry the Python backend once through `extraResources`.
- Added automatic, non-destructive migration from the previous portable data, backend-data, theme, and tool locations.

## v0.4.30-alpha

- Replaced the built-in `macOS Platinum` preset with the complete theme exported from Settings and supplied for this build.
- Preserved the preset's authored colors, sizing, smaller-window preference, typography roles, bevels, shadows, controls, motion settings, and component styling without passing it through the generic style re-derivation pipeline.
- Normalized the preset's machine-local Virtue font reference to the app's embedded Virtue family, while retaining embedded Geneva for descriptions and card body copy.

## v0.4.29-alpha

- Replaced the Platinum dropdown's normal right-cap PNG with the newly supplied artwork.
- Embedded the supplied Geneva TrueType font in the Vite bundle and added it to the app font library as `Geneva (Embedded)`.
- Made Geneva the Platinum default for description, subtitle, and subheader-description text through the metadata typography role.
- Kept Platinum panel and card headers on Virtue through the panel-title typography role.
- Added a one-time v2 Platinum typography migration that adopts the new Geneva description default while preserving genuinely custom font choices.

## v0.4.28-alpha

- Restored a Platinum-only **Borders** accordion in Appearance with live controls for active and inactive window outlines, panel frame lines, and sidebar separators.
- Restored the dedicated Platinum **Shadows** accordion with independent main-window and chrome shadow toggles, offsets, blur, and transparency.
- Added the Platinum **Bevels** accordion immediately beneath Shadows, including live bevel colors and independent depths for windows, panels, controls, fields, lists, and scrollbars.

## v0.4.27-alpha

- Embedded the supplied Virtue TrueType font in the Vite application bundle and added it to every font selector as `Virtue (Embedded)`.
- Made Virtue the default typeface for the macOS Platinum preset across all semantic text roles.
- Normalized every Platinum font-size role, including the footer connection status, to a 12 px default while retaining per-role customization.
- Added a one-time Platinum typography migration so existing installations using the former built-in Charcoal/Chicago defaults adopt Virtue and 12 px sizing without replacing genuinely custom font choices.

## v0.4.26-alpha

- Shortened the complete Platinum dropdown selection confirmation sequence from 720 ms to 500 ms.
- Preserved the same two flashes, clear intervals, and final selected-state hold at the faster pace.

## v0.4.25-alpha

- Fixed the Platinum dropdown acknowledgement so its blue selected rail and white text visibly flash twice before the final hold.
- Replaced competing row-state swaps with a dedicated confirmation overlay that cannot be masked by hover, active, selected, or inherited text-color rules.
- Slightly lengthened the complete acknowledgement to 720 ms for clearer classic-menu feedback.

# v0.4.24-alpha

- Added a Platinum-only dropdown selection acknowledgement: the chosen row flashes its selected state twice, holds briefly on the final selected state, and then closes the menu.
- Locked pointer and keyboard interaction during the short confirmation sequence so hover cannot interrupt or move the flashing selection.

# v0.4.23-alpha Platinum dropdown assets and smaller window

- Replaced the Platinum dropdown right-cap normal and selected PNG assets with the newly supplied artwork.
- Changed focused/open Platinum dropdown text to white for contrast against the selected control artwork.
- Added a Platinum-only **Smaller window (1300 × 900)** appearance setting.
- The smaller-window option preserves the app's transparent 48 px shadow gutter and returns to the standard 1600 × 1000 surface when disabled or when another theme is active.

# v0.4.22-alpha Platinum dropdown rail alignment

- Aligned every Platinum popup menu to the visible selector field: 7 px inside the trigger's left box edge and ending at the arrow-button divider.
- Preserved the existing 4 px vertical gap beneath Platinum dropdown controls.
- Removed the `Choose a saved profile` row from the Saved Profiles menu while retaining it as non-selectable trigger copy when no profile is active.
- Disabled the Saved Profiles selector cleanly when no profiles exist.

# v0.4.21-alpha Platinum unified dropdown menus

- Routed native selectors through the custom dropdown component only while the macOS Platinum theme is active; every other theme retains its existing native-select behavior.
- Standardized all Platinum popup menus on the Saved Profiles bevel, square corners, classic selection bar, and left-side selected checkmark.
- Positioned Platinum menus 4 px below their trigger and sized them to the trigger width minus the exposed 27 px arrow-button face.
- Preserved themed overflow scrollbars while avoiding a reserved scrollbar gutter on short option lists.
- Added disabled-option support to the shared custom select component.

# v0.4.20-alpha CSS architecture cleanup

- Reformatted all shared and theme CSS with consistent two-space indentation and readable multi-line selectors and values.
- Added file-level developer maps and numbered section banners to `styles.css`, `mister-vaultkit.css`, `win9x.css`, and `macos-platinum.css`.
- Standardized declaration ordering by custom properties, box/layout, positioning, typography, visuals, and interaction/motion.
- Consolidated shared scrollbar dimensions and common motion durations into root-level custom properties.
- Added `npm run format:css` plus `docs/CSS_ARCHITECTURE.md` so future theme changes can retain the same structure.
- Preserved selector order, declaration values, and versioned cascade locks; this pass is intended to be visually neutral.

# v0.3.97-alpha

- Promoted the complete Platinum and Windows 9X theme definitions into the built-in theme preset list as `macOS Platinum` and `Win9X`.
- Preserved each theme's special window controls, layout behavior, settings panels, bevel controls, scrollbars, fonts, and chrome effects through their existing style IDs.
- Moved all Platinum and Win9X styling out of the shared VaultKit stylesheet into `macos-platinum.css` and `win9x.css`, loaded after the common UI rules.
- Removed the bundled portable theme JSON and `.mister-vaultkit-theme` copies; these themes no longer require importing or a separate theme ZIP.
- Incorporated the updated Platinum primary and secondary button assets from the source tree.

# v0.3.96-alpha

- Reserved a fixed 10 px rendering margin around non-maximized Platinum windows so the configurable app and chrome shadows are no longer clipped by the viewport.
- Reconnected the active and inactive outline colors to a stable 1 px surface border without changing the window dimensions between focus states.
- Applied the configurable window bevel directly to the same seamless chrome surface and kept both shadow layers disabled while inactive.
- Strengthened Platinum panel construction to a visible dark-gray outer frame with a crisp 1 px light inner highlight and a title plaque that interrupts both top lines.

# v0.3.95-alpha

- Rebuilt Platinum app cards and Settings groups as classic fieldset panels with light-gray beveled frames and titles that interrupt the top edge.
- Standardized panel content padding to 12 px and panel/grid separation to 12 px throughout the Platinum interface.
- Removed the old solid Platinum card title strips while preserving theme-driven title fonts and emphasis.
- Prevented the RetroAchievements Games list from escaping its new panel frame when the paired Achievements panel is short or empty.

# v0.3.94-alpha

- Made the Platinum active and inactive window outline colors live-editable through one fixed-width focus-state border.
- Kept the inactive border at 1 px so focus changes no longer resize or shift the window surface.
- Removed the framed box around the footer connection status.
- Added independent Platinum footer connection status text color and font-size controls.

# v0.3.93-alpha

- Restored the configurable active/inactive Platinum outline on the real outer window surface so it remains visible around all four sides.
- Increased the Platinum sidebar and its contents by 6 px while preserving full-width titlebar and footer chrome.
- Constrained the RetroAchievements Achievements scrollbar to the achievement list row instead of the complete panel.
- Raised the footer connection status by 1 px for optical vertical centering.

# v0.3.92-alpha

- Replaced Platinum scrollbars with the supplied 20 px track and arrow assets and reduced the centered thumb to 18 px.
- Rebuilt proportional thumbs from fixed 4 px top and bottom caps, a fixed 13 px center grip, and the dedicated vertically stretched body slice.
- Recalculated main and inner-panel gutters for the narrower scrollbar while preserving the shared 1 px panel edge.

# v0.3.91-alpha

- Reduced Platinum scrollbar gutters by the shared 1 px panel edge and removed the track border box from scrollbar child positioning.
- Rebuilt the 22 px thumb with fixed PNG edge slices and an unscaled center grip so dynamic thumb heights stay sharp.
- Added configurable active and inactive outer window outline colors, defaulting to `#222222` and `#444444`.

# v0.3.90-alpha

- Changed Platinum tracks to scalable image-sliced surfaces and stopped vertically stretching the thumb artwork, preserving its pixel details and centered grip.
- Moved the main and Settings scrollbar stacks inside the workspace frame while retaining the intended 1 px overlap at the inner chrome edge.
- Kept Up and Down arrows in their normal states at scroll limits; inactive artwork is no longer substituted.
- Restored PNG theming for inner panel scrollbars by disabling the standard color-only scrollbar override that masked WebKit asset rules.
- Replaced the RetroAchievements native list scrollbars with the same PNG-backed scrollbar component as the main window and reserved a 24 px content gutter beside each bar.

# v0.3.89-alpha

- Replaced Platinum scrollbar tracks, thumbs, and arrow buttons with the supplied native-size PNG assets.
- Preserved 24 px tracks/buttons and centered the 22 px thumb without horizontal scaling.
- Added proper normal, pressed, and inactive arrow states based on scroll position.
- Added a Platinum-only setting that pairs both arrow buttons at the bottom; the default remains Up at the top and Down at the bottom.
- Moved the main and Settings scrollbars against the right chrome frame with a 1 px inset that leaves the outer black frame line visible.

# v0.3.88-alpha

- Made the Platinum main and popup titlebars honor their configurable active and inactive text colors by overriding the legacy WebKit text-fill value as well as the standard text color.
- Lowered the main window title by 1 px without moving its stripes or window controls.

# v0.3.87-alpha

- Removed the entire Platinum stripe decoration layer while a window is inactive, eliminating the solid off-white rectangle left behind when only the stripe image was hidden.

# v0.3.86-alpha

- Widened the MacOS 9 Platinum main sidebar and its content geometry by 10 px, with the width remaining configurable through the theme.
- Added independent active and inactive titlebar text colors to Platinum color settings; inactive title text now defaults to `#444444`.
- Removed Platinum titlebar stripes whenever the app window is inactive, including popup titlebars.

# v0.3.85-alpha

- Removed forced bold styling from the default MacOS 9 Platinum presentation so every text role starts at regular weight and normal style.
- Added independent typeface, Bold, and Italic controls for the interface default plus 13 complete text roles.
- Replaced media-library-specific font labels with accurate MiSTer interface labels covering title bars, page headers, toolbars, panels, metadata, controls, badges, dialogs, details, Settings, footer status, and sidebar navigation.
- Made an imported custom font independently selectable from every text-role menu without forcing the other roles to use it.

# v0.3.84-alpha

- Removed the footer's separate bottom bevel so the outer Platinum surface supplies one seamless top, side, and bottom chrome perimeter.
- Limited the Platinum chrome drop shadow to focused, non-maximized windows.
- Explicitly disabled both the rendered-frame shadow and the underlying shadow layer while a Platinum window is inactive.

# v0.3.83-alpha

- Changed the Platinum Window Chrome shadow to a rendered-frame drop shadow so it remains visible outside the square chrome bezel.
- Restored the native enable/disable checkboxes in Platinum Settings by removing the hidden replacement-control positioning inherited from the modern styles.
- Added the missing bottom outline and medium/dark inset bevel tones to the 23px Platinum footer.

# v0.3.82-alpha

- Added an independent Platinum Window Chrome shadow with toggle, 1-4 px horizontal and vertical offsets, 1-4 px blur, and transparency controls.
- Prevented the main frame from clipping the non-maximized chrome and window shadows.
- Restored the Platinum chrome bezel's pixel-aligned white top/left highlight and medium/dark bottom/right edge colors above the app content.

# v0.3.81-alpha

- Fixed the Platinum Settings button cascade so it uses the same responsive 173 x 37 px geometry as the sidebar navigation without crossing the content divider.
- Applied the selected Buttons and Controls font to every Platinum command-button surface, including custom selects and Settings actions.
- Kept the sidebar font independent while ensuring both navigation and the bottom Settings button inherit it with the same regular weight.

# v0.3.80-alpha

- Added a Platinum-only main-window shadow toggle with 1-4 px horizontal offset, vertical offset, and blur choices, plus adjustable transparency.
- Matched the bottom Settings button to the usable width, native height, font family, and regular weight of the other sidebar controls.
- Normalized Platinum command-button typography so nested labels inherit the selected control, sidebar, or Settings font without stray bold styling.

# v0.3.79-alpha

- Rendered every skinned Platinum command button at the supplied PNG artwork's native 37px height instead of compressing it to the older 20-25px control metrics.
- Matched the border-image widths to the source artwork's native 8px top, 8px side, and 9px bottom slices for crisp, pixel-aligned corners and bevels.
- Recentered labels and glyphs with 12px horizontal insets, 8px icon gaps in sidebar and Settings navigation, and consistent 12px command-row spacing.
- Confirmed 37px computed heights and native border slices across main commands, sidebar navigation, Settings navigation, Settings actions, active states, and disabled states in a live Platinum preview.

# v0.3.78-alpha

- Added the supplied Primary and Secondary Platinum PNG button artwork as scalable, pixel-rendered button skins.
- Applied Primary normal, pressed/hover, and disabled assets to ordinary command buttons throughout the main workspace and its dialogs.
- Applied Secondary normal, pressed/hover, and disabled assets to main sidebar navigation, the sidebar Settings button, Settings navigation, action buttons, and accordion controls.
- Preserved dedicated artwork and geometry for titlebar controls, scrollbar arrows, dropdown controls, color swatches, rich cards, and selectable list rows.
- Verified Primary, Secondary, active, hover, and disabled asset routing in a live Platinum preview across the main interface and Settings.

# v0.3.77-alpha

- Audited the Platinum theme against Apple's Mac OS 8 Human Interface Guidelines and adopted the documented control metrics without altering the tuned window chrome.
- Set standard Platinum action buttons to 20px high with normal-weight labels and compact 8px horizontal text insets.
- Set edit fields to the documented 22px height and pop-up controls to the documented 20px height.
- Reduced checkbox and radio marks to the documented 12px square inside 18px control rows with 5px label spacing.
- Applied the HIG's 10-12px group-box insets and 6px internal control spacing to appearance-setting groups.
- Prioritized Charcoal as the Platinum system font, with Chicago retained as the metric-compatible fallback across every font role.

# v0.3.76-alpha

- Removed beveling from MacOS 9 Platinum scrollbar tracks and expanded scrollbar thumbs to the full track width.
- Applied theme-colored Platinum scrollbars to overflowing panels, lists, menus, and library views throughout the app.
- Connected the main and Settings sidebars to their independent theme color controls, including normal, hover, active, border, text, and glyph states.
- Added dedicated Titlebars font-family and font-size controls shared by the main window and all popup titlebars.
- Rebuilt ZapScripts category and item lists as fixed, non-shrinking rows so icons and metadata remain inside their list panels.

# v0.3.75-alpha

- Reserved the full 16px Platinum scrollbar gutter plus 13px of right-side breathing room so main-window panels no longer run beneath the overlay scrollbar.
- Corrected both Platinum scrollbar arrow buttons to matching 14px square bounding boxes.
- Added a MacOS 9 Platinum-only Bevels accordion with editable highlight, middle, shadow, and outline colors plus independent bevel depth for windows, panels, controls, fields, lists, and scrollbars.
- Added editable Platinum chrome and inner-content colors to both Appearance and Colors while keeping every new value portable with the theme.
- Reconnected Platinum titlebars to the configured Header and Popup Window font roles.
- Returned ordinary Platinum buttons, labels, sidebar entries, and form controls to normal font weight while retaining emphasis for actual headings.

# v0.3.74-alpha

- Restored the native MacOS 9 close-box PNG in Settings and every shared popup titlebar by exempting it from the compact button skin.
- Removed the extra rule beneath the Settings section header while preserving its inset Platinum workspace frame.
- Reset Install Center artwork to a fixed 150px viewport and restored the metadata area beneath every populated card.
- Rebuilt RetroAchievements game and achievement lists as non-shrinking vertical stacks so badges, titles, descriptions, and points cannot overlap.
- Constrained RetroAchievements thumbnails to their grid cells and added fixed integer-pixel row heights with internal text clipping.

# v0.3.73-alpha

- Fixed the root MacOS 9 compact-control selector that forced every button-based rich card and list row to 21px tall.
- Restored full populated Install Center cards and readable RetroAchievements game and achievement rows.
- Restored readable Manuals system and PDF rows instead of overlapping compact strips.
- Reset the main content scroll position whenever sections change so page headers no longer reopen clipped beneath the titlebar.
- Added the native 4px Platinum chrome inset around Settings and reduced its retained internal section header from 64px to 34px.
- Added a populated visual regression pass covering Install Center, RetroAchievements, Manuals, and Settings.

# v0.3.72-alpha

- Matched popup titlebar height, stripe rail, close control, title font, and integer-pixel title plaque placement to the main MacOS 9 Platinum window.
- Rebuilt MacOS 9 themed scrollbars with a sharp Platinum track, purple beveled thumb, grip lines, and functional paired arrow buttons at the bottom.
- Restored full Install Center card height after the generic compact-button rule collapsed populated cards into image strips.
- Restored full RetroAchievements game and achievement row height so badges, titles, descriptions, and progress details no longer overlap.
- Tightened main and Settings scrollbar placement inside their respective content frames.

# v0.3.71-alpha

- Reworked MacOS 9 Platinum buttons, text fields, dropdowns, checkboxes, sliders, progress bars, and focus states with sharp pixel-aligned Platinum bevels.
- Removed the titlebar Settings control and added a matching Settings button with a native OS9 glyph at the bottom of the sidebar.
- Added reusable MacOS 9 titlebar chrome and 1px offset black shadows to Settings, confirmation, install, script, theme, achievement, and review popup windows.
- Removed modern backdrop blur from MacOS 9 dialogs and retained a flat modal dim.
- Audited every MiSTer section at 1768x1157 and added min-width, wrapping, and responsive grid guardrails for Install Center and RetroAchievements dense states.
- Fixed the Settings category navigation row so every category remains visible after adding the full-width popup titlebar.

# v0.3.70-alpha

- Moved the extra MacOS 9 Platinum titlebar pixel to the top breathing room instead of the bottom.
- Rebuilt the titlebar stripes as one continuous rail behind a content-sized title plaque.
- Standardized the visible stripe gaps to 6px from the left close box, title text, and right settings box.

# v0.3.69-alpha

- Raised the MacOS 9 Platinum titlebar to 23px for one extra pixel of content breathing room.
- Softened the titlebar stripe highlight from pure white to `#e0e0e0` and extended the right stripe run closer to the settings/window controls.
- Stopped automatic saved-theme fan-out that recreated older MacOS 9 Platinum JSON files on launch; imported themes now stay as one JSON file unless explicitly saved again.

# v0.3.68-alpha

- Reduced the MacOS 9 Platinum titlebar to 22px tall.
- Replaced the titlebar stripe rendering with a simple 1px white line plus 1px dark gray offset repeat, matching the provided closeup.
- Moved the stripe runs closer to the centered title plaque and reinforced the settings/menu button normal, hover, and pressed states to remove the hover glitch.

# v0.3.67-alpha

- Reduced the MacOS 9 Platinum titlebar height from 26px to 24px to better match the reference chrome.
- Restored the titlebar stripe band to the native 16px stripe asset height instead of stretching it to 18px.
- Recentered 18px titlebar controls with 3px top/bottom padding and reinforced normal/pressed rendering for the settings PNG control.

# v0.3.66-alpha

- Added captured Mac OS 9 Platinum PNG assets for the titlebar settings/menu control with normal and pressed states.
- Aligned the titlebar stripe band, title plaque, close box, settings box, collapse box, and zoom box to the same 18px vertical band.
- Normalized the MacOS 9 Platinum titlebar padding to 4px on the top and bottom so the lower chrome no longer reads heavier than the top.
- Cleaned up stale package artifact metadata so Windows package names track the current build version.

# v0.3.65-alpha

- Added captured Mac OS 9 Platinum PNG assets for close, minimize/collapse, and maximize/zoom window controls.
- Mapped normal and pressed control states into the MacOS 9 Platinum titlebar while preserving the close-left, collapse/zoom-right layout.
- Reused the close control PNG for MacOS 9 modal/settings close buttons so their chrome matches the titlebar controls.

# v0.3.64-alpha

- Applied the MacOS 9 Platinum hard-frame chrome treatment to the Settings window, including the square outer bevel, inner content frame, and matching sidebar button style without a footer strip.
- Added MacOS 9-specific spacing fixes for Install Center cards so artwork, status labels, titles, and footer metadata no longer stack over one another.
- Added MacOS 9-specific RetroAchievements row sizing and grid fixes to prevent game and achievement rows from clipping or overlapping in dense views.

# v0.3.63-alpha

- Removed the stray white footer seam introduced by the previous bevel pass.
- Moved the MacOS 9 Platinum bevel treatment back to the outer window surface, inner workspace frame, and footer status plaque instead of beveling the full footer strip.
- Tuned the inner workspace frame to use a harder black edge with a dark outside shadow/highlight closer to the provided MacOS 9 closeups.

# v0.3.62-alpha

- Set MacOS 9 Platinum window chrome to `#cccccc` with a crisp 1px inner bevel on the outer window surface.
- Set MacOS 9 Platinum inner workspace, panels, and content backgrounds to `#e1e1e1`.
- Restyled the footer connection status as a centered Mac OS 9-style beveled plaque with theme-correct text and no modern pill coloring.

# v0.3.61-alpha

- Made the MacOS 9 Platinum footer part of the outer chrome surface, matching the titlebar height and removing it from the inner workspace frame.
- Matched the main workspace background to the flat panel gray for a more uniform Platinum surface.
- Lowered and enlarged the titlebar stripes, title plaque, and window controls so the chrome reads more vertically centered.
- Added more lower padding to sidebar rows and removed the active sidebar glyph's white backing while preserving the icon image.

# v0.3.60-alpha

- Reworked MacOS 9 Platinum around a simplified hard-frame window treatment: one 1px charcoal outer outline, flat medium-gray chrome, and one 1px inner workspace outline.
- Set integer-pixel chrome gutters with roughly 4px of gray chrome on the left, right, and bottom, plus a larger titlebar band above the workspace.
- Removed soft window effects from the MacOS 9 shell treatment, including rounded corners, shadows, glow/filter effects, gradients, and leftover pseudo-frame seams.
- Kept the MacOS 9 titlebar stripes and controls aligned inside the flat chrome band while preserving the padded sidebar rows.

# v0.3.59-alpha

- Removed remaining stray MacOS 9 Platinum body-frame lines called out in the latest marked-up screenshot.
- Dropped the full-width black divider under the titlebar and kept the titlebar chrome visually clean.
- Vertically aligned titlebar controls and the settings/menu button with the titlebar stripe band.
- Added sidebar row padding for outer edges, glyphs, and labels, and adjusted the sidebar stack to better align with the first content band.
- Live-previewed the line/sidebar correction and captured `macos9-live-preview-v0.3.59-line-sidebar-fix.png`.

# v0.3.58-alpha

- Fixed MacOS 9 Platinum border and padding issues called out in the marked-up screenshot.
- Removed the decorative workspace overlay that caused double vertical borders, mismatched corners, and thick black ticks.
- Reduced the titlebar-to-workspace gap and made the line under the titlebar a single pixel.
- Rebased sidebar/content/footer edges on one real 1px workspace frame and replaced chunky titlebar stripe tiling with a continuous stripe pattern.
- Live-previewed the correction and captured `macos9-live-preview-v0.3.58-border-padding.png`.

# v0.3.57-alpha

- Tightened MacOS 9 Platinum into a more native-looking compact app layout.
- Reduced oversized modern page/card/form density, including page headers, cards, buttons, inputs, and profile rows.
- Reworked sidebar rows from beveled modern buttons into compact Platinum list rows with smaller icon sizing.
- Fixed MacOS 9 checkbox sizing so toggle rows no longer render as tall vertical controls.
- Live-previewed the updated pass and captured `macos9-live-preview-v0.3.57-native-pass.png`.

# v0.3.56-alpha

- Refined the MacOS 9 Platinum titlebar/window frame to match the simplified border mockup.
- Made the titlebar share the outer window border instead of drawing a separate bottom rule.
- Added a darker inset outer frame and moved the inner workspace border down to leave the left/right bottom gaps under the titlebar.
- Live-previewed the built app with the MacOS 9 theme forced in browser storage and captured `macos9-live-preview-v0.3.56-border-pass.png` for visual inspection.

# v0.3.55-alpha

- Reworked the MacOS 9 Platinum shell layout so the titlebar and footer span the full window width instead of being stretched from inside the main column.
- Restored the classic sidebar/content workspace structure below the titlebar with one black framed work area and no double-framed modern chrome.
- Tuned the 26px Platinum titlebar with a centered dark title plaque, stronger stripe rails, closer stripe spacing, and aligned close/collapse/zoom/menu controls.
- Re-centered MacOS 9 sidebar section labels, glyphs, and rows within the restored fixed workspace layout.

# v0.3.54-alpha

- Tightened the MacOS 9 Platinum special theme titlebar into a seamless 26px classic Platinum slab.
- Removed modern outer frame/shadow/glow layers for MacOS 9 Platinum and kept one black inner workspace frame below the titlebar.
- Repositioned MacOS 9 close, collapse, zoom, and settings/menu titlebar controls using the bundled image assets.
- Brought titlebar stripe rails closer to the title plaque and forced dark #202020 title text.
- Fixed MacOS 9 sidebar glyph selection to use `appStyle`, then forced sidebar glyphs to render as centered image assets instead of masks.

# v0.3.20-alpha

- Added Install Center JSON package manifest support for user-added GitHub packages.
- Supports manifest files named `mister-companion-package.json` and common variants inside repos.
- Supports direct raw `.json` manifest links and `.json.zip` / ZIP files containing a manifest JSON.
- Manifest installs can map individual files/folders, mark scripts executable, show post-install messages, and define uninstall removals.

# Changelog

## 0.3.17 review update - 2026-07-11

- Removed MiSTer settings controls that were inherited from LaserVault but were wired to no-op handlers, including New Library, Import ZIP, Load new XML, Export ZIP, and Reset library.
- Renamed the MiSTer settings navigation section from Libraries to Sidebar so it matches the MiSTer section-management workflow.
- Removed the static LaserVault wordmark import from the shared settings modal so the MiSTer production bundle no longer pulls the old 1 MB LaserVault header asset.
- Replaced remaining secondary LaserVault labels in shared theme naming and preview surfaces with generic VaultKit or app-specific wording.
- Updated the browser title and favicon used by the packaged web shell to MiSTer Companion EX.
- Added this changelog to the packaged source zip.
- Packaged the updated zip without `node_modules`, npm cache folders, release output, or Python bytecode caches.

## 0.3.17-alpha

- VaultKit Electron UI for MiSTer Companion using the Python core backend.
