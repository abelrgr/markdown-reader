import { fakeNative } from './fake';
import { tauriNative } from './tauri';
import type { NativeApi } from './types';

export const native: NativeApi = import.meta.env.MODE === 'e2e' ? fakeNative : tauriNative;
