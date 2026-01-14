<script lang="ts">
	import { type PlayerWeek } from '$lib/models';
	import { Button } from '$lib/components/ui/button';
	import { Card, Header, Title, Content } from '$lib/components/ui/card';

	interface Props {
		players: PlayerWeek[];
		onAddPlayer: () => void;
		onEditPlayer: (id: string) => void;
		onDeletePlayer: (id: string) => void;
	}

	let { players, onAddPlayer, onEditPlayer, onDeletePlayer }: Props = $props();

	type SortField = 'name' | 'account_number' | 'amount' | 'vig' | 'carry_amount' | 'result';
	type SortDirection = 'asc' | 'desc';

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
			case 'carry_amount':
				aVal = a.carried ? a.carry_amount : 0;
				bVal = b.carried ? b.carry_amount : 0;
				break;
			case 'result':
				aVal = -a.result; // Player perspective
				bVal = -b.result;
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
		<Button onclick={onAddPlayer} size="sm">+ Add Player</Button>
	</Header>
	<Content class="p-4">
		{#if players.length === 0}
			<p class="text-center text-gray-500">No players yet. Add one to get started.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b text-left text-sm text-gray-600">
							<th class="pb-2 font-medium">
								<button onclick={() => toggleSort('name')} class="hover:text-indigo-600">
									Name{getSortIndicator('name')}
								</button>
							</th>
							<th class="pb-2 font-medium">
								<button onclick={() => toggleSort('account_number')} class="hover:text-indigo-600">
									Account #{getSortIndicator('account_number')}
								</button>
							</th>
							<th class="pb-2 text-right font-medium">
								<button onclick={() => toggleSort('amount')} class="hover:text-indigo-600">
									Amount{getSortIndicator('amount')}
								</button>
							</th>
							<th class="pb-2 text-right font-medium">
								<button onclick={() => toggleSort('vig')} class="hover:text-indigo-600">
									Vig (15%){getSortIndicator('vig')}
								</button>
							</th>
							<th class="pb-2 text-right font-medium">
								<button onclick={() => toggleSort('carry_amount')} class="hover:text-indigo-600">
									Carry{getSortIndicator('carry_amount')}
								</button>
							</th>
							<th class="pb-2 text-right font-medium">
								<button onclick={() => toggleSort('result')} class="hover:text-indigo-600">
									Result{getSortIndicator('result')}
								</button>
							</th>
							<th class="pb-2 text-right font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each sortedPlayers as player (player.id)}
							<tr class="border-b last:border-0">
								<td class="py-3">
									<span class="font-medium">{player.name}</span>
									{#if player.note}
										<p class="text-xs text-gray-500">{player.note}</p>
									{/if}
								</td>
								<td class="py-3 text-gray-600">{player.account_number}</td>
								<td class="py-3 text-right">
									<span class={player.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
										{player.amount >= 0 ? '+' : ''}{player.amount}
									</span>
								</td>
								<td class="py-3 text-right">
									{#if player.vig > 0}
										<span class="text-yellow-600">{player.vig.toFixed(2)}</span>
									{:else}
										<span class="text-gray-400">-</span>
									{/if}
								</td>
								<td class="py-3 text-right">
									{#if player.carried}
										<span class="text-yellow-600">{player.carry_amount}</span>
									{:else}
										<span class="text-gray-400">-</span>
									{/if}
								</td>
								<td class="py-3 text-right font-medium {-player.result >= 0 ? 'text-green-600' : 'text-red-600'}" title="Player's perspective">
									{-player.result >= 0 ? '+' : ''}{-player.result}
								</td>
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
