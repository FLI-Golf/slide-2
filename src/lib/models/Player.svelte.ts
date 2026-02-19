import { generateId } from '$lib/commands.svelte';

export interface CarryPayment {
    id: string;
    amount: number;
    date: string;
    note: string;
    // If paying off a specific week, reference it; null = lump sum against total
    week_id: string | null;
}

export interface PlayerData {
    id: string;
    name: string;
    account_number: number;
    carry_balance: number;          // Running total owed across all weeks
    carry_payments: CarryPayment[]; // History of payments against carry
    created: string;
}

export class Player {
    private _state = $state<PlayerData>({
        id: '',
        name: '',
        account_number: 0,
        carry_balance: 0,
        carry_payments: [],
        created: new Date().toISOString()
    });

    constructor(name: string = '', account_number: number = 0) {
        this._state.id = generateId();
        this._state.name = name;
        this._state.account_number = account_number;
        this._state.carry_balance = 0;
        this._state.carry_payments = [];
        this._state.created = new Date().toISOString();
    }

    // Getters
    get id() { return this._state.id; }
    get name() { return this._state.name; }
    get account_number() { return this._state.account_number; }
    get carry_balance() { return this._state.carry_balance; }
    get carry_payments() { return this._state.carry_payments; }
    get created() { return this._state.created; }

    get hasCarry() { return this._state.carry_balance > 0; }

    get totalPaid() {
        return this._state.carry_payments.reduce((sum, p) => sum + p.amount, 0);
    }

    // Setters
    set name(value: string) {
        this._state.name = value;
    }

    set account_number(value: number) {
        this._state.account_number = value;
    }

    // Carry management

    /** Add to carry balance (called when a week closes with unpaid amount) */
    addCarry(amount: number) {
        this._state.carry_balance += amount;
    }

    /** Remove from carry balance (called if a week is reopened) */
    removeCarry(amount: number) {
        this._state.carry_balance = Math.max(0, this._state.carry_balance - amount);
    }

    /** Record a payment against the carry balance */
    recordPayment(amount: number, note: string = '', weekId: string | null = null): CarryPayment {
        const payment: CarryPayment = {
            id: generateId(),
            amount,
            date: new Date().toISOString(),
            note,
            week_id: weekId
        };
        this._state.carry_payments.push(payment);
        this._state.carry_balance = Math.max(0, this._state.carry_balance - amount);
        return payment;
    }

    /** Pay off entire carry balance */
    payOffAll(note: string = ''): CarryPayment | null {
        if (this._state.carry_balance <= 0) return null;
        return this.recordPayment(this._state.carry_balance, note || 'Paid in full');
    }

    /** Remove a payment (undo) */
    removePayment(paymentId: string) {
        const idx = this._state.carry_payments.findIndex(p => p.id === paymentId);
        if (idx !== -1) {
            const payment = this._state.carry_payments[idx];
            this._state.carry_balance += payment.amount;
            this._state.carry_payments.splice(idx, 1);
        }
    }

    // Serialization
    toJSON(): PlayerData {
        return { ...this._state, carry_payments: [...this._state.carry_payments] };
    }

    static fromJSON(data: PlayerData): Player {
        const player = new Player();
        player._state = {
            ...data,
            carry_balance: data.carry_balance || 0,
            carry_payments: data.carry_payments || []
        };
        return player;
    }
}
