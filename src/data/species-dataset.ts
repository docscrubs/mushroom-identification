import type { DatasetSpecies } from '@/types/species';
import rawData from './wildfooduk_mushrooms_enriched.json';

/**
 * The complete 268-species dataset from Wild Food UK, typed.
 * Loaded as a static import — bundled into the app at build time.
 */
export const speciesDataset: DatasetSpecies[] = rawData as DatasetSpecies[];
