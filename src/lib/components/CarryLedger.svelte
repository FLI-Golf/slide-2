<script lang="ts">
	import { appStore, type Player } from '$lib/models';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, Header, Title, Content } from '$lib/components/ui/card';

	// Payment form state per player
	let paymentForms = $state<Record<string, { amount: number; note: string; expanded: boolean }>>({});
	let expandedPlayer = $state<string | null>(null);

	const playersWithCarry = $derived(
		appStore.players
			.filter(p => p.hasCarry)
			.sort((a, b) => b.carry_balance - a.carry_balance)
	);

	const allPlayers = $derived(
		appStore.players.sort((a, b) => a.account_number - b.account_number)
	);

	const totalOutstanding = $derived(appStore.totalOutstandingCarry);

	const toggleExpand = (playerId: string) => {
		if (expandedPlayer === playerId) {
			expandedPlayer = null;
		} else {
			expandedPlayer = playerId;
			if (!paymentForms[playerId]) {
				paymentForms[playerId] = { amount: 0, note: '', expanded: true };
			}
		}
	};

	const handlePayment = (player: Player) => {
		const form = paymentForms[player.id];
		if (!form || form.amount <= 0) return;
		appStore.recordCarryPayment(player.account_number, form.amount, form.note);
		paymentForms[player.id] = { amount: 0, note: '', expanded: true };
	};

	const handlePayAll = (player: Player) => {
		appStore.payOffAllCarry(player.account_number, 'Paid in full');
		expandedPlayer = null;
	};

	const handleUndoPayment = (player: Player, paymentId: string) => {
		appStore.undoCarryPayment(player.account_number, paymentId);
	};

	const formatDate = (iso: string) => {
		return new Date(iso).toLocaleDateString();
	};

	const getBreakdown = (player: Player) => {
		return appStore.getPlayerCarryBreakdown(player.account_number);
	};
</script>

<div class="space-y-4">
	<!-- Summary Card -->
	<Card class="w-full">
		<Header>
			<Title class="text-xl font-bold">Outstanding Balances</Title>
			<p class="text-sm text-gray-500">
				{playersWithCarry.length} player{playersWithCarry.length !== 1 ? 's' : ''} with outstanding carry
			</p>
		</Header>
		<Content class="p-4">
			<div class="grid grid-cols-3 gap-4 text-center">
				<div class="rounded-lg bg-red-50 p-3">
					<p class="text-sm text-gray-600">Total Outstanding</p>
					<p class="text-2xl font-bold text-red-600">${totalOutstanding.toFixed(2)}</p>
				</div>
				<div class="rounded-lg bg-blue-50 p-3">
					<p class="text-sm text-gray-600">Players Carrying</p>
					<p class="text-2xl font-bold text-blue-600">{playersWithCarry.length}</p>
				</div>
				<div class="rounded-lg bg-green-50 p-3">
					<p class="text-sm text-gray-600">Total Roster</p>
					<p class="text-2xl font-bold text-green-600">{allPlayers.length}</p>
				</div>
			</div>
		</Content>
	</Card>

	<!-- Player Balances -->
	{#if playersWithCarry.length === 0}
		<Card class="w-full">
			<Content class="p-8 text-center">
				<p class="text-gray-500">No outstanding balances. All players are settled.</p>
			</Content>
		</Card>
	{:else}
		<Card class="w-full">
			<Header>
				<Title class="text-lg font-bold">Player Balances</Title>
			</Header>
			<Content class="p-4">
				<div class="space-y-3">
					{#each playersWithCarry as player (player.id)}
						{@const breakdown = getBreakdown(player)}
						{@const isExpanded = expandedPlayer === player.id}
						<div class="rounded-lg border {player.carry_balance > 0 ? 'border-red-200 bg-red-50/50' : 'border-gray-200'}">
							<!-- Player Row -->
							<button
								class="flex w-full items-center justify-between p-3 text-left hover:bg-gray-50/50"
								onclick={() => toggleExpand(player.id)}
							>
								<div class="flex items-center gap-3">
									<span class="font-medium">{player.name}</span>
									<span class="text-sm text-gray-500">#{player.account_number}</span>
								</div>
								<div class="flex items-center gap-3">
									<span class="text-lg font-bold text-red-600">
										${player.carry_balance.toFixed(2)}
									</span>
									<span class="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
								</div>
							</button>

							<!-- Expanded Detail -->
							{#if isExpanded}
								<div class="border-t p-3 space-y-3">
									<!-- Week Breakdown -->
									{#if breakdown.length > 0}
										<div>
											<p class="text-sm font-medium text-gray-600 mb-1">Carry by Week</p>
											<div class="space-y-1">
												{#each breakdown as entry}
													<div class="flex justify-between text-sm">
														<span class="text-gray-600">{entry.weekName}</span>
														<span class="text-red-600">${entry.amount.toFixed(2)}</span>
													</div>
												{/each}
											</div>
										</div>
									{/if}

									<!-- Payment History -->
									{#if player.carry_payments.length > 0}
										<div>
											<p class="text-sm font-medium text-gray-600 mb-1">Payment History</p>
											<div class="space-y-1">
												{#each player.carry_payments as payment (payment.id)}
													<div class="flex items-center justify-between text-sm">
														<div>
															<span class="text-green-600">-${payment.amount.toFixed(2)}</span>
															<span class="text-gray-400 ml-2">{formatDate(payment.date)}</span>
															{#if payment.note}
																<span class="text-gray-500 ml-1">({payment.note})</span>
															{/if}
														</div>
														<Button
															variant="ghost"
															size="sm"
															class="h-6 px-1 text-xs text-red-500 hover:bg-red-50"
															onclick={() => handleUndoPayment(player, payment.id)}
														>
															Undo
														</Button>
													</div>
												{/each}
											</div>
										</div>
									{/if}

									<!-- Payment Form -->
									<div class="border-t pt-3">
										<p class="text-sm font-medium text-gray-600 mb-2">Record Payment</p>
										<div class="flex gap-2">
											<Input
												type="number"
												step="0.01"
												min="0"
												max={player.carry_balance}
												placeholder="Amount"
												class="h-8 w-28 text-sm"
												value={paymentForms[player.id]?.amount || ''}
												onchange={(e) => {
													if (!paymentForms[player.id]) paymentForms[player.id] = { amount: 0, note: '', expanded: true };
													paymentForms[player.id].amount = parseFloat((e.target as HTMLInputElement).value) || 0;
												}}
											/>
											<Input
												type="text"
												placeholder="Note (optional)"
												class="h-8 flex-1 text-sm"
												value={paymentForms[player.id]?.note || ''}
												onchange={(e) => {
													if (!paymentForms[player.id]) paymentForms[player.id] = { amount: 0, note: '', expanded: true };
													paymentForms[player.id].note = (e.target as HTMLInputElement).value;
												}}
											/>
											<Button
												size="sm"
												class="h-8 bg-green-600 hover:bg-green-700"
												onclick={() => handlePayment(player)}
											>
												Pay
											</Button>
											<Button
												size="sm"
												variant="outline"
												class="h-8 text-green-600 hover:bg-green-50"
												onclick={() => handlePayAll(player)}
											>
												Pay All
											</Button>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</Content>
		</Card>
	{/if}
</div>
