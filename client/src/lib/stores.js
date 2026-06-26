import { writable, derived } from 'svelte/store';
export const currentUser = writable(null);
export const isLoggedIn = derived(currentUser, $user => $user !== null);
