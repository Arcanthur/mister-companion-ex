import { createRoot } from "react-dom/client";
import "./embedded-fonts.css";
import "./styles.css";
import "./mister-vaultkit.css";
import "./win9x.css";
import "./macos-platinum.css";
import { MisterCompanionApp } from "./App";
import { ThemePreviewApp } from "./components/theme/ThemePreviewWindow";
import { ManualPdfWindow } from "./components/manuals/ManualPdfWindow";
import { ACTIVE_APP_CONFIG } from "./apps/registry";

const searchParams = new URLSearchParams(window.location.search);
const isThemePreviewWindow = searchParams.get("themePreview") === "1";
const isManualPdfWindow = searchParams.get("manualPdf") === "1";
const rootElement = document.getElementById("root");
const appRoot = rootElement.__vaultKitReactRoot || createRoot(rootElement);
rootElement.__vaultKitReactRoot = appRoot;

appRoot.render(isThemePreviewWindow ? <ThemePreviewApp /> : isManualPdfWindow ? <ManualPdfWindow /> : <MisterCompanionApp appConfig={ACTIVE_APP_CONFIG} />);
