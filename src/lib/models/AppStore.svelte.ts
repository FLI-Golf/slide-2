import { Week, type WeekData } from './Week.svelte';
import { Player, type PlayerData } from './Player.svelte';
import { jsonBinService } from '$lib/services';

const STORAGE_KEY = 'slide_app_data';

interface AppData {
    weeks: WeekData[];
    players: PlayerData[];
    activeWeekId: string | null;
    version: number;
}

export type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export class AppStore {
    private _weeks = $state<Week[]>([]);
    private _players = $state<Player[]>([]);
    private _activeWeekId = $state<string | null>(null);
    private _initialized = $state(false);
    private _syncState = $state<SyncState>('idle');
    private _syncError = $state<string | null>(null);
    private _lastSynced = $state<string | null>(null);
    private _saveTimeout: ReturnType<typeof setTimeout> | null = null;

    // Getters
    get weeks() { return this._weeks; }
    get players() { return this._players; }
    get activeWeekId() { return this._activeWeekId; }
    get initialized() { return this._initialized; }
    get syncState() { return this._syncState; }
    get syncError() { return this._syncError; }
    get lastSynced() { return this._lastSynced; }
    get isCloudEnabled() { return jsonBinService.isConfigured; }

    get activeWeek(): Week | undefined {
        if (!this._activeWeekId) return undefined;
        return this._weeks.find(w => w.id === this._activeWeekId);
    }

    get activeWeeks() {
        return this._weeks.filter(w => w.active);
    }

    get inactiveWeeks() {
        return this._weeks.filter(w => !w.active);
    }

    get weekCount() {
        return this._weeks.length;
    }

    get playerCount() {
        return this._players.length;
    }

    // Initialization
    async init() {
        if (this._initialized) return;
        
        // First load from localStorage for immediate display
        this.loadLocal();
        this._initialized = true;

        // Then try to sync from cloud
        if (jsonBinService.isConfigured) {
            await this.syncFromCloud();
        }
    }

    // Player Roster Management
    addPlayer(name: string, account_number: number): Player {
        const player = new Player(name, account_number);
        this._players.push(player);
        this.save();
        return player;
    }

    removePlayer(id: string): boolean {
        const index = this._players.findIndex(p => p.id === id);
        if (index !== -1) {
            this._players.splice(index, 1);
            this.save();
            return true;
        }
        return false;
    }

    getPlayer(id: string): Player | undefined {
        return this._players.find(p => p.id === id);
    }

    getPlayerByAccount(account_number: number): Player | undefined {
        return this._players.find(p => p.account_number === account_number);
    }

    // Week Management
    createWeek(name: string): Week {
        const week = new Week(name);
        this._weeks.push(week);
        this.save();
        return week;
    }

    deleteWeek(id: string): boolean {
        const index = this._weeks.findIndex(w => w.id === id);
        if (index !== -1) {
            this._weeks.splice(index, 1);
            if (this._activeWeekId === id) {
                this._activeWeekId = null;
            }
            this.save();
            return true;
        }
        return false;
    }

    getWeek(id: string): Week | undefined {
        return this._weeks.find(w => w.id === id);
    }

    setActiveWeek(id: string | null) {
        this._activeWeekId = id;
        this.save();
    }

    // Duplicate a week (for starting a new week based on previous)
    duplicateWeek(id: string, newName: string): Week | undefined {
        const source = this.getWeek(id);
        if (!source) return undefined;

        const newWeek = this.createWeek(newName);
        
        // Copy players without amounts (fresh start)
        for (const player of source.players) {
            const newPlayer = newWeek.addPlayer(player.name, player.account_number);
            // Optionally carry over the result as carry_amount
            if (player.result !== 0) {
                newPlayer.carryOver(player.result, source.id);
            }
        }

        this.save();
        return newWeek;
    }

    // Create next week from a closed week with carry forwards
    createNextWeekFromClosed(closedWeekId: string): Week | undefined {
        const closedWeek = this.getWeek(closedWeekId);
        if (!closedWeek || !closedWeek.isClosed) return undefined;

        // Generate next week name
        const weekNum = this._weeks.length + 1;
        const newWeek = this.createWeek(`Week ${weekNum}`);

        // Set date range - start day after closed week's end
        const closedEndDate = new Date(closedWeek.end);
        // Add 1 day to get the next day, use noon to avoid timezone shifts
        const startDate = new Date(closedEndDate);
        startDate.setDate(startDate.getDate() + 1);
        startDate.setHours(12, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6); // 7 day week (start + 6 days)
        endDate.setHours(12, 0, 0, 0);
        
        newWeek.start = startDate.toISOString();
        newWeek.end = endDate.toISOString();

        // Link weeks
        newWeek.previous_week_id = closedWeek.id;
        closedWeek.next_week_id = newWeek.id;

        // Get carry forward data
        const carries = closedWeek.getCarryForwardData();

        // Add players with carry amounts
        for (const carry of carries) {
            const newPlayer = newWeek.addPlayer(carry.name, carry.account_number);
            newPlayer.carryOver(carry.carry_amount, closedWeek.id);
        }

        newWeek.calculateTotals();
        newWeek.activate();
        this.save();

        return newWeek;
    }

    // Get running balance across all weeks
    getRunningBalance(): { 
        totalExpected: number; 
        totalCollected: number; 
        totalOutstanding: number;
        weeklyBreakdown: { weekId: string; weekName: string; expected: number; collected: number; outstanding: number }[] 
    } {
        let totalExpected = 0;
        let totalCollected = 0;
        const weeklyBreakdown: { weekId: string; weekName: string; expected: number; collected: number; outstanding: number }[] = [];

        for (const week of this._weeks) {
            if (week.isClosed) {
                totalExpected += week.expected_in;
                totalCollected += week.actual_collected;
                weeklyBreakdown.push({
                    weekId: week.id,
                    weekName: week.name,
                    expected: week.expected_in,
                    collected: week.actual_collected,
                    outstanding: week.uncollected
                });
            }
        }

        return {
            totalExpected,
            totalCollected,
            totalOutstanding: totalExpected - totalCollected,
            weeklyBreakdown
        };
    }

    // Persistence - Local Storage
    private getAppData(): AppData {
        return {
            weeks: this._weeks.map(w => w.toJSON()),
            players: this._players.map(p => p.toJSON()),
            activeWeekId: this._activeWeekId,
            version: 1
        };
    }

    private applyAppData(data: AppData) {
        this._weeks = data.weeks.map(w => Week.fromJSON(w));
        this._players = (data.players || []).map(p => Player.fromJSON(p));
        this._activeWeekId = data.activeWeekId;
    }

    private saveLocal() {
        if (typeof localStorage === 'undefined') return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.getAppData()));
        } catch (e) {
            console.error('Failed to save app data locally:', e);
        }
    }

    private loadLocal() {
        if (typeof localStorage === 'undefined') return;

        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;

            const data: AppData = JSON.parse(raw);
            this.applyAppData(data);
        } catch (e) {
            console.error('Failed to load app data locally:', e);
        }
    }

    // Persistence - Cloud Storage (JSONbin)
    private async syncToCloud() {
        if (!jsonBinService.isConfigured) return;

        this._syncState = 'syncing';
        this._syncError = null;

        const result = await jsonBinService.update(this.getAppData());

        if (result.success) {
            this._syncState = 'success';
            this._lastSynced = new Date().toISOString();
            // Reset to idle after 2 seconds
            setTimeout(() => {
                if (this._syncState === 'success') {
                    this._syncState = 'idle';
                }
            }, 2000);
        } else {
            this._syncState = 'error';
            this._syncError = result.error || 'Unknown error';
        }
    }

    async syncFromCloud(): Promise<boolean> {
        if (!jsonBinService.isConfigured) return false;

        this._syncState = 'syncing';
        this._syncError = null;

        const result = await jsonBinService.read<AppData>();

        if (result.success && result.data) {
            this.applyAppData(result.data);
            this.saveLocal(); // Update local storage with cloud data
            this._syncState = 'success';
            this._lastSynced = new Date().toISOString();
            setTimeout(() => {
                if (this._syncState === 'success') {
                    this._syncState = 'idle';
                }
            }, 2000);
            return true;
        } else if (result.error === 'No bin ID stored') {
            // No cloud data yet, that's okay
            this._syncState = 'idle';
            return false;
        } else {
            this._syncState = 'error';
            this._syncError = result.error || 'Unknown error';
            return false;
        }
    }

    // Debounced save - saves locally immediately, syncs to cloud after delay
    save() {
        this.saveLocal();

        // Debounce cloud sync to avoid too many API calls
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }

        if (jsonBinService.isConfigured) {
            this._saveTimeout = setTimeout(() => {
                this.syncToCloud();
            }, 1000); // Wait 1 second after last change before syncing
        }
    }

    // Force immediate sync to cloud
    async forceSyncToCloud() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
            this._saveTimeout = null;
        }
        await this.syncToCloud();
    }

    clear() {
        this._weeks = [];
        this._players = [];
        this._activeWeekId = null;
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY);
        }
        // Also clear cloud data
        if (jsonBinService.isConfigured) {
            this.syncToCloud();
        }
    }

    // Export/Import for backup
    export(): string {
        const data: AppData = {
            weeks: this._weeks.map(w => w.toJSON()),
            players: this._players.map(p => p.toJSON()),
            activeWeekId: this._activeWeekId,
            version: 1
        };
        return JSON.stringify(data, null, 2);
    }

    import(jsonString: string): boolean {
        try {
            const data: AppData = JSON.parse(jsonString);
            this._weeks = data.weeks.map(w => Week.fromJSON(w));
            this._players = (data.players || []).map(p => Player.fromJSON(p));
            this._activeWeekId = data.activeWeekId;
            this.save();
            return true;
        } catch (e) {
            console.error('Failed to import data:', e);
            return false;
        }
    }
}

// Singleton instance
export const appStore = new AppStore();
