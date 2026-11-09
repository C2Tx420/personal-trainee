declare const __APP_VERSION__: string;
declare const __GIT_SHA__: string;
declare const __BUILD_TIME__: string;

export const APP_VERSION = __APP_VERSION__;
export const GIT_SHA = __GIT_SHA__;
export const BUILD_TIME = __BUILD_TIME__;
export const PLAN_DOC_VERSION = 'v2.8';
/** Oldest DB schema this app build works with (§15.5) — 20261108000100 adds `upper`. */
export const MIN_SCHEMA_VERSION = '20261108000100';
