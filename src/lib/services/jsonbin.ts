const BASE_URL = import.meta.env.VITE_JSONBIN_BASE_URL as string || 'https://api.jsonbin.io/v3';
const API_KEY = import.meta.env.VITE_JSONBIN_API_KEY as string | undefined;
const COLLECTION_ID = import.meta.env.VITE_JSONBIN_COLLECTION_ID as string | undefined;
const FIXED_BIN_ID = import.meta.env.VITE_JSONBIN_BIN_ID as string | undefined;
const BIN_ID_KEY = 'slide_jsonbin_id';

export interface SyncStatus {
    syncing: boolean;
    lastSynced: string | null;
    error: string | null;
}

class JSONBinService {
    private binId: string | null = null;

    constructor() {
        // Use fixed bin ID from env, or fall back to localStorage
        if (FIXED_BIN_ID) {
            this.binId = FIXED_BIN_ID;
        } else if (typeof localStorage !== 'undefined') {
            this.binId = localStorage.getItem(BIN_ID_KEY);
        }
    }

    get isConfigured(): boolean {
        return !!API_KEY;
    }

    get hasBin(): boolean {
        return !!this.binId;
    }

    getBinId(): string | null {
        return this.binId;
    }

    setBinId(id: string) {
        this.binId = id;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(BIN_ID_KEY, id);
        }
    }

    async create<T>(data: T): Promise<{ success: boolean; binId?: string; error?: string }> {
        if (!API_KEY) {
            return { success: false, error: 'API key not configured' };
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Master-Key': API_KEY,
            'X-Bin-Name': 'slide-app-data',
            'X-Bin-Private': 'true'
        };

        if (COLLECTION_ID) {
            headers['X-Collection-Id'] = COLLECTION_ID;
        }

        try {
            const response = await fetch(`${BASE_URL}/b`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                return { success: false, error: error.message || 'Failed to create bin' };
            }

            const result = await response.json();
            const binId = result.metadata.id;
            this.setBinId(binId);
            return { success: true, binId };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Network error' };
        }
    }

    async read<T>(): Promise<{ success: boolean; data?: T; error?: string }> {
        if (!API_KEY) {
            return { success: false, error: 'API key not configured' };
        }

        if (!this.binId) {
            return { success: false, error: 'No bin ID stored' };
        }

        try {
            const response = await fetch(`${BASE_URL}/b/${this.binId}`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': API_KEY
                }
            });

            if (!response.ok) {
                const error = await response.json();
                return { success: false, error: error.message || 'Failed to read bin' };
            }

            const result = await response.json();
            return { success: true, data: result.record as T };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Network error' };
        }
    }

    async update<T>(data: T): Promise<{ success: boolean; error?: string }> {
        if (!API_KEY) {
            return { success: false, error: 'API key not configured' };
        }

        if (!this.binId) {
            // No bin exists, create one
            const createResult = await this.create(data);
            return { success: createResult.success, error: createResult.error };
        }

        try {
            const response = await fetch(`${BASE_URL}/b/${this.binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                return { success: false, error: error.message || 'Failed to update bin' };
            }

            return { success: true };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Network error' };
        }
    }
}

export const jsonBinService = new JSONBinService();
