/// <reference types="vite/client" />
import type { JarvisApi } from '@shared/api';

declare global {
  interface Window {
    api: JarvisApi;
  }
}

export {};
