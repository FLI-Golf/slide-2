import { generateId } from '$lib/commands.svelte';
import { PlayerWeek, type PlayerWeekData } from './PlayerWeek.svelte';

export type WeekStatus = 'active' | 'pending_close' | 'closed';

export interface WeekData {
    id: string;
    name: string;
    players: PlayerWeekData[];
    start: string;
    end: string;
    in_total: number;
    out_total: number;
    result: number;
    vig: number;
    status: WeekStatus;
    // Collection tracking
    expected_in: number;      // Total expected to collect (in amounts)
    actual_collected: number; // What was actually collected
    total_carried_in: number; // Carries brought into this week
    total_carried_out: number; // Carries going to next week
    closed_date: string | null;
    previous_week_id: string | null;  // Link to previous week
    next_week_id: string | null;      // Link to next week
    created: string;
    updated: string;
}

export class Week {
    private _state = $state<Omit<WeekData, 'players'>>({
        id: '',
        name: '',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        in_total: 0,
        out_total: 0,
        result: 0,
        vig: 0,
        status: 'active',
        expected_in: 0,
        actual_collected: 0,
        total_carried_in: 0,
        total_carried_out: 0,
        closed_date: null,
        previous_week_id: null,
        next_week_id: null,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    });

    private _players = $state<PlayerWeek[]>([]);

    constructor(name: string = '') {
        this._state.id = generateId();
        this._state.name = name;
        this._state.created = new Date().toISOString();
        this._state.updated = new Date().toISOString();
    }

    // Getters
    get id() { return this._state.id; }
    get name() { return this._state.name; }
    get start() { return this._state.start; }
    get end() { return this._state.end; }
    get in_total() { return this._state.in_total; }
    get out_total() { return this._state.out_total; }
    get result() { return this._state.result; }
    get vig() { return this._state.vig; }
    get status() { return this._state.status; }
    get expected_in() { return this._state.expected_in; }
    get actual_collected() { return this._state.actual_collected; }
    get total_carried_in() { return this._state.total_carried_in; }
    get total_carried_out() { return this._state.total_carried_out; }
    get closed_date() { return this._state.closed_date; }
    get previous_week_id() { return this._state.previous_week_id; }
    get next_week_id() { return this._state.next_week_id; }
    get created() { return this._state.created; }
    get updated() { return this._state.updated; }
    get players() { return this._players; }

    // Status helpers
    get isActive() { return this._state.status === 'active'; }
    get isPendingClose() { return this._state.status === 'pending_close'; }
    get isClosed() { return this._state.status === 'closed'; }

    // Legacy getter for backward compatibility
    get active() { return this._state.status === 'active'; }

    // Setters
    set name(value: string) {
        this._state.name = value;
        this.touch();
    }

    set start(value: string) {
        this._state.start = value;
        this.touch();
    }

    set end(value: string) {
        this._state.end = value;
        this.touch();
    }

    set vig(value: number) {
        this._state.vig = value;
        this.calculateTotals();
        this.touch();
    }

    set status(value: WeekStatus) {
        this._state.status = value;
        this.touch();
    }

    set previous_week_id(value: string | null) {
        this._state.previous_week_id = value;
        this.touch();
    }

    set next_week_id(value: string | null) {
        this._state.next_week_id = value;
        this.touch();
    }

    // Legacy setter for backward compatibility
    set active(value: boolean) {
        this._state.status = value ? 'active' : 'closed';
        this.touch();
    }

    // Computed properties
    get playerCount() { return this._players.length; }
    
    get playersIn() { 
        return this._players.filter(p => p.isIn); 
    }
    
    get playersOut() { 
        return this._players.filter(p => p.isOut); 
    }

    get netResult() {
        return this._state.in_total - this._state.out_total - this._state.vig;
    }

    // Payment status counts
    get playersPaid() { return this._players.filter(p => p.payment_status === 'paid'); }
    get playersUnpaid() { return this._players.filter(p => p.payment_status === 'unpaid'); }
    get playersPartial() { return this._players.filter(p => p.payment_status === 'partial'); }
    get playersPending() { return this._players.filter(p => p.payment_status === 'pending'); }

    // Collection summary
    get collectionRate() {
        if (this._state.expected_in === 0) return 100;
        return (this._state.actual_collected / this._state.expected_in) * 100;
    }

