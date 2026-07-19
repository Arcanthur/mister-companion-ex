export function misterThemeAssetUrl(relativePath) {
  const cleanPath = String(relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  return `mister-vaultkit-media://asset/${cleanPath.split("/").map(encodeURIComponent).join("/")}`;
}

const wordmarkUrl = misterThemeAssetUrl("mister-companion-ex-logo.png");
const dashboardGlyphUrl = misterThemeAssetUrl("dashboard.svg");
const connectionGlyphUrl = misterThemeAssetUrl("connection.svg");
const deviceGlyphUrl = misterThemeAssetUrl("device.svg");
const remoteGlyphUrl = misterThemeAssetUrl("remote.svg");
const flashSdGlyphUrl = misterThemeAssetUrl("flash_sd.svg");
const scriptsGlyphUrl = misterThemeAssetUrl("scripts.svg");
const fileBrowserGlyphUrl = misterThemeAssetUrl("file_browser.svg");
const installCenterGlyphUrl = misterThemeAssetUrl("install_center.svg");
const misterSettingsGlyphUrl = misterThemeAssetUrl("mister_settings.svg");
const saveManagerGlyphUrl = misterThemeAssetUrl("savemanager.svg");
const zapScriptsGlyphUrl = misterThemeAssetUrl("zapscripts.png");
const zapScraperGlyphUrl = misterThemeAssetUrl("zapscraper.svg");
const retroAchievementsGlyphUrl = misterThemeAssetUrl("retroachievements.svg");
const manualsGlyphUrl = misterThemeAssetUrl("manuals.svg");

const win9xDashboardGlyphUrl = misterThemeAssetUrl("win9x/dashboard.svg");
const win9xConnectionGlyphUrl = misterThemeAssetUrl("win9x/connection.svg");
const win9xDeviceGlyphUrl = misterThemeAssetUrl("win9x/device.svg");
const win9xRemoteGlyphUrl = misterThemeAssetUrl("win9x/remote.svg");
const win9xFlashSdGlyphUrl = misterThemeAssetUrl("win9x/flash.svg");
const win9xScriptsGlyphUrl = misterThemeAssetUrl("win9x/scripts.svg");
const win9xFileBrowserGlyphUrl = misterThemeAssetUrl("win9x/files.svg");
const win9xInstallCenterGlyphUrl = misterThemeAssetUrl("win9x/install.svg");
const win9xMisterSettingsGlyphUrl = misterThemeAssetUrl("win9x/settings.svg");
const win9xSaveManagerGlyphUrl = misterThemeAssetUrl("win9x/saves.svg");
const win9xZapScriptsGlyphUrl = misterThemeAssetUrl("win9x/zapscripts.svg");
const win9xZapScraperGlyphUrl = misterThemeAssetUrl("win9x/zapscraper.svg");
const win9xRetroAchievementsGlyphUrl = misterThemeAssetUrl("win9x/retroachievements.svg");
const win9xManualsGlyphUrl = misterThemeAssetUrl("win9x/manuals.svg");

const macos9DashboardGlyphUrl = misterThemeAssetUrl("macos9/dashboard.svg");
const macos9ConnectionGlyphUrl = misterThemeAssetUrl("macos9/connection.svg");
const macos9DeviceGlyphUrl = misterThemeAssetUrl("macos9/device.svg");
const macos9RemoteGlyphUrl = misterThemeAssetUrl("macos9/remote.svg");
const macos9FlashSdGlyphUrl = misterThemeAssetUrl("macos9/flash.svg");
const macos9ScriptsGlyphUrl = misterThemeAssetUrl("macos9/scripts.svg");
const macos9FileBrowserGlyphUrl = misterThemeAssetUrl("macos9/files.svg");
const macos9InstallCenterGlyphUrl = misterThemeAssetUrl("macos9/install.svg");
const macos9MisterSettingsGlyphUrl = misterThemeAssetUrl("macos9/settings.svg");
const macos9SaveManagerGlyphUrl = misterThemeAssetUrl("macos9/saves.svg");
const macos9ZapScriptsGlyphUrl = misterThemeAssetUrl("macos9/zapscripts.svg");
const macos9ZapScraperGlyphUrl = misterThemeAssetUrl("macos9/zapscraper.svg");
const macos9RetroAchievementsGlyphUrl = misterThemeAssetUrl("macos9/retroachievements.svg");
const macos9ManualsGlyphUrl = misterThemeAssetUrl("macos9/manuals.svg");

export const MISTER_APP_CONFIG = Object.freeze({
  id: "mister-companion",
  name: "MiSTer Companion EX",
  shortName: "MiSTer EX",
  description: "MiSTer FPGA companion tools for setup, saves, installs, media, and management workflows.",
  storageNamespace: "mister-companion-vaultkit",
  assets: {
    wordmark: wordmarkUrl,
    aboutLogo: wordmarkUrl,
  },
  initialPage: "connection",
  sidebar: [
    {
      title: "MiSTer",
      items: [
        { id: "dashboard", label: "Dashboard", icon: "▦", iconImage: dashboardGlyphUrl, win9xIconImage: win9xDashboardGlyphUrl, macos9IconImage: macos9DashboardGlyphUrl, description: "Connection and device overview" },
        { id: "connection", label: "Connection", icon: "⇄", iconImage: connectionGlyphUrl, win9xIconImage: win9xConnectionGlyphUrl, macos9IconImage: macos9ConnectionGlyphUrl, description: "Profiles and SSH connection" },
        { id: "device", label: "Device", icon: "▣", iconImage: deviceGlyphUrl, win9xIconImage: win9xDeviceGlyphUrl, macos9IconImage: macos9DeviceGlyphUrl, description: "Live system summary" },
        { id: "remote", label: "Remote", icon: "⌁", iconImage: remoteGlyphUrl, win9xIconImage: win9xRemoteGlyphUrl, macos9IconImage: macos9RemoteGlyphUrl, description: "Companion Remote controller and daemon" },
        { id: "flash", label: "Flash SD", icon: "▤", iconImage: flashSdGlyphUrl, win9xIconImage: win9xFlashSdGlyphUrl, macos9IconImage: macos9FlashSdGlyphUrl, description: "Download installer images, prepare balena CLI, and flash SD cards" },
      ],
    },
    {
      title: "Manage",
      items: [
        { id: "scripts", label: "Scripts", icon: "◈", iconImage: scriptsGlyphUrl, win9xIconImage: win9xScriptsGlyphUrl, macos9IconImage: macos9ScriptsGlyphUrl, description: "MiSTer helper scripts" },
        { id: "files", label: "File Browser", icon: "▤", iconImage: fileBrowserGlyphUrl, win9xIconImage: win9xFileBrowserGlyphUrl, macos9IconImage: macos9FileBrowserGlyphUrl, description: "Browse, upload, download, and manage MiSTer files" },
        { id: "install", label: "Install Center", icon: "⌁", iconImage: installCenterGlyphUrl, win9xIconImage: win9xInstallCenterGlyphUrl, macos9IconImage: macos9InstallCenterGlyphUrl, description: "Scripts, cores, extras, wallpapers" },
        { id: "settings", label: "MiSTer Settings", icon: "⚙", iconImage: misterSettingsGlyphUrl, win9xIconImage: win9xMisterSettingsGlyphUrl, macos9IconImage: macos9MisterSettingsGlyphUrl, description: "Read and edit MiSTer.ini" },
        { id: "saves", label: "SaveManager", icon: "▧", iconImage: saveManagerGlyphUrl, win9xIconImage: win9xSaveManagerGlyphUrl, macos9IconImage: macos9SaveManagerGlyphUrl, description: "Backups and sync jobs" },
      ],
    },
    {
      title: "Extras",
      items: [
        { id: "zapscripts", label: "ZapScripts", icon: "ϟ", iconImage: zapScriptsGlyphUrl, win9xIconImage: win9xZapScriptsGlyphUrl, macos9IconImage: macos9ZapScriptsGlyphUrl, description: "Zaparoo launcher commands" },
        { id: "zapscraper", label: "ZapScraper", icon: "✦", iconImage: zapScraperGlyphUrl, win9xIconImage: win9xZapScraperGlyphUrl, macos9IconImage: macos9ZapScraperGlyphUrl, description: "Metadata and artwork workflow" },
        { id: "retroachievements", label: "RetroAchievements", icon: "RA", iconImage: retroAchievementsGlyphUrl, win9xIconImage: win9xRetroAchievementsGlyphUrl, macos9IconImage: macos9RetroAchievementsGlyphUrl, description: "Profile, progress, achievements, and game set viewer" },
        { id: "manuals", label: "Manuals", icon: "▤", iconImage: manualsGlyphUrl, win9xIconImage: win9xManualsGlyphUrl, macos9IconImage: macos9ManualsGlyphUrl, description: "Cached manual library" },
      ],
    },
  ],
});

export const MISTER_THEME_STORAGE_KEY = "mister-companion-vaultkit-theme-v1";
export const MISTER_SAVED_THEMES_STORAGE_KEY = "mister-companion-vaultkit-saved-themes-v1";
export const MISTER_SIDEBAR_GLYPHS_STORAGE_KEY = "mister-companion-vaultkit-sidebar-glyphs-v1";
