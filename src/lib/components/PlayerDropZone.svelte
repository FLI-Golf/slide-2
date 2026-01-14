<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		onDrop: (data: { name: string; account_number: number }) => void;
		children: Snippet;
	}

	let { onDrop, children }: Props = $props();

	let isDragOver = $state(false);

	const handleDragOver = (e: DragEvent) => {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'copy';
		}
		isDragOver = true;
	};

	const handleDragLeave = (e: DragEvent) => {
		e.preventDefault();
		isDragOver = false;
	};

	const handleDrop = (e: DragEvent) => {
		e.preventDefault();
		isDragOver = false;

		if (e.dataTransfer) {
			try {
				const data = JSON.parse(e.dataTransfer.getData('application/json'));
				if (data.name && data.account_number !== undefined) {
					onDrop({ name: data.name, account_number: data.account_number });
				}
			} catch (err) {
				console.error('Failed to parse drop data:', err);
			}
		}
	};
</script>

<div
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	class="relative rounded-lg transition-all {isDragOver ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}"
	role="region"
	aria-label="Drop zone for players"
>
	{#if isDragOver}
		<div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-indigo-500/10">
			<p class="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white shadow-lg">
				Drop to add player
			</p>
		</div>
	{/if}
	{@render children()}
</div>
