<script lang="ts">
	import { type PlayerWeek, appStore } from '$lib/models';
	import { Button } from '$lib/components/ui/button';
	import { Card, Header, Title, Content } from '$lib/components/ui/card';

	interface Props {
		players: PlayerWeek[];
		onAddPlayer: () => void;
		onEditPlayer: (id: string) => void;
		onDeletePlayer: (id: string) => void;
	}

	let { players, onAddPlayer, onEditPlayer, onDeletePlayer }: Props = $props();

	type SortField = 'account_number' | 'name' | 'amount' | 'vig' | 'carry_in' | 'total_owed' | 'balance' | 'result';
	type SortDirection = 'asc' | 'desc';

	// Column definitions
	const allColumns = [
		{ key: 'account_number' as SortField, label: 'Acct #', align: 'left', defaultVisible: true },
		{ key: 'name' as SortField, label: 'Name', align: 'left', defaultVisible: true },
		{ key: 'amount' as SortField, label: 'Amount', align: 'right', defaultVisible: true },
		{ key: 'vig' as SortField, label: 'Vig (15%)', align: 'right', defaultVisible: true },
		{ key: 'carry_in' as SortField, label: 'Carry In', align: 'right', defaultVisible: true },
		{ key: 'total_owed' as SortField, label: 'Total Owed', align: 'right', defaultVisible: true },
		{ key: 'balance' as SortField, label: 'Balance', align: 'right', defaultVisible: false },
		{ key: 'result' as SortField, label: 'Result', align: 'right', defaultVisible: true },
	] as const;

	// Load saved column visibility from localStorage
	const COLUMNS_KEY = 'slide_player_columns';
	const loadVisibility = (): Record<string, boolean> => {
		try {
			const saved = localStorage.getItem(COLUMNS_KEY);
			if (saved) return JSON.parse(saved);
		} catch {}
		return Object.fromEntries(allColumns.map(c => [c.key, c.defaultVisible]));
	};

	let columnVisibility = $state<Record<string, boolean>>(loadVisibility());
	let showColumnMenu = $state(false);

	const toggleColumn = (key: string) => {
		columnVisibility[key] = !columnVisibility[key];
		localStorage.setItem(COLUMNS_KEY, JSON.stringify(columnVisibility));
	};

	const visibleColumns = $derived(allColumns.filter(c => columnVisibility[c.key]));

	const getPlayerCarryBalance = (accountNumber: number): number => {
		const rosterPlayer = appStore.getPlayerByAccount(accountNumber);
		return rosterPlayer?.carry_balance ?? 0;
	};

	let sortField = $state<SortField>('account_number');
	let sortDirection = $state<SortDirection>('asc');

	const toggleSort = (field: SortField) => {
		if (sortField === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDirection = 'asc';
		}
	};

	const sortedPlayers = $derived([...players].sort((a, b) => {
		let aVal: string | number;
		let bVal: string | number;

		switch (sortField) {
			case 'name':
				aVal = a.name.toLowerCase();
				bVal = b.name.toLowerCase();
				break;
			case 'account_number':
				aVal = a.account_number;
				bVal = b.account_number;
				break;
			case 'amount':
				aVal = a.amount;
				bVal = b.amount;
				break;
			case 'vig':
				aVal = a.vig;
				bVal = b.vig;
				break;
			case 'carry_in':
				aVal = a.carried ? a.carry_amount : 0;
				bVal = b.carried ? b.carry_amount : 0;
				break;
			case 'total_owed':
				aVal = a.totalOwed;
				bVal = b.totalOwed;
				break;
			case 'balance':
				aVal = a.carried ? a.totalOwed : getPlayerCarryBalance(a.account_number);
				bVal = b.carried ? b.totalOwed : getPlayerCarryBalance(b.account_number);
				break;
			case 'result':
				aVal = a.playerResult;
				bVal = b.playerResult;
				break;
			default:
				aVal = a.account_number;
				bVal = b.account_number;
		}

		if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
		if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
		return 0;
	}));

	const getSortIndicator = (field: SortField) => {
		if (sortField !== field) return '';
		return sortDirection === 'asc' ? ' ↑' : ' ↓';
	};
</script>

