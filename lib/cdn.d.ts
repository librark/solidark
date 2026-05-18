import type { Component } from "./index.js";

export {
  Component,
  SolidarkRuntime,
  html
} from "./index.js";

export const SOLIDARK_CDN_BASE_URL: "https://unpkg.com";
export const SOLIDARK_DEFAULT_OPENCASCADE_VERSION: "1.1.1";
export const SOLIDARK_DEFAULT_THREE_VERSION: "0.172.0";

export type SolidarkCdnBootOptions = {
  defineElements?: boolean;
  elementsImporter?: () => Promise<{ defineSolidarkElements?: () => readonly (typeof Component)[] }>;
  importer?: (specifier: string) => Promise<unknown>;
  kernel?: "opencascade" | "memory";
  loadThree?: boolean;
  openCascadeModuleUrl?: string;
  openCascadeWasmUrl?: string;
  runtime?: { configure(options: Record<string, unknown>): unknown };
  target?: Record<string, unknown>;
  threeGlobal?: string;
  threeUrl?: string;
  initOptions?: Record<string, unknown>;
};

export type SolidarkCdnBootResult = {
  Component: typeof Component;
  SolidarkRuntime: unknown;
  defineSolidarkElements?: () => readonly (typeof Component)[];
  elements: readonly (typeof Component)[];
  html: typeof String.raw;
  mode: "opencascade" | "memory";
  three: unknown;
};

export function bootSolidarkCdn(options?: SolidarkCdnBootOptions): Promise<SolidarkCdnBootResult>;
export function configureCdnKernel(options?: SolidarkCdnBootOptions): unknown;
export function createOpenCascadeCdnInitOptions(options?: {
  initOptions?: Record<string, unknown>;
  openCascadeWasmUrl?: string;
}): Record<string, unknown> & { locateFile(path: string): string };
export function loadCdnThree(options?: SolidarkCdnBootOptions): Promise<unknown>;
export function cdnPackageUrl(name: string, version: string, path?: string): string;
