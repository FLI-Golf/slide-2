<script lang="ts">
	import { appStore, type Player } from '$lib/models';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, Header, Title, Content } from '$lib/components/ui/card';

	interface Props {
		onDragStart?: (player: Player) => void;
	}

	let { onDragStart }: Props = $props();

	let showAddForm = $state(false);
	let newName = $state('');
	let newAccount = $state(0);

	const handleAddPlayer = (e: Event) => {
		e.preventDefault();
		if (newName && newAccount) {
			appStore.addPlayer(newName, newAccount);
			newName = '';
			newAccount = 0;
			showAddForm = false;
		}
	};

	const handleDragStart = (e: DragEvent, player: Player) => {
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'copy';
			e.dataTransfer.setData('application/json', JSON.stringify({
				id: player.id,
				name: player.name,
				account_number: player.account_number
			}));
		}
		onDragStart?.(player);
	};
</script>

<Card class="w-full">
	<Header class="flex flex-row items-center justify-between">
		<Title class="text-lg font-bold">Player Roster</Title>
		<Button onclick={() => (showAddForm = !showAddForm)} size="sm" variant="outline">
			{showAddForm ? 'Cancel' : '+ Add'}
		</Button>
	</Header>
	<Content class="p-3">
		{#if showAddForm}
			<form onsubmit={handleAddPlayer} class="mb-3 space-y-2 rounded-lg border bg-gray-50 p-3">
				<Input
					type="text"
					placeholder="Player name"
					bind:value={newName}
					required
				/>
				<Input
					type="number"
					placeholder="Account number"
					bind:value={newAccount}
					required
				/>
				<Button type="submit" size="sm" class="w-full">Add to Roster</Button>
			</form>
		{/if}

		{#if appStore.players.length === 0}
			<p class="text-center text-sm text-gray-500">No players in roster. Add some to get started.</p>
		{:else}
			<div class="space-y-1">
				{#each appStore.players as player (player.id)}
					<div
						draggable="true"
						ondragstart={(e) => handleDragStart(e, player)}
						class="flex cursor-grab items-center justify-between rounded-lg border bg-white p-2 transition-all hover:border-indigo-300 hover:shadow-sm active:cursor-grabbing"
						role="listitem"
					>
						<div>
							<p class="font-medium text-sm">{player.name}</p>
							<p class="text-xs text-gray-500">#{player.account_number}</p>
						</div>
						<div class="flex items-center gap-1">
							<span class="text-gray-400 text-xs">drag to add</span>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => appStore.removePlayer(player.id)}
								class="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
							>
								×
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Content>
</Card>
