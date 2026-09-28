/**
 * Textos da interface em PT-BR e EN-US, escritos lado a lado onde são usados:
 * L('Biblioteca', 'Library'). Um mecanismo só, sem chaves soltas.
 */
import { app } from '../store/project.svelte';

export const L = (pt: string, en: string): string => (app.lang === 'en-US' ? en : pt);
