<script lang="ts">
	import { appStore, type Week } from '$lib/models';
	import { WeekList, WeekForm, WeekDetail, WeekHistory, SyncStatus } from '$lib/components';

	// Initialize store on mount
	$effect(() => {
		appStore.init();
	});

	// View state
	type View = 'list' | 'create' | 'edit' | 'detail';
	let currentView = $state<View>('list');
	let selectedWeek = $state<Week | undefined>(undefined);
	
	// Tab state
	type Tab = 'active' | 'history';
	let currentTab = $state<Tab>('active');

	// Counts for badges
	const activeCount = $derived(appStore.weeks.filter(w => !w.isClosed).length);
	const historyCount = $derived(appStore.weeks.filter(w => w.isClosed).length);

	const handleSelectWeek = (week: Week) => {
		selectedWeek = week;
		appStore.setActiveWeek(week.id);
		currentView = 'detail';
	};

	const handleCreateWeek = () => {
		currentView = 'create';
	};

	const handleSaveNewWeek = (data: { name: string; start: string; end: string; vig: number }) => {
		const week = appStore.createWeek(data.name);
		week.start = data.start;
		week.end = data.end;
		week.vig = data.vig;
		week.activate();
		appStore.save();
		selectedWeek = week;
		currentView = 'detail';
	};

	const handleEditWeek = () => {
		currentView = 'edit';
	};

	const handleUpdateWeek = (data: { name: string; start: string; end: string; vig: number }) => {
		if (selectedWeek) {
			selectedWeek.name = data.name;
			selectedWeek.start = data.start;
			selectedWeek.end = data.end;
			selectedWeek.vig = data.vig;
			selectedWeek.calculateTotals();
			appStore.save();
		}
		currentView = 'detail';
	};

	const handleBack = () => {
		selectedWeek = undefined;
		currentView = 'list';
	};

	const handleCancel = () => {
		if (selectedWeek) {
			currentView = 'detail';
		} else {
			currentView = 'list';
		}
	};

	const handleCreateNextWeek = () => {
		if (selectedWeek && selectedWeek.isClosed) {
			const nextWeek = appStore.createNextWeekFromClosed(selectedWeek.id);
			if (nextWeek) {
				selectedWeek = nextWeek;
				appStore.setActiveWeek(nextWeek.id);
			}
		}
	};
</script>

<main class="min-h-screen bg-gray-100 p-4 md:p-8">
	<div class="mx-auto max-w-4xl">
		<header class="mb-6 flex items-start justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">Slide</h1>
				<p class="text-gray-600">Weekly Player Tracking</p>
			</div>
			<SyncStatus />
		</header>

		{#if !appStore.initialized}
			<p class="text-center text-gray-500">Loading...</p>
		{:else if currentView === 'list'}
			<div class="space-y-4">
				<!-- Tab Buttons -->
				<div class="flex gap-2">
					<button
						onclick={() => currentTab = 'active'}
						class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors {currentTab === 'active' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
					>
						Active
						{#if activeCount > 0}
							<span class="rounded-full px-2 py-0.5 text-xs {currentTab === 'active' ? 'bg-indigo-500 text-white' : 'bg-gray-300 text-gray-600'}">
								{activeCount}
							</span>
						{/if}
					</button>
					<button
						onclick={() => currentTab = 'history'}
						class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors {currentTab === 'history' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
					>
						History
						{#if historyCount > 0}
							<span class="rounded-full px-2 py-0.5 text-xs {currentTab === 'history' ? 'bg-indigo-500 text-white' : 'bg-gray-300 text-gray-600'}">
								{historyCount}
							</span>
						{/if}
					</button>
				</div>

				<!-- Tab Content -->
				{#if currentTab === 'active'}
					<WeekList onSelectWeek={handleSelectWeek} onCreateWeek={handleCreateWeek} />
				{:else}
					<WeekHistory onSelectWeek={handleSelectWeek} />
				{/if}
			</div>
		{:else if currentView === 'create'}
			<WeekForm onSave={handleSaveNewWeek} onCancel={handleCancel} />
		{:else if currentView === 'edit' && selectedWeek}
			<WeekForm week={selectedWeek} onSave={handleUpdateWeek} onCancel={handleCancel} />
		{:else if currentView === 'detail' && selectedWeek}
			<WeekDetail 
				week={selectedWeek} 
				onBack={handleBack} 
				onEdit={handleEditWeek} 
				onCreateNextWeek={handleCreateNextWeek}
			/>
		{/if}
	</div>
</main>
