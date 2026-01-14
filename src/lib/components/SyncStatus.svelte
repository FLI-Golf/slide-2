<script lang="ts">
	import { appStore } from '$lib/models';

	const formatTime = (iso: string | null) => {
		if (!iso) return 'Never';
		return new Date(iso).toLocaleTimeString();
	};

	const handleForceSync = async () => {
		await appStore.forceSyncToCloud();
	};

	const handleRefresh = async () => {
		await appStore.syncFromCloud();
	};
</script>

{#if appStore.isCloudEnabled}
	<div class="flex items-center gap-2 text-sm">
		{#if appStore.syncState === 'syncing'}
			<span class="flex items-center gap-1 text-blue-600">
				<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				Syncing...
			</span>
		{:else if appStore.syncState === 'success'}
			<span class="flex items-center gap-1 text-green-600">
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
				Synced
			</span>
		{:else if appStore.syncState === 'error'}
			<span class="flex items-center gap-1 text-red-600" title={appStore.syncError || 'Sync error'}>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Sync Error
			</span>
		{:else}
			<span class="flex items-center gap-1 text-gray-500">
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
				</svg>
				Cloud
			</span>
		{/if}

		{#if appStore.lastSynced}
			<span class="text-gray-400">
				Last: {formatTime(appStore.lastSynced)}
			</span>
		{/if}

		<button
			onclick={handleRefresh}
			class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
			title="Refresh from cloud"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
			</svg>
		</button>

		{#if appStore.syncState === 'error'}
			<button
				onclick={handleForceSync}
				class="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
			>
				Retry
			</button>
		{/if}
	</div>
{:else}
	<span class="text-xs text-gray-400">Local storage only</span>
{/if}
