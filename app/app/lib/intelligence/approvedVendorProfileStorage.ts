/**
 * Client-only persistence for an explicitly approved canonical VendorProfile.
 * Never touches localStorage during SSR. Never stores secrets or research payloads.
 */
import type { VendorProfile } from "./vendorProfile.ts";
import { parseVendorProfileStructurally } from "./vendorProfileSchema.ts";
import { validateVendorProfile } from "./vendorProfileValidation.ts";

export const APPROVED_VENDOR_PROFILE_STORAGE_KEY = "gtm-brain:approved-vendor-profile:v1";

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type SaveApprovedVendorProfileResult =
  | { ok: true; profile: VendorProfile }
  | { ok: false; errors: string[] };

const APPROVED_VENDOR_CHANGED_EVENT = "gtm-brain-approved-vendor-changed";

/**
 * Cache approved snapshots by storage instance so `useSyncExternalStore` getSnapshot
 * returns a stable object reference until the underlying serialized value changes.
 */
const snapshotCache = new WeakMap<
  StorageLike,
  { raw: string | null; profile: VendorProfile | null }
>();

/** Stable server/SSR snapshot — never reads localStorage. */
const SERVER_SNAPSHOT: null = null;

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage === null) {
    return null;
  }
  if (storage !== undefined) {
    return storage;
  }
  return getBrowserStorage();
}

function readRaw(store: StorageLike): string | null {
  try {
    return store.getItem(APPROVED_VENDOR_PROFILE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeCache(
  store: StorageLike,
  raw: string | null,
  profile: VendorProfile | null,
): void {
  snapshotCache.set(store, { raw, profile });
}

/**
 * Parse + validate raw JSON without notifying subscribers.
 * Clears invalid entries quietly so getSnapshot stays side-effect-light.
 */
function materializeApprovedProfile(
  store: StorageLike,
  raw: string | null,
): VendorProfile | null {
  if (raw === null || raw === undefined || raw.trim() === "") {
    return null;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    try {
      store.removeItem(APPROVED_VENDOR_PROFILE_STORAGE_KEY);
    } catch {
      // Ignore clear failures — treat as absent.
    }
    return null;
  }

  const validated = validateApprovedVendorProfile(parsedJson);
  if (!validated.ok) {
    try {
      store.removeItem(APPROVED_VENDOR_PROFILE_STORAGE_KEY);
    } catch {
      // Ignore clear failures — treat as absent.
    }
    return null;
  }

  return validated.profile;
}

function notifyApprovedVendorChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(APPROVED_VENDOR_CHANGED_EVENT));
}

/** Subscribe to approved-profile changes for `useSyncExternalStore` (client only). */
export function subscribeApprovedVendorProfile(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(APPROVED_VENDOR_CHANGED_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(APPROVED_VENDOR_CHANGED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/**
 * Validates structurally + semantically. Returns errors without writing.
 */
export function validateApprovedVendorProfile(value: unknown): SaveApprovedVendorProfileResult {
  const structural = parseVendorProfileStructurally(value);
  if (!structural.success) {
    return { ok: false, errors: [structural.error] };
  }

  const semanticErrors = validateVendorProfile(structural.data);
  if (semanticErrors.length > 0) {
    return { ok: false, errors: semanticErrors };
  }

  return { ok: true, profile: structural.data };
}

/**
 * Snapshot reader for `useSyncExternalStore`.
 * Returns the same object reference until the stored serialized value changes.
 */
export function getApprovedVendorProfileSnapshot(
  storage?: StorageLike | null,
): VendorProfile | null {
  const store = resolveStorage(storage);
  if (!store) {
    return null;
  }

  const raw = readRaw(store);
  const cached = snapshotCache.get(store);
  if (cached && cached.raw === raw) {
    return cached.profile;
  }

  const profile = materializeApprovedProfile(store, raw);
  // Re-read after possible quiet clear of malformed data.
  const finalRaw = readRaw(store);
  writeCache(store, finalRaw, profile);
  return profile;
}

/**
 * Loads the approved profile. Clears and returns null when missing, malformed,
 * structurally invalid, or semantically invalid.
 * Uses the cached snapshot when the serialized value is unchanged.
 */
export function loadApprovedVendorProfile(storage?: StorageLike | null): VendorProfile | null {
  return getApprovedVendorProfileSnapshot(storage);
}

/** Server snapshot for `useSyncExternalStore` — never reads localStorage. */
export function getApprovedVendorProfileServerSnapshot(): null {
  return SERVER_SNAPSHOT;
}

/**
 * Saves only after structural + semantic validation succeed.
 */
export function saveApprovedVendorProfile(
  profile: VendorProfile,
  storage?: StorageLike | null,
): SaveApprovedVendorProfileResult {
  const validated = validateApprovedVendorProfile(profile);
  if (!validated.ok) {
    return validated;
  }

  const store = resolveStorage(storage);
  if (!store) {
    return { ok: false, errors: ["Local storage is not available in this environment."] };
  }

  const serialized = JSON.stringify(validated.profile);
  try {
    store.setItem(APPROVED_VENDOR_PROFILE_STORAGE_KEY, serialized);
  } catch {
    return { ok: false, errors: ["Could not save the approved Vendor Profile locally."] };
  }

  writeCache(store, serialized, validated.profile);
  notifyApprovedVendorChanged();
  return { ok: true, profile: validated.profile };
}

export function clearApprovedVendorProfile(storage?: StorageLike | null): void {
  const store = resolveStorage(storage);
  if (!store) {
    return;
  }
  try {
    store.removeItem(APPROVED_VENDOR_PROFILE_STORAGE_KEY);
  } catch {
    // Ignore storage failures on clear — caller treats profile as absent.
  }
  writeCache(store, null, null);
  notifyApprovedVendorChanged();
}
