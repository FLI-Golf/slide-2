import { Week, type WeekData } from './Week.svelte';
import { Player, type PlayerData, type CarryPayment } from './Player.svelte';
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

    // Players with outstanding carry balances
    get playersWithCarry() {
        return this._players.filter(p => p.hasCarry);
    }

    get totalOutstandingCarry() {
        return this._players.reduce((sum, p) => sum + p.carry_balance, 0);
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

        // Migrate: backfill carry_balance from closed weeks for data created before carry tracking
        this.migrateCarryBalances();
    }

    /**
     * One-time migration: scan closed weeks for unpaid/partial carries
     * and backfill roster Player.carry_balance if it's currently 0.
     * Only runs if no players have a carry_balance yet (pre-migration data).
     */
    private migrateCarryBalances() {
        const anyHasCarry = this._players.some(p => p.carry_balance > 0);
        if (anyHasCarry) return; // Already migrated

        let migrated = false;
        for (const week of this._weeks) {
            if (!week.isClosed) continue;
            for (const pw of week.players) {
                if (pw.carryForward > 0) {
                    const rosterPlayer = this.getPlayerByAccount(pw.account_number);
                    if (rosterPlayer) {
                        rosterPlayer.addCarry(pw.carryForward);
                        migrated = true;
                    }
                }
            }
        }

        if (migrated) {
            this.save();
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

    // Carry Payment Management

    /** Record a lump-sum payment against a player's total carry balance */
    recordCarryPayment(accountNumber: number, amount: number, note: string = ''): CarryPayment | null {
        const player = this.getPlayerByAccount(accountNumber);
        if (!player) return null;
        const payment = player.recordPayment(amount, note);
        this.save();
        return payment;
    }

    /** Record a payment against a specific week's carry */
    recordWeekCarryPayment(accountNumber: number, amount: number, weekId: string, note: string = ''): CarryPayment | null {
        const player = this.getPlayerByAccount(accountNumber);
        if (!player) return null;
        const payment = player.recordPayment(amount, note, weekId);
        this.save();
        return payment;
    }

    /** Pay off a player's entire carry balance */
    payOffAllCarry(accountNumber: number, note: string = ''): CarryPayment | null {
        const player = this.getPlayerByAccount(accountNumber);
        if (!player) return null;
        const payment = player.payOffAll(note);
        if (payment) this.save();
        return payment;
    }

    /** Undo a carry payment */
    undoCarryPayment(accountNumber: number, paymentId: string) {
        const player = this.getPlayerByAccount(accountNumber);
        if (!player) return;
        player.removePayment(paymentId);
        this.save();
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

    /**
     * Close a week and update player carry balances.
     * Called after all players have been reviewed (paid/unpaid/partial).
     */
    closeWeekAndUpdateCarries(weekId: string) {
        const week = this.getWeek(weekId);
        if (!week) return;

        // Ensure carried players are marked unpaid before calculating carry forwards.
        for (const pw of week.players) {
            if (pw.carried && pw.payment_status === 'pending') {
                pw.markUnpaid();
            }
        }

        // For each player with a carry forward, update their roster carry_balance
        for (const pw of week.players) {
            const carryFwd = pw.carryForward;
            if (carryFwd > 0) {
                const rosterPlayer = this.getPlayerByAccount(pw.account_number);
                if (rosterPlayer) {
                    rosterPlayer.addCarry(carryFwd);
                }
            }
        }

        week.finalizeClose();
        this.save();
    }

    /**
     * Reopen a closed week. Reverses carry balance additions.
     */
    reopenWeek(weekId: string) {
        const week = this.getWeek(weekId);
        if (!week || !week.isClosed) return;

        // Reverse carry additions
        for (const pw of week.players) {
            const carryFwd = pw.carryForward;
            if (carryFwd > 0) {
                const rosterPlayer = this.getPlayerByAccount(pw.account_number);
                if (rosterPlayer) {
                    rosterPlayer.removeCarry(carryFwd);
                }
            }
        }

        week.cancelClose();
        this.save();
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
        const startDate = new Date(closedEndDate);
        startDate.setDate(startDate.getDate() + 1);
        startDate.setHours(12, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(12, 0, 0, 0);
        
        newWeek.start = startDate.toISOString();
        newWeek.end = endDate.toISOString();

        // Link weeks
        newWeek.previous_week_id = closedWeek.id;
        closedWeek.next_week_id = newWeek.id;

        // Only add players who owe money (carry forward > 0)
        const carries = closedWeek.getCarryForwardData();
        for (const carry of carries) {
            const newPlayer = newWeek.addPlayer(carry.name, carry.account_number);
            newPlayer.carryOver(carry.carry_amount, closedWeek.id);

            const rosterPlayer = this.getPlayerByAccount(carry.account_number);
            if (rosterPlayer) {
                newPlayer.prior_carry_balance = rosterPlayer.carry_balance;
            }
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

    /** Per-player carry breakdown: which weeks contributed to their balance */
    getPlayerCarryBreakdown(accountNumber: number): { weekId: string; weekName: string; amount: number }[] {
        const breakdown: { weekId: string; weekName: string; amount: number }[] = [];
        for (const week of this._weeks) {
            if (week.isClosed) {
                const pw = week.getPlayerByAccount(accountNumber);
                if (pw && pw.carryForward > 0) {
                    breakdown.push({
                        weekId: week.id,
                        weekName: week.name,
                        amount: pw.carryForward
                    });
                }
            }
        }
        return breakdown;
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
            this.saveLocal();
            this._syncState = 'success';
            this._lastSynced = new Date().toISOString();
            setTimeout(() => {
                if (this._syncState === 'success') {
                    this._syncState = 'idle';
                }
            }, 2000);
            return true;
        } else if (result.error === 'No bin ID stored') {
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

        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }

        if (jsonBinService.isConfigured) {
            this._saveTimeout = setTimeout(() => {
                this.syncToCloud();
            }, 1000);
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
