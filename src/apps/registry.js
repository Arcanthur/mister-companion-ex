import { MISTER_APP_CONFIG } from "./mister/appConfig";

export const APP_CONFIGS = Object.freeze({
  [MISTER_APP_CONFIG.id]: MISTER_APP_CONFIG,
});

export const ACTIVE_APP_ID = import.meta.env.VITE_VAULTKIT_APP || MISTER_APP_CONFIG.id;
export const ACTIVE_APP_CONFIG = APP_CONFIGS[ACTIVE_APP_ID] || MISTER_APP_CONFIG;
