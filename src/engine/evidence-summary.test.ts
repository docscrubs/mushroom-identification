import { describe, it, expect } from 'vitest';
import { summarizeObservation, summarizeAllObservations } from './evidence-summary';
import type { Observation } from '@/types';

describe('Evidence Summary', () => {
  describe('boolean fields', () => {
    it('summarizes ring_present=true as "ring present"', () => {
      expect(summarizeObservation('ring_present', true)).toBe('ring present');
    });

    it('summarizes ring_present=false as "no ring"', () => {
      expect(summarizeObservation('ring_present', false)).toBe('no ring');
    });

    it('summarizes volva_present=true as "volva present"', () => {
      expect(summarizeObservation('volva_present', true)).toBe('volva present');
    });

    it('summarizes volva_present=false as "no volva"', () => {
      expect(summarizeObservation('volva_present', false)).toBe('no volva');
    });

    it('summarizes stem_present=true as "stem present"', () => {
      expect(summarizeObservation('stem_present', true)).toBe('stem present');
    });

    it('summarizes stem_present=false as "no stem"', () => {
      expect(summarizeObservation('stem_present', false)).toBe('no stem');
    });
  });

  describe('select fields', () => {
    it('summarizes gill_type=gills as "gills"', () => {
      expect(summarizeObservation('gill_type', 'gills')).toBe('gills');
    });

    it('summarizes gill_type=pores as "pores"', () => {
      expect(summarizeObservation('gill_type', 'pores')).toBe('pores');
    });

    it('summarizes gill_type=teeth as "teeth/spines"', () => {
      expect(summarizeObservation('gill_type', 'teeth')).toBe('teeth/spines');
    });

    it('summarizes gill_type=ridges as "ridges (false gills)"', () => {
      expect(summarizeObservation('gill_type', 'ridges')).toBe('ridges (false gills)');
    });

    it('summarizes gill_type=smooth as "smooth underside"', () => {
      expect(summarizeObservation('gill_type', 'smooth')).toBe('smooth underside');
    });

    it('summarizes flesh_texture=brittle as "brittle flesh"', () => {
      expect(summarizeObservation('flesh_texture', 'brittle')).toBe('brittle flesh');
    });

    it('summarizes flesh_texture=tough as "tough flesh"', () => {
      expect(summarizeObservation('flesh_texture', 'tough')).toBe('tough flesh');
    });

    it('summarizes habitat=woodland as "woodland habitat"', () => {
      expect(summarizeObservation('habitat', 'woodland')).toBe('woodland habitat');
    });

    it('summarizes habitat=grassland as "grassland habitat"', () => {
      expect(summarizeObservation('habitat', 'grassland')).toBe('grassland habitat');
    });

    it('summarizes substrate=soil as "growing on soil"', () => {
      expect(summarizeObservation('substrate', 'soil')).toBe('growing on soil');
    });

    it('summarizes substrate=wood as "growing on wood"', () => {
      expect(summarizeObservation('substrate', 'wood')).toBe('growing on wood');
    });

    it('summarizes growth_pattern=clustered as "clustered growth"', () => {
      expect(summarizeObservation('growth_pattern', 'clustered')).toBe('clustered growth');
    });

    it('summarizes growth_pattern=ring as "ring/arc growth"', () => {
      expect(summarizeObservation('growth_pattern', 'ring')).toBe('ring/arc growth');
    });

    it('summarizes cap_shape=funnel as "funnel-shaped cap"', () => {
      expect(summarizeObservation('cap_shape', 'funnel')).toBe('funnel-shaped cap');
    });
  });

  describe('text input fields', () => {
    it('summarizes gill_color with value as "white gills"', () => {
      expect(summarizeObservation('gill_color', 'white')).toBe('white gills');
    });

    it('summarizes cap_color with value as "red cap"', () => {
      expect(summarizeObservation('cap_color', 'red')).toBe('red cap');
    });

    it('summarizes stem_color with value as "lilac stem"', () => {
      expect(summarizeObservation('stem_color', 'lilac')).toBe('lilac stem');
    });

    it('summarizes spore_print_color as "brown spore print"', () => {
      expect(summarizeObservation('spore_print_color', 'brown')).toBe('brown spore print');
    });

    it('summarizes smell with value as "smells of apricot"', () => {
      expect(summarizeObservation('smell', 'apricot')).toBe('smells of apricot');
    });

    it('summarizes bruising_color with value as "bruises inky black"', () => {
      expect(summarizeObservation('bruising_color', 'inky black')).toBe('bruises inky black');
    });
  });

  describe('numeric fields', () => {
    it('summarizes cap_size_cm as "cap ~20cm"', () => {
      expect(summarizeObservation('cap_size_cm', 20)).toBe('cap ~20cm');
    });

    it('summarizes season_month as month name', () => {
      expect(summarizeObservation('season_month', 9)).toBe('September');
    });
  });

  describe('summarizeAllObservations', () => {
    it('returns a list of summaries for all observed fields', () => {
      const obs: Observation = {
        gill_type: 'gills',
        ring_present: false,
        habitat: 'woodland',
      };
      const summaries = summarizeAllObservations(obs);
      expect(summaries).toContain('gills');
      expect(summaries).toContain('no ring');
      expect(summaries).toContain('woodland habitat');
      expect(summaries).toHaveLength(3);
    });
  });
});