    get uncollected() {
        return this._state.expected_in - this._state.actual_collected;
    }

    // Methods
    private touch() {
        this._state.updated = new Date().toISOString();
    }

    calculateTotals() {
        this._state.in_total = this._players
            .filter(p => p.amount > 0)
            .reduce((sum, p) => sum + p.amount, 0);
        
        this._state.out_total = this._players
            .filter(p => p.amount < 0)
            .reduce((sum, p) => sum + Math.abs(p.amount), 0);
        
        // Vig is 15% of all "in" amounts (players who lost)
        this._state.vig = this._players.reduce((sum, p) => sum + p.vig, 0);
        
        this._state.result = this._state.in_total - this._state.out_total - this._state.vig;

        // Calculate carried in (from previous week)
        this._state.total_carried_in = this._players
            .filter(p => p.carried)
            .reduce((sum, p) => sum + p.carry_amount, 0);

        // Expected in = in_total + carried amounts
        this._state.expected_in = this._state.in_total + this._state.total_carried_in;

        // Calculate actual collected based on payment status
        this._state.actual_collected = this._players
            .filter(p => p.payment_status === 'paid' || p.payment_status === 'partial')
            .reduce((sum, p) => sum + p.paid_amount, 0);

        // Calculate total being carried out to next week
        this._state.total_carried_out = this._players
            .reduce((sum, p) => sum + p.carryForward, 0);
    }

    addPlayer(name: string, account_number: number): PlayerWeek {
        const player = new PlayerWeek(name, account_number);
        this._players.push(player);
        this.touch();
        return player;
    }

    removePlayer(id: string): boolean {
        const index = this._players.findIndex(p => p.id === id);
        if (index !== -1) {
            this._players.splice(index, 1);
            this.calculateTotals();
            this.touch();
            return true;
        }
        return false;
    }

    getPlayer(id: string): PlayerWeek | undefined {
        return this._players.find(p => p.id === id);
    }

    getPlayerByAccount(account_number: number): PlayerWeek | undefined {
        return this._players.find(p => p.account_number === account_number);
    }

    activate() {
        this._state.status = 'active';
        this.touch();
    }

    deactivate() {
        this._state.status = 'closed';
        this.touch();
    }

    // Week lifecycle methods
    startClose() {
        this._state.status = 'pending_close';
        this.touch();
    }

    cancelClose() {
        this._state.status = 'active';
        // Reset all payment statuses to pending
        this._players.forEach(p => p.resetPaymentStatus());
        this.calculateTotals();
        this.touch();
    }

    finalizeClose() {
        this._state.status = 'closed';
        this._state.closed_date = new Date().toISOString();
        this.calculateTotals();
        this.touch();
    }

    // Mark all players as paid/settled (both in and out)
    markAllPaid() {
        this._players.forEach(p => {
            if (p.amount !== 0) {
                p.markPaid();
            }
        });
        this.calculateTotals();
        this.touch();
    }

    // Get data needed to create next week with carries
    getCarryForwardData(): { name: string; account_number: number; carry_amount: number }[] {
        return this._players
            .filter(p => p.carryForward !== 0)
            .map(p => ({
                name: p.name,
                account_number: p.account_number,
                carry_amount: p.carryForward
            }));
    }

    // Serialization
    toJSON(): WeekData {
        return {
            ...this._state,
            players: this._players.map(p => p.toJSON())
        };
    }

    static fromJSON(data: WeekData): Week {
        const week = new Week();
        week._state = {
            id: data.id,
            name: data.name,
            start: data.start,
            end: data.end,
            in_total: data.in_total,
            out_total: data.out_total,
            result: data.result,
            vig: data.vig,
            status: data.status || ((data as WeekData & { active?: boolean }).active ? 'active' : 'closed'),  // Migration from old format
            expected_in: data.expected_in || 0,
            actual_collected: data.actual_collected || 0,
            total_carried_in: data.total_carried_in || 0,
            total_carried_out: data.total_carried_out || 0,
            closed_date: data.closed_date || null,
            previous_week_id: data.previous_week_id || null,
            next_week_id: data.next_week_id || null,
            created: data.created,
            updated: data.updated
        };
        week._players = data.players.map(p => PlayerWeek.fromJSON(p));
        return week;
    }
}
