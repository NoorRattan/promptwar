/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_VAPID_KEY: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_GA_MEASUREMENT_ID: string;
  readonly VITE_FIRESTORE_EMULATOR_HOST?: string;
  readonly VITE_FIRESTORE_EMULATOR_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  google?: typeof google;
}

// Google Charts — loaded via CDN, not npm. Declare global to satisfy TypeScript strict mode.
declare namespace google {
  namespace charts {
    function load(version: string, options: { packages: string[] }): void
    function setOnLoadCallback(callback: () => void): void
  }
  namespace visualization {
    class DataTable {
      addColumn(type: string, label: string): void
      addRows(rows: Array<Array<string | number | null>>): void
    }
    class LineChart {
      constructor(container: HTMLElement)
      draw(data: DataTable, options: Record<string, unknown>): void
    }
    class ColumnChart {
      constructor(container: HTMLElement)
      draw(data: DataTable, options: Record<string, unknown>): void
    }
    class PieChart {
      constructor(container: HTMLElement)
      draw(data: DataTable, options: Record<string, unknown>): void
    }
  }
}
