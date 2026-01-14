<script lang="ts">
	import { type Week, appStore } from '$lib/models';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, Header, Title, Content, Footer } from '$lib/components/ui/card';

	interface Props {
		week: Week;
		onCancel: () => void;
		onFinalize: () => void;
	}

	let { week, onCancel, onFinalize }: Props = $props();

	// Sort players by account number
	const sortedPlayers = $derived([...week.players].sort((a, b) => a.account_number - b.account_number));

	// Track partial payment amounts
	let partialAmounts = $state<Record<string, number>>({});

	const handleMarkPaid = (playerId: string) => {
		const player = week.getPlayer(playerId);
		if (player) {
			player.markPaid();
			week.calculateTotals();
			appStore.save();
		}
	};

	const handleMarkUnpaid = (playerId: string) => {
		const player = week.getPlayer(playerId);
		if (player) {
			player.markUnpaid();
			week.calculateTotals();
			appStore.save();
		}
	};

	const handleMarkPartial = (playerId: string) => {
		const player = week.getPlayer(playerId);
		const amount = partialAmounts[playerId] || 0;
		if (player && amount > 0) {
			player.markPartial(amount);
			week.calculateTotals();
			appStore.save();
		}
	};

	const handleMarkAllPaid = () => {
		week.markAllPaid();
		appStore.save();
	};

	const handleCancelClose = () => {
		week.cancelClose();
		appStore.save();
		onCancel();
	};

	const handleFinalizeClose = () => {
		week.finalizeClose();
		appStore.save();
		onFinalize();
	};

	// Check if all players have been reviewed (no pending)
	const allReviewed = $derived(week.playersPending.length === 0);

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'paid': return 'bg-green-100 text-green-700';
			case 'unpaid': return 'bg-red-100 text-red-700';
			case 'partial': return 'bg-yellow-100 text-yellow-700';
			default: return 'bg-gray-100 text-gray-700';
		}
	};
</script>

<div class="space-y-4">
	<Card class="w-full">
		<Header>
			<Title class="text-xl font-bold">Close Week: {week.name}</Title>
			<p class="text-sm text-gray-500">Review each player's payment status before closing</p>
		</Header>
		<Content class="p-4">
			<!-- Summary Stats -->
			<div class="mb-6 grid grid-cols-4 gap-4 text-center">
				<div class="rounded-lg bg-blue-50 p-3">
					<p class="text-sm text-gray-600">Expected</p>
					<p class="text-xl font-bold text-blue-600">${week.expected_in.toFixed(2)}</p>
				</div>
				<div class="rounded-lg bg-green-50 p-3">
					<p class="text-sm text-gray-600">Collected</p>
					<p class="text-xl font-bold text-green-600">${week.actual_collected.toFixed(2)}</p>
				</div>
				<div class="rounded-lg bg-red-50 p-3">
					<p class="text-sm text-gray-600">Uncollected</p>
					<p class="text-xl font-bold text-red-600">${week.uncollected.toFixed(2)}</p>
				</div>
				<div class="rounded-lg bg-yellow-50 p-3">
					<p class="text-sm text-gray-600">Carry Forward</p>
					<p class="text-xl font-bold text-yellow-600">${week.total_carried_out.toFixed(2)}</p>
				</div>
			</div>

			<!-- Progress -->
			<div class="mb-4">
				<div class="flex justify-between text-sm">
					<span>Review Progress</span>
					<span>{week.players.length - week.playersPending.length} / {week.players.length} reviewed</span>
				</div>
				<div class="mt-1 h-2 w-full rounded-full bg-gray-200">
					<div 
						class="h-2 rounded-full bg-indigo-500 transition-all"
						style="width: {((week.players.length - week.playersPending.length) / week.players.length) * 100}%"
					></div>
				</div>
			</div>

			<!-- Quick Actions -->
			<div class="mb-4 flex gap-2">
				<Button variant="outline" size="sm" onclick={handleMarkAllPaid}>
					Mark All Paid
				</Button>
			</div>

			<!-- Player List -->
			{#if sortedPlayers.length === 0}
				<p class="text-center text-gray-500">No players in this week</p>
			{:else}
				<div class="space-y-3">
					{#each sortedPlayers as player (player.id)}
						{@const isOwed = player.totalOwed > 0}
						<div class="rounded-lg border p-3 {player.payment_status === 'pending' ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}">
							<div class="flex items-start justify-between">
								<div>
									<div class="flex items-center gap-2">
										<span class="font-medium">{player.name}</span>
										<span class="text-sm text-gray-500">#{player.account_number}</span>
										<span class="rounded px-2 py-0.5 text-xs font-medium {getStatusBadge(player.payment_status)}">
											{player.payment_status}
										</span>
									</div>
									<div class="mt-1 text-sm text-gray-600">
										{#if player.carried}
											<span class="text-yellow-600">Carry: ${player.carry_amount.toFixed(2)}</span> + 
										{/if}
										<span class={player.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
											Amount: {player.amount >= 0 ? '+' : ''}${player.amount.toFixed(2)}
										</span>
										<span class="mx-2">→</span>
										<span class="font-medium">Total Owed: ${player.totalOwed.toFixed(2)}</span>
									</div>
									{#if player.payment_status === 'partial'}
										<p class="text-sm text-yellow-600">
											Paid: ${player.paid_amount.toFixed(2)} | Remaining: ${player.carryForward.toFixed(2)}
										</p>
									{/if}
								</div>

								{#if isOwed && player.payment_status === 'pending'}
									<div class="flex flex-col gap-2">
										<div class="flex gap-1">
											<Button size="sm" onclick={() => handleMarkPaid(player.id)} class="bg-green-600 hover:bg-green-700">
												Paid
											</Button>
											<Button size="sm" variant="outline" onclick={() => handleMarkUnpaid(player.id)} class="text-red-600 hover:bg-red-50">
												Unpaid
											</Button>
										</div>
										<div class="flex gap-1">
											<Input
												type="number"
												step="0.01"
												min="0"
												max={player.totalOwed}
												placeholder="Partial $"
												class="h-8 w-24 text-sm"
												onchange={(e) => partialAmounts[player.id] = parseFloat((e.target as HTMLInputElement).value) || 0}
											/>
											<Button size="sm" variant="outline" onclick={() => handleMarkPartial(player.id)} class="text-yellow-600 hover:bg-yellow-50">
												Partial
											</Button>
										</div>
									</div>
								{:else if isOwed}
									<Button size="sm" variant="ghost" onclick={() => {
										const p = week.getPlayer(player.id);
										if (p) {
											p.resetPaymentStatus();
											week.calculateTotals();
											appStore.save();
										}
									}}>
										Reset
									</Button>
								{:else}
									<span class="text-sm text-gray-400">No payment needed</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Content>
		<Footer class="flex justify-between p-4">
			<Button variant="outline" onclick={handleCancelClose}>
				Cancel & Return to Active
			</Button>
			<Button 
				onclick={handleFinalizeClose}
				disabled={!allReviewed}
				class={allReviewed ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
			>
				{#if allReviewed}
					Finalize & Close Week
				{:else}
					Review All Players First ({week.playersPending.length} remaining)
				{/if}
			</Button>
		</Footer>
	</Card>
</div>
