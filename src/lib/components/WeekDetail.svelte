<script lang="ts">
	import { type Week } from '$lib/models';
	import { appStore } from '$lib/models';
	import { Button } from '$lib/components/ui/button';
	import { Card, Header, Title, Content, Footer } from '$lib/components/ui/card';
	import PlayerList from './PlayerList.svelte';
	import PlayerForm from './PlayerForm.svelte';
	import PlayerRoster from './PlayerRoster.svelte';
	import PlayerDropZone from './PlayerDropZone.svelte';
	import WeekClose from './WeekClose.svelte';

	interface Props {
		week: Week;
		onBack: () => void;
		onEdit: () => void;
		onCreateNextWeek?: () => void;
	}

	let { week, onBack, onEdit, onCreateNextWeek }: Props = $props();

	let showAddPlayer = $state(false);
	let editingPlayerId = $state<string | null>(null);

	// Recalculate totals when component mounts or week changes
	$effect(() => {
		week.calculateTotals();
	});

	const formatDate = (iso: string) => {
		return new Date(iso).toLocaleDateString();
	};

	const handleAddPlayer = (data: { name: string; account_number: number; amount: number }) => {
		const player = week.addPlayer(data.name, data.account_number);
		if (data.amount > 0) {
			player.setIn(data.amount);
		} else if (data.amount < 0) {
			player.setOut(Math.abs(data.amount));
		}
		week.calculateTotals();
		appStore.save();
		showAddPlayer = false;
	};

	const handleDropPlayer = (data: { name: string; account_number: number }) => {
		// Check if player already exists in this week
		const existing = week.getPlayerByAccount(data.account_number);
		if (existing) {
			alert(`${data.name} is already in this week`);
			return;
		}
		// Add player with 0 amount - they can edit to set the amount
		week.addPlayer(data.name, data.account_number);
		week.calculateTotals();
		appStore.save();
	};

	const handleEditPlayer = (data: { name: string; account_number: number; amount: number }) => {
		if (!editingPlayerId) return;
		const player = week.getPlayer(editingPlayerId);
		if (player) {
			player.name = data.name;
			player.account_number = data.account_number;
			player.amount = data.amount;
			week.calculateTotals();
			appStore.save();
		}
		editingPlayerId = null;
	};

	const handleDeletePlayer = (id: string) => {
		week.removePlayer(id);
		appStore.save();
	};

	const handleStartClose = () => {
		week.startClose();
		appStore.save();
	};

	const handleCancelClose = () => {
		// WeekClose component handles this
	};

	const handleFinalizeClose = () => {
		// Week is now closed, offer to create next week
		if (onCreateNextWeek && week.total_carried_out > 0) {
			if (confirm(`Week closed. Create next week with $${week.total_carried_out.toFixed(2)} in carries?`)) {
				onCreateNextWeek();
			}
		}
	};

	const handleReopenWeek = () => {
		if (confirm('Reopen this week? This will reset all payment statuses.')) {
			week.cancelClose();
			appStore.save();
		}
	};

	const handleDeleteWeek = () => {
		if (confirm('Are you sure you want to delete this week?')) {
			appStore.deleteWeek(week.id);
			onBack();
		}
	};

	const editingPlayer = $derived(editingPlayerId ? week.getPlayer(editingPlayerId) : undefined);

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'active': return { class: 'bg-green-100 text-green-700', label: 'Active' };
			case 'pending_close': return { class: 'bg-orange-100 text-orange-700', label: 'Pending Close' };
			case 'closed': return { class: 'bg-gray-100 text-gray-700', label: 'Closed' };
			default: return { class: 'bg-gray-100 text-gray-700', label: status };
		}
	};

	const statusBadge = $derived(getStatusBadge(week.status));
</script>