<Card class="w-full">
	<Header class="flex flex-row items-center justify-between">
		<Title class="text-xl font-bold">Players ({players.length})</Title>
		<div class="flex items-center gap-2">
			<!-- Column toggle -->
			<div class="relative">
				<Button variant="outline" size="sm" onclick={() => showColumnMenu = !showColumnMenu}>
					Columns
				</Button>
				{#if showColumnMenu}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="fixed inset-0 z-10" onclick={() => showColumnMenu = false}></div>
					<div class="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border bg-white p-2 shadow-lg">
						<p class="mb-1 text-xs font-medium text-gray-500">Show/Hide Columns</p>
						{#each allColumns as col}
							<label class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50">
								<input
									type="checkbox"
									checked={columnVisibility[col.key]}
									onchange={() => toggleColumn(col.key)}
									class="rounded"
								/>
								{col.label}
							</label>
						{/each}
					</div>
				{/if}
			</div>
			<Button onclick={onAddPlayer} size="sm">+ Add Player</Button>
		</div>
	</Header>
	<Content class="p-4">
		{#if players.length === 0}
			<p class="text-center text-gray-500">No players yet. Add one to get started.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b text-left text-sm text-gray-600">
							{#each visibleColumns as col}
								<th class="pb-2 {col.align === 'right' ? 'text-right' : ''} font-medium">
									<button onclick={() => toggleSort(col.key)} class="hover:text-indigo-600">
										{col.label}{getSortIndicator(col.key)}
									</button>
								</th>
							{/each}
							<th class="pb-2 text-right font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each sortedPlayers as player (player.id)}
							{@const rosterBalance = getPlayerCarryBalance(player.account_number)}
							<tr class="border-b last:border-0 {player.carried ? 'bg-orange-50/50' : ''}">
								{#each visibleColumns as col}
									{#if col.key === 'account_number'}
										<td class="py-3 text-gray-600">{player.account_number}</td>
									{:else if col.key === 'name'}
										<td class="py-3">
											<div class="flex items-center gap-1.5">
												<span class="font-medium">{player.name}</span>
												{#if player.carried}
													<span class="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">CARRY</span>
												{/if}
											</div>
											{#if player.carried}
												<p class="text-xs text-orange-600">Carrying from prev week — excluded from In/Vig/Result</p>
											{/if}
											{#if player.note}
												<p class="text-xs text-gray-500">{player.note}</p>
											{/if}
										</td>
									{:else if col.key === 'amount'}
										<td class="py-3 text-right">
											<span class={player.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
												{player.amount >= 0 ? '+' : ''}{player.amount}
											</span>
										</td>
									{:else if col.key === 'vig'}
										<td class="py-3 text-right">
											{#if player.vig > 0}
												<span class="text-yellow-600">{player.vig.toFixed(2)}</span>
											{:else}
												<span class="text-gray-400">-</span>
											{/if}
										</td>
									{:else if col.key === 'carry_in'}
										<td class="py-3 text-right">
											{#if player.carried}
												<span class="text-orange-600 font-medium">${player.carry_amount.toFixed(2)}</span>
											{:else}
												<span class="text-gray-400">-</span>
											{/if}
										</td>
									{:else if col.key === 'total_owed'}
										<td class="py-3 text-right">
											{#if player.totalOwed > 0}
												<span class="font-medium text-red-600">${player.totalOwed.toFixed(2)}</span>
											{:else if player.amount < 0}
												<span class="font-medium text-green-600">-${Math.abs(player.amount).toFixed(2)}</span>
											{:else}
												<span class="text-gray-400">-</span>
											{/if}
										</td>
									{:else if col.key === 'balance'}
										<td class="py-3 text-right">
											{#if player.carried}
												<span class="rounded bg-orange-50 px-1.5 py-0.5 text-xs font-medium text-orange-600">
													${player.totalOwed.toFixed(2)}
												</span>
											{:else if rosterBalance > 0}
												<span class="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-600">
													${rosterBalance.toFixed(2)}
												</span>
											{:else}
												<span class="text-gray-400">-</span>
											{/if}
										</td>
									{:else if col.key === 'result'}
										<td class="py-3 text-right font-medium {player.playerResult >= 0 ? 'text-green-600' : 'text-red-600'}">
											{player.playerResult >= 0 ? '+' : ''}{player.playerResult}
										</td>
									{/if}
								{/each}
								<td class="py-3 text-right">
									<div class="flex justify-end gap-1">
										<Button
											variant="ghost"
											size="sm"
											onclick={() => onEditPlayer(player.id)}
											class="h-8 px-2"
										>
											Edit
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onclick={() => onDeletePlayer(player.id)}
											class="h-8 px-2 text-red-600 hover:bg-red-50"
										>
											Delete
										</Button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Content>
</Card>
