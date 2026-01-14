<script lang="ts">
	import { type PlayerWeek } from '$lib/models';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, Header, Title, Content, Footer } from '$lib/components/ui/card';

	interface Props {
		player?: PlayerWeek;
		onSave: (data: { name: string; account_number: number; amount: number; note: string; carried: boolean; carry_amount: number }) => void;
		onCancel: () => void;
	}

	let { player, onSave, onCancel }: Props = $props();

	let name = $state(player?.name ?? '');
	let account_number = $state(player?.account_number ?? 0);
	let amountType = $state<'in' | 'out'>(player ? (player.amount >= 0 ? 'in' : 'out') : 'in');
	let amountValue = $state(player ? Math.abs(player.amount) : 0);
	let note = $state(player?.note ?? '');
	let carried = $state(player?.carried ?? false);
	let carry_amount = $state(player?.carry_amount ?? 0);

	const handleSubmit = (e: Event) => {
		e.preventDefault();
		const amount = amountType === 'in' ? amountValue : -amountValue;
		onSave({
			name,
			account_number,
			amount,
			note,
			carried,
			carry_amount
		});
	};

	const isEditing = $derived(!!player);
</script>

<Card class="w-full max-w-md">
	<Header>
		<Title class="text-xl font-bold">{isEditing ? 'Edit Player' : 'Add Player'}</Title>
	</Header>
	<form onsubmit={handleSubmit}>
		<Content class="space-y-4 p-4">
			<div>
				<label for="player-name" class="text-sm font-medium">Player Name</label>
				<Input
					id="player-name"
					type="text"
					placeholder="e.g., John Doe"
					bind:value={name}
					class="mt-1"
					required
				/>
			</div>
			<div>
				<label for="player-account" class="text-sm font-medium">Account Number</label>
				<Input
					id="player-account"
					type="number"
					placeholder="e.g., 12345"
					bind:value={account_number}
					class="mt-1"
					required
				/>
			</div>
			<div>
				<label class="text-sm font-medium">Amount</label>
				<div class="mt-1 flex gap-2">
					<div class="flex rounded-lg border">
						<button
							type="button"
							class="px-3 py-2 text-sm font-medium transition-colors {amountType === 'in' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-50'}"
							onclick={() => (amountType = 'in')}
							title="Player lost - money coming in to you"
						>
							In (+)
						</button>
						<button
							type="button"
							class="px-3 py-2 text-sm font-medium transition-colors {amountType === 'out' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-50'}"
							onclick={() => (amountType = 'out')}
							title="Player won - money going out from you"
						>
							Out (-)
						</button>
					</div>
					<Input
						type="number"
						step="0.01"
						min="0"
						placeholder="0.00"
						bind:value={amountValue}
						class="flex-1"
					/>
				</div>
			</div>
			<div>
				<label class="flex items-center gap-2">
					<input
						type="checkbox"
						bind:checked={carried}
						class="h-4 w-4 rounded border-gray-300"
					/>
					<span class="text-sm font-medium">Carry from previous week</span>
				</label>
				{#if carried}
					<div class="mt-2">
						<Input
							type="number"
							step="0.01"
							placeholder="Carry amount"
							bind:value={carry_amount}
						/>
					</div>
				{/if}
			</div>
			<div>
				<label for="player-note" class="text-sm font-medium">Note (optional)</label>
				<Input
					id="player-note"
					type="text"
					placeholder="Any notes..."
					bind:value={note}
					class="mt-1"
				/>
			</div>
		</Content>
		<Footer class="flex justify-end gap-2 p-4">
			<Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
			<Button type="submit">{isEditing ? 'Update' : 'Add'}</Button>
		</Footer>
	</form>
</Card>