{#if week.isPendingClose}
	<!-- Week Close Review Mode -->
	<div class="space-y-4">
		<Button variant="ghost" size="sm" onclick={onBack} class="mb-2">← Back</Button>
		<WeekClose 
			{week} 
			onCancel={handleCancelClose} 
			onFinalize={handleFinalizeClose} 
		/>
	</div>
{:else}
	<!-- Normal Week View -->
	<div class="space-y-4">
		<Card class="w-full">
			<Header class="flex flex-row items-start justify-between">
				<div>
					<Button variant="ghost" size="sm" onclick={onBack} class="mb-2">← Back</Button>
					<div class="flex items-center gap-2">
						<Title class="text-2xl font-bold">{week.name}</Title>
						<span class="rounded px-2 py-1 text-xs font-medium {statusBadge.class}">
							{statusBadge.label}
						</span>
					</div>
					<p class="text-sm text-gray-500">
						{formatDate(week.start)} - {formatDate(week.end)}
					</p>
				</div>
				<div class="flex gap-2">
					{#if week.isActive}
						<Button size="sm" onclick={handleStartClose} class="bg-orange-500 hover:bg-orange-600">
							Close Week
						</Button>
						<Button variant="outline" size="sm" onclick={onEdit}>Edit</Button>
					{:else if week.isClosed}
						<Button variant="outline" size="sm" onclick={handleReopenWeek}>
							Reopen
						</Button>
						{#if onCreateNextWeek}
							<Button size="sm" onclick={onCreateNextWeek} class="bg-indigo-500 hover:bg-indigo-600">
								Create Next Week
							</Button>
						{/if}
					{/if}
					<Button variant="outline" size="sm" onclick={handleDeleteWeek} class="text-red-600 hover:bg-red-50">
						Delete
					</Button>
				</div>
			</Header>
			<Content class="p-4">
				<div class="grid grid-cols-4 gap-4 text-center">
					<div class="rounded-lg bg-green-50 p-3">
						<p class="text-sm text-gray-600">In</p>
						<p class="text-xl font-bold text-green-600">${week.in_total.toFixed(2)}</p>
					</div>
					<div class="rounded-lg bg-red-50 p-3">
						<p class="text-sm text-gray-600">Out</p>
						<p class="text-xl font-bold text-red-600">${week.out_total.toFixed(2)}</p>
					</div>
					<div class="rounded-lg bg-yellow-50 p-3">
						<p class="text-sm text-gray-600">Vig</p>
						<p class="text-xl font-bold text-yellow-600">${week.vig.toFixed(2)}</p>
					</div>
					<div class="rounded-lg {week.result >= 0 ? 'bg-green-100' : 'bg-red-100'} p-3">
						<p class="text-sm text-gray-600">Result</p>
						<p class="text-xl font-bold {week.result >= 0 ? 'text-green-700' : 'text-red-700'}">
							${week.result.toFixed(2)}
						</p>
					</div>
				</div>

				{#if week.isClosed}
					<!-- Show collection summary for closed weeks -->
					<div class="mt-4 grid grid-cols-4 gap-4 text-center">
						<div class="rounded-lg bg-blue-50 p-3">
							<p class="text-sm text-gray-600">Expected</p>
							<p class="text-lg font-bold text-blue-600">${week.expected_in.toFixed(2)}</p>
						</div>
						<div class="rounded-lg bg-green-50 p-3">
							<p class="text-sm text-gray-600">Collected</p>
							<p class="text-lg font-bold text-green-600">${week.actual_collected.toFixed(2)}</p>
						</div>
						<div class="rounded-lg bg-yellow-50 p-3">
							<p class="text-sm text-gray-600">Carried In</p>
							<p class="text-lg font-bold text-yellow-600">${week.total_carried_in.toFixed(2)}</p>
						</div>
						<div class="rounded-lg bg-orange-50 p-3">
							<p class="text-sm text-gray-600">Carried Out</p>
							<p class="text-lg font-bold text-orange-600">${week.total_carried_out.toFixed(2)}</p>
						</div>
					</div>
				{/if}
			</Content>
		</Card>

		{#if week.isActive}
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
				<!-- Player Roster (draggable source) -->
				<div class="lg:col-span-1">
					<PlayerRoster />
				</div>

				<!-- Week Players (drop target) -->
				<div class="lg:col-span-3">
					{#if showAddPlayer}
						<PlayerForm
							onSave={handleAddPlayer}
							onCancel={() => (showAddPlayer = false)}
						/>
					{:else if editingPlayer}
						<PlayerForm
							player={editingPlayer}
							onSave={handleEditPlayer}
							onCancel={() => (editingPlayerId = null)}
						/>
					{:else}
						<PlayerDropZone onDrop={handleDropPlayer}>
							<PlayerList
								players={week.players}
								onAddPlayer={() => (showAddPlayer = true)}
								onEditPlayer={(id) => (editingPlayerId = id)}
								onDeletePlayer={handleDeletePlayer}
							/>
						</PlayerDropZone>
					{/if}
				</div>
			</div>
		{:else}
			<!-- Read-only player list for closed weeks -->
			<PlayerList
				players={week.players}
				onAddPlayer={() => {}}
				onEditPlayer={() => {}}
				onDeletePlayer={() => {}}
			/>
		{/if}
	</div>
{/if}
