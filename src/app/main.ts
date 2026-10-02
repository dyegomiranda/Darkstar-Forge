import { mount } from 'svelte';
import '@fontsource-variable/inter';
import '@fontsource/cinzel/600.css';
import '@fontsource/grenze-gotisch/700.css';
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import './styles.css';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });

if (import.meta.env.DEV) void import('../showcase/bench');
