import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, searchForWorkspaceRoot } from 'vite';

export default defineConfig({
	build: {
		sourcemap: 'inline',
	},
	plugins: [sveltekit()],
	server: {
		fs: {
			allow: [
				// search up for workspace root
				searchForWorkspaceRoot(process.cwd()),
				// For some reason, it's not detecting the paci and mcumgr workspaces.
				'/packages/',
			],
		},
	},
});
