<script lang="ts">
	import { appStore, type Week } from '$lib/models';
	import { Button } from '$lib/components/ui/button';
	import { Card, Header, Title, Content } from '$lib/components/ui/card';

	interface Props {
		onSelectWeek: (week: Week) => void;
		onCreateWeek: () => void;
	}

	let { onSelectWeek, onCreateWeek }: Props = $props();

	const formatDate = (iso: string) => {
		return new Date(iso).toLocaleDateString();
	};

	const runningBalance = $derived(appStore.getRunningBalance());

	// Only show active and pending_close weeks (not closed - those go in WeekHistory)
	const activeWeeks = $derived(
		appStore.weeks
			.filter(w => !w.isClosed)
			.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
	);

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'active': return 'bg-green-100 text-green-700';
			case 'pending_close': return 'bg-orange-100 text-orange-700';
			case 'closed': return 'bg-gray-100 text-gray-700';
			default: return 'bg-gray-100 text-gray-700';
		}
	};
</script>

<div class="space-y-4">
	<!-- Running Balance Summary -->
	{#if runningBalance.totalExpected > 0}
		<Card class="w-full">
			<Header>
				<Title class="text-lg font-bold">Running Balance</Title>
			</Header>
			<Content class="p-4">
				<div class="grid grid-cols-3 gap-4 text-center">
					<div class="rounded-lg bg-blue-50 p-3">
						<p class="text-sm text-gray-600">Total Expected</p>
						<p class="text-xl font-bold text-blue-600">${runningBalance.totalExpected.toFixed(2)}</p>
					</div>
					<div class="rounded-lg bg-green-50 p-3">
						<p class="text-sm text-gray-600">Total Collected</p>
						<p class="text-xl font-bold text-green-600">${runningBalance.totalCollected.toFixed(2)}</p>
					</div>
					<div class="rounded-lg {runningBalance.totalOutstanding > 0 ? 'bg-red-50' : 'bg-green-50'} p-3">
						<p class="text-sm text-gray-600">Outstanding</p>
						<p class="text-xl font-bold {runningBalance.totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}">
							${runningBalance.totalOutstanding.toFixed(2)}
						</p>
					</div>
				</div>
			</Content>
		</Card>
	{/if}

	<!-- Weeks List -->
	<Card class="w-full">
		<Header class="flex flex-row items-center justify-between">
			<Title class="text-xl font-bold">Active Weeks</Title>
			<Button onclick={onCreateWeek} size="sm">+ New Week</Button>
		</Header>
		<Content class="p-4">
			{#if activeWeeks.length === 0}
				<p class="text-center text-gray-500">No active weeks. Create one to get started.</p>
			{:else}
				<div class="space-y-2">
					{#each activeWeeks as week (week.id)}
						<button
							class="w-full rounded-lg border p-3 text-left transition-colors hover:bg-gray-50 {appStore.activeWeekId === week.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}"
							onclick={() => onSelectWeek(week)}
						>
							<div class="flex items-center justify-between">
								<div>
									<div class="flex items-center gap-2">
										<h3 class="font-medium">{week.name}</h3>
										<span class="rounded px-1.5 py-0.5 text-xs font-medium {getStatusBadge(week.status)}">
											{week.status === 'pending_close' ? 'Pending' : week.status === 'active' ? 'Active' : 'Closed'}
										</span>
									</div>
									<p class="text-sm text-gray-500">
										{formatDate(week.start)} - {formatDate(week.end)}
									</p>
								</div>
								<div class="text-right">
									<p class="text-sm">
										<span class="text-green-600">+${week.in_total.toFixed(2)}</span>
										/
										<span class="text-red-600">-${week.out_total.toFixed(2)}</span>
									</p>
									<p class="text-sm font-medium {week.result >= 0 ? 'text-green-600' : 'text-red-600'}">
										Result: ${week.result.toFixed(2)}
									</p>
								</div>
							</div>
							<div class="mt-1 flex items-center gap-2">
								<span class="text-xs text-gray-400">{week.playerCount} players</span>
								{#if week.total_carried_in > 0}
									<span class="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">
										Carry In: ${week.total_carried_in.toFixed(2)}
									</span>
								{/if}
								{#if week.isClosed && week.total_carried_out > 0}
									<span class="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700">
										Carry Out: ${week.total_carried_out.toFixed(2)}
									</span>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</Content>
	</Card>
</div>
