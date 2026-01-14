import { generateId } from '$lib/commands.svelte';

export interface PlayerData {
    id: string;
    name: string;
    account_number: number;
    created: string;
}

export class Player {
    private _state = $state<PlayerData>({
        id: '',
        name: '',
        account_number: 0,
        created: new Date().toISOString()
    });

    constructor(name: string = '', account_number: number = 0) {
        this._state.id = generateId();
        this._state.name = name;
        this._state.account_number = account_number;
        this._state.created = new Date().toISOString();
    }

    // Getters
    get id() { return this._state.id; }
    get name() { return this._state.name; }
    get account_number() { return this._state.account_number; }
    get created() { return this._state.created; }

    // Setters
    set name(value: string) {
        this._state.name = value;
    }

    set account_number(value: number) {
        this._state.account_number = value;
    }

    // Serialization
    toJSON(): PlayerData {
        return { ...this._state };
    }

    static fromJSON(data: PlayerData): Player {
        const player = new Player();
        player._state = { ...data };
        return player;
    }
}
