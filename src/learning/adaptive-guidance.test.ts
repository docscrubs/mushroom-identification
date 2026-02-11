import { describe, it, expect } from 'vitest';
import type { CompetencyStatus } from '@/types/user';
import {
  getGuidanceLevel,
  buildGuidanceContext,
} from './adaptive-guidance';

describe('Adaptive Guidance', () => {
  describe('getGuidanceLevel', () => {
    it('returns beginner for not_started', () => {
      expect(getGuidanceLevel('not_started')).toBe('beginner');
    });

    it('returns beginner for aware', () => {
      expect(getGuidanceLevel('aware')).toBe('beginner');
    });

    it('returns beginner for aware_not_confident', () => {
      expect(getGuidanceLevel('aware_not_confident')).toBe('beginner');
    });

    it('returns intermediate for learning', () => {
      expect(getGuidanceLevel('learning')).toBe('intermediate');
    });

    it('returns advanced for confident', () => {
      expect(getGuidanceLevel('confident')).toBe('advanced');
    });

    it('returns expert for expert', () => {
      expect(getGuidanceLevel('expert')).toBe('expert');
    });

    it('returns beginner for undefined (no competency data)', () => {
      expect(getGuidanceLevel(undefined)).toBe('beginner');
    });
  });

  describe('buildGuidanceContext', () => {
    it('returns beginner context when no competencies provided', () => {
      const ctx = buildGuidanceContext([], ['Russula', 'Agaricus']);
      expect(ctx.overallLevel).toBe('beginner');
      expect(ctx.genusTips['Russula']!.level).toBe('beginner');
      expect(ctx.genusTips['Agaricus']!.level).toBe('beginner');
    });

    it('uses the lowest genus competency as the overall level', () => {
      const competencies = [
        { skill_id: 'genus_recognition.Russula', status: 'expert' as CompetencyStatus },
        { skill_id: 'genus_recognition.Agaricus', status: 'learning' as CompetencyStatus },
      ];
      const ctx = buildGuidanceContext(competencies, ['Russula', 'Agaricus']);
      expect(ctx.overallLevel).toBe('intermediate'); // lowest of expert + learning = intermediate
    });

    it('includes per-genus tips for known genera', () => {
      const competencies = [
        { skill_id: 'genus_recognition.Russula', status: 'expert' as CompetencyStatus },
      ];
      const ctx = buildGuidanceContext(competencies, ['Russula']);
      expect(ctx.genusTips['Russula']).toBeDefined();
      expect(ctx.genusTips['Russula']!.level).toBe('expert');
    });

    it('marks unknown genera as beginner', () => {
      const competencies = [
        { skill_id: 'genus_recognition.Russula', status: 'expert' as CompetencyStatus },
      ];
      const ctx = buildGuidanceContext(competencies, ['Russula', 'Amanita']);
      expect(ctx.genusTips['Amanita']).toBeDefined();
      expect(ctx.genusTips['Amanita']!.level).toBe('beginner');
    });

    it('generates appropriate prompt hint for beginner', () => {
      const ctx = buildGuidanceContext([], ['Russula']);
      expect(ctx.promptHint).toContain('beginner');
    });

    it('generates appropriate prompt hint for expert overall level', () => {
      const competencies = [
        { skill_id: 'genus_recognition.Russula', status: 'expert' as CompetencyStatus },
      ];
      const ctx = buildGuidanceContext(competencies, ['Russula']);
      expect(ctx.promptHint).toContain('expert');
    });

    it('generates appropriate prompt hint for intermediate', () => {
      const competencies = [
        { skill_id: 'genus_recognition.Russula', status: 'learning' as CompetencyStatus },
      ];
      const ctx = buildGuidanceContext(competencies, ['Russula']);
      expect(ctx.promptHint).toContain('intermediate');
    });

    it('generates appropriate prompt hint for advanced', () => {
      const competencies = [
        { skill_id: 'genus_recognition.Russula', status: 'confident' as CompetencyStatus },
      ];
      const ctx = buildGuidanceContext(competencies, ['Russula']);
      expect(ctx.promptHint).toContain('advanced');
    });

    it('handles empty candidate genera list', () => {
      const ctx = buildGuidanceContext([], []);
      expect(ctx.overallLevel).toBe('beginner');
      expect(ctx.genusTips).toEqual({});
    });
  });
});
