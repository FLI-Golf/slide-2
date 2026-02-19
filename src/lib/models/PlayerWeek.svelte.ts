import { generateId } from '$lib/commands.svelte';

export type PaymentStatus = 'pending' | 'paid' | 'unpaid' | 'partial';

export interface PlayerWeekData {
    id: string;
    name: string;
    account_number: number;
    amount: number;
    carried: boolean;
    carry_amount: number;
    carry_from_week_id: string | null;
    // Accumulated carry balance from the Player roster at the time this week was active
    prior_carry_balance: number;
    result: number;
    payment_status: PaymentStatus;
    paid_amount: number;
    paid_date: string | null;
    note: string;
    created: string;
    updated: string;
}

export class PlayerWeek {
    private _state = $state<PlayerWeekData>({
        id: '',
        name: '',
        account_number: 0,
        amount: 0,
        carried: false,
        carry_amount: 0,
        carry_from_week_id: null,
        prior_carry_balance: 0,
        result: 0,
        payment_status: 'pending',
        paid_amount: 0,
        paid_date: null,
        note: '',
        created: new Date().toISOString(),
        updated: new Date().toISOString()
    });

    constructor(name: string = '', account_number: number = 0) {
        this._state.id = generateId();
        this._state.name = name;
        this._state.account_number = account_number;
        this._state.created = new Date().toISOString();
        this._state.updated = new Date().toISOString();
    }

    // Getters
    get id() { return this._state.id; }
    get name() { return this._state.name; }
    get account_number() { return this._state.account_number; }
    get amount() { return this._state.amount; }
    get carried() { return this._state.carried; }
    get carry_amount() { return this._state.carry_amount; }
    get carry_from_week_id() { return this._state.carry_from_week_id; }
    get prior_carry_balance() { return this._state.prior_carry_balance; }
    get result() { return this._state.result; }
    get payment_status() { return this._state.payment_status; }
    get paid_amount() { return this._state.paid_amount; }
    get paid_date() { return this._state.paid_date; }
    get note() { return this._state.note; }
    get created() { return this._state.created; }
    get updated() { return this._state.updated; }

    // Setters with auto-update timestamp
    set name(value: string) {
        this._state.name = value;
        this.touch();
    }

    set account_number(value: number) {
        this._state.account_number = value;
        this.touch();
    }

    set amount(value: number) {
        this._state.amount = value;
        this.calculateResult();
        this.touch();
    }

    set carried(value: boolean) {
        this._state.carried = value;
        this.calculateResult();
        this.touch();
    }

    set carry_amount(value: number) {
        this._state.carry_amount = value;
        this.calculateResult();
        this.touch();
    }

    set prior_carry_balance(value: number) {
        this._state.prior_carry_balance = value;
        this.touch();
    }

    set note(value: string) {
        this._state.note = value;
        this.touch();
    }

    // Computed properties
    get isIn() { return this._state.amount > 0; }
    get isOut() { return this._state.amount < 0; }
    get absoluteAmount() { return Math.abs(this._state.amount); }
    
    // Vig shown in the week totals — excluded for carried players
    get vig() { return (this._state.amount > 0 && !this._state.carried) ? this._state.amount * 0.15 : 0; }
    
    // Player's result from their perspective (inverted)
    get playerResult() { return -this._state.result; }

    /**
     * Total owed to collect from this player at week close.
     * This is just the amount + any prior carry. Vig is handled at the week level.
     */
    get totalOwed() {
        const carry = this._state.carried ? this._state.carry_amount : 0;
        return Math.max(0, this._state.amount + carry);
    }

    // Full accumulated balance: this week's owed + prior accumulated carry from roster
    get accumulatedOwed() {
        const thisWeek = this._state.amount > 0 ? this._state.amount : 0;
        return thisWeek + this._state.prior_carry_balance;
    }

    // Outstanding balance (what's still owed after payment)
    get outstandingBalance() {
        if (this._state.payment_status === 'paid') return 0;
        if (this._state.payment_status === 'unpaid') return this.totalOwed;
        if (this._state.payment_status === 'partial') return this.totalOwed - this._state.paid_amount;
        return this.totalOwed; // pending
    }

    /**
     * Amount to carry forward to next week.
     * Vig is only added when the player is carried (their vig was excluded from
     * week totals). Regular unpaid players already had vig in the week totals.
     */
    get carryForward() {
        if (this._state.payment_status === 'paid' || this._state.payment_status === 'pending') return 0;

        const owed = this.totalOwed;
        if (owed <= 0) return 0;

        if (this._state.payment_status === 'partial') {
            return Math.max(0, owed - this._state.paid_amount);
        }

        // unpaid — full amount carries forward
        return owed;
    }

    // Methods
    private touch() {
        this._state.updated = new Date().toISOString();
    }

    private calculateResult() {
        // Result is only this week's win/loss — carry is tracked separately
        this._state.result = this._state.amount;
    }

    setIn(amount: number) {
        this.amount = Math.abs(amount);
    }

    setOut(amount: number) {
        this.amount = -Math.abs(amount);
    }

    carryOver(amount: number, fromWeekId: string | null = null) {
        this._state.carried = true;
        this._state.carry_amount = amount;
        this._state.carry_from_week_id = fromWeekId;
        this.calculateResult();
        this.touch();
    }

    clearCarry() {
        this._state.carried = false;
        this._state.carry_amount = 0;
        this._state.carry_from_week_id = null;
        this.calculateResult();
        this.touch();
    }

    // Payment methods
    markPaid(amount?: number) {
        this._state.payment_status = 'paid';
        this._state.paid_amount = amount ?? this.totalOwed;
        this._state.paid_date = new Date().toISOString();
        this.touch();
    }

    markUnpaid() {
        this._state.payment_status = 'unpaid';
        this._state.paid_amount = 0;
        this._state.paid_date = null;
        this.touch();
    }

    markPartial(paidAmount: number) {
        this._state.payment_status = 'partial';
        this._state.paid_amount = paidAmount;
        this._state.paid_date = new Date().toISOString();
        this.touch();
    }

    resetPaymentStatus() {
        this._state.payment_status = 'pending';
        this._state.paid_amount = 0;
        this._state.paid_date = null;
        this.touch();
    }

    // Serialization
    toJSON(): PlayerWeekData {
        return { ...this._state };
    }

    static fromJSON(data: PlayerWeekData): PlayerWeek {
        const player = new PlayerWeek();
        player._state = {
            ...data,
            payment_status: data.payment_status || 'pending',
            paid_amount: data.paid_amount || 0,
            paid_date: data.paid_date || null,
            carry_from_week_id: data.carry_from_week_id || null,
            prior_carry_balance: data.prior_carry_balance || 0
        };
        return player;
    }
}
