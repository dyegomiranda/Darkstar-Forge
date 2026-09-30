import { mount } from 'svelte';
import '@fontsource-variable/inter';
import '@fontsource/cinzel/600.css';
import './styles.css';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });

if (import.meta.env.DEV) void import('../showcase/bench');
