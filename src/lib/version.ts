declare const __APP_VERSION__: string;
declare const __GIT_SHA__: string;
declare const __BUILD_TIME__: string;

export const APP_VERSION = __APP_VERSION__;
export const GIT_SHA = __GIT_SHA__;
export const BUILD_TIME = __BUILD_TIME__;
export const PLAN_DOC_VERSION = 'v2.4';
/** Migration mới nhất app cần (§15.5). */
export const MIN_SCHEMA_VERSION = '20261027000800';
