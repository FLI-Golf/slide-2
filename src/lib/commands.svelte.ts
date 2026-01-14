import { invoke } from '@tauri-apps/api/core';

// Check if running inside Tauri
export const isTauri = () => typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;

export const preventDefault = <T extends Event>(fn: (e: T) => void): ((e: T) => void) => {
    return (e: T) => {
        e.preventDefault();
        fn(e);
    };
};

// Generate unique IDs
export const generateId = () => crypto.randomUUID();

// Storage helper for browser persistence
const storage = {
    save: (key: string, data: unknown) => {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(data));
        }
    },
    load: <T>(key: string): T | null => {
        if (typeof localStorage !== 'undefined') {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        }
        return null;
    }
};
