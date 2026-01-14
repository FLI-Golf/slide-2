<script lang="ts">
	import { appStore, type Week } from '$lib/models';
	import { Button } from '$lib/components/ui/button';
	import { Card, Header, Title, Content, Footer } from '$lib/components/ui/card';

	interface Props {
		onSelectWeek: (week: Week) => void;
	}

	let { onSelectWeek }: Props = $props();

	const PAGE_SIZE = 5;
	let currentPage = $state(1);

	// Get closed weeks sorted by end date (most recent first)
	const closedWeeks = $derived(
		appStore.weeks
			.filter(w => w.isClosed)
			.sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())
	);

	const totalPages = $derived(Math.ceil(closedWeeks.length / PAGE_SIZE));

	const paginatedWeeks = $derived(
		closedWeeks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
	);

	const formatDate = (iso: string) => {
		return new Date(iso).toLocaleDateString();
	};

	const goToPage = (page: number) => {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
		}
	};
</script>

{#if closedWeeks.length > 0}
	<Card class="w-full">
		<Header>
			<Title class="text-xl font-bold">Week History</Title>
			<p class="text-sm text-gray-500">{closedWeeks.length} closed week{closedWeeks.length !== 1 ? 's' : ''}</p>
		</Header>
		<Content class="p-4">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b text-left text-sm text-gray-600">
							<th class="pb-2 font-medium">Week</th>
							<th class="pb-2 font-medium">Dates</th>
							<th class="pb-2 text-right font-medium">In</th>
							<th class="pb-2 text-right font-medium">Out</th>
							<th class="pb-2 text-right font-medium">Vig</th>
							<th class="pb-2 text-right font-medium">Result</th>
							<th class="pb-2 text-right font-medium">Collected</th>
							<th class="pb-2 text-right font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedWeeks as week (week.id)}
							<tr class="border-b last:border-0 hover:bg-gray-50">
								<td class="py-3 font-medium">{week.name}</td>
								<td class="py-3 text-sm text-gray-600">
									{formatDate(week.start)} - {formatDate(week.end)}
								</td>
								<td class="py-3 text-right text-green-600">
									${week.in_total.toFixed(2)}
								</td>
								<td class="py-3 text-right text-red-600">
									${week.out_total.toFixed(2)}
								</td>
								<td class="py-3 text-right text-yellow-600">
									${week.vig.toFixed(2)}
								</td>
								<td class="py-3 text-right font-medium {week.result >= 0 ? 'text-green-600' : 'text-red-600'}">
									${week.result.toFixed(2)}
								</td>
								<td class="py-3 text-right">
									<span class="{week.actual_collected >= week.expected_in ? 'text-green-600' : 'text-orange-600'}">
										${week.actual_collected.toFixed(2)}
									</span>
								</td>
								<td class="py-3 text-right">
									<Button
										variant="ghost"
										size="sm"
										onclick={() => onSelectWeek(week)}
										class="h-8 px-2"
									>
										View
									</Button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Content>
		{#if totalPages > 1}
			<Footer class="flex items-center justify-between p-4">
				<span class="text-sm text-gray-500">
					Page {currentPage} of {totalPages}
				</span>
				<div class="flex gap-1">
					<Button
						variant="outline"
						size="sm"
						onclick={() => goToPage(1)}
						disabled={currentPage === 1}
					>
						First
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => goToPage(currentPage - 1)}
						disabled={currentPage === 1}
					>
						Prev
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => goToPage(currentPage + 1)}
						disabled={currentPage === totalPages}
					>
						Next
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => goToPage(totalPages)}
						disabled={currentPage === totalPages}
					>
						Last
					</Button>
				</div>
			</Footer>
		{/if}
	</Card>
{/if}
