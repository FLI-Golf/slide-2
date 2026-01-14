<script lang="ts">
	import { type Week } from '$lib/models';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, Header, Title, Content, Footer } from '$lib/components/ui/card';

	interface Props {
		week?: Week;
		onSave: (data: { name: string; start: string; end: string; vig: number }) => void;
		onCancel: () => void;
	}

	let { week, onSave, onCancel }: Props = $props();

	let name = $state(week?.name ?? '');
	let start = $state(week?.start.split('T')[0] ?? new Date().toISOString().split('T')[0]);
	let end = $state(week?.end.split('T')[0] ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
	let vig = $state(week?.vig ?? 0);

	// Convert date string to ISO without timezone shift
	const toLocalISOString = (dateStr: string) => {
		// Append T12:00:00 to treat as noon local time, avoiding day shift
		return new Date(`${dateStr}T12:00:00`).toISOString();
	};

	const handleSubmit = (e: Event) => {
		e.preventDefault();
		onSave({
			name,
			start: toLocalISOString(start),
			end: toLocalISOString(end),
			vig
		});
	};

	const isEditing = $derived(!!week);
</script>

<Card class="w-full max-w-md">
	<Header>
		<Title class="text-xl font-bold">{isEditing ? 'Edit Week' : 'Create New Week'}</Title>
	</Header>
	<form onsubmit={handleSubmit}>
		<Content class="space-y-4 p-4">
			<div>
				<label for="week-name" class="text-sm font-medium">Week Name</label>
				<Input
					id="week-name"
					type="text"
					placeholder="e.g., Week 1"
					bind:value={name}
					class="mt-1"
					required
				/>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="week-start" class="text-sm font-medium">Start Date</label>
					<Input
						id="week-start"
						type="date"
						bind:value={start}
						class="mt-1"
						required
					/>
				</div>
				<div>
					<label for="week-end" class="text-sm font-medium">End Date</label>
					<Input
						id="week-end"
						type="date"
						bind:value={end}
						class="mt-1"
						required
					/>
				</div>
			</div>
			<div>
				<label for="week-vig" class="text-sm font-medium">Vig Amount</label>
				<Input
					id="week-vig"
					type="number"
					step="0.01"
					placeholder="0.00"
					bind:value={vig}
					class="mt-1"
				/>
			</div>
		</Content>
		<Footer class="flex justify-end gap-2 p-4">
			<Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
			<Button type="submit">{isEditing ? 'Update' : 'Create'}</Button>
		</Footer>
	</form>
</Card>
