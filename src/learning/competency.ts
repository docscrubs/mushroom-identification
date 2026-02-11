import type { CompetencyRecord, CompetencyStatus, EvidenceEntry } from '@/types/user';

const CONFIDENT_DECAY_DAYS = 180;
const EXPERT_DECAY_DAYS = 365;
const RECENT_WINDOW_DAYS = 30;
const EXPERT_WINDOW_DAYS = 90;

function daysSince(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}

/** Create a new competency record */
export function createCompetencyRecord(
  skillId: string,
  options: { unlocks?: string[] } = {},
): CompetencyRecord {
  return {
    skill_id: skillId,
    status: 'not_started',
    evidence: [],
    gaps: [],
    unlocks: options.unlocks ?? [],
    fsrs_card_ids: [],
  };
}

/** Add evidence to a competency record. May trigger auto-upgrade from not_started. */
export function addEvidence(
  record: CompetencyRecord,
  evidence: EvidenceEntry,
): CompetencyRecord {
  const updated: CompetencyRecord = {
    ...record,
    evidence: [...record.evidence, evidence],
    last_demonstrated: evidence.date,
    first_exposure: record.first_exposure ?? evidence.date,
  };

  // Auto-upgrade from not_started to aware on first evidence
  if (updated.status === 'not_started') {
    updated.status = 'aware';
  }

  return updated;
}

/** Check if a competency should be upgraded based on accumulated evidence */
export function checkUpgrade(record: CompetencyRecord): CompetencyRecord {
  const updated = { ...record };

  switch (record.status) {
    case 'aware':
    case 'aware_not_confident': {
      // Upgrade to learning after any identification attempt (assisted or correct)
      const hasAttempt = record.evidence.some(
        (e) =>
          e.type === 'correct_identification' ||
          e.type === 'assisted_identification',
      );
      if (hasAttempt) {
        updated.status = 'learning';
      }
      break;
    }

    case 'learning': {
      const recentEvidence = record.evidence.filter(
        (e) => daysSince(e.date) <= RECENT_WINDOW_DAYS,
      );
      const correctIds = recentEvidence.filter(
        (e) => e.type === 'correct_identification',
      ).length;
      const correctRejections = recentEvidence.filter(
        (e) => e.type === 'correct_rejection',
      ).length;
      const falsePositives = recentEvidence.filter(
        (e) => e.type === 'false_positive',
      ).length;

      if (correctIds >= 3 && correctRejections >= 1 && falsePositives === 0) {
        updated.status = 'confident';
      }
      break;
    }

    case 'confident': {
      const extendedEvidence = record.evidence.filter(
        (e) => daysSince(e.date) <= EXPERT_WINDOW_DAYS,
      );
      const correctIds = extendedEvidence.filter(
        (e) => e.type === 'correct_identification',
      ).length;
      const correctRejections = extendedEvidence.filter(
        (e) => e.type === 'correct_rejection',
      ).length;
      const falsePositives = extendedEvidence.filter(
        (e) => e.type === 'false_positive',
      ).length;

      if (correctIds >= 10 && correctRejections >= 3 && falsePositives === 0) {
        updated.status = 'expert';
      }
      break;
    }

    // expert and not_started don't upgrade further
    default:
      break;
  }

  return updated;
}

/** Check if a competency should decay due to inactivity */
export function checkDecay(record: CompetencyRecord): CompetencyRecord {
  const updated = { ...record };

  if (!record.last_demonstrated) return updated;

  const inactive = daysSince(record.last_demonstrated);

  switch (record.status) {
    case 'expert':
      if (inactive > EXPERT_DECAY_DAYS) {
        updated.status = 'confident';
      }
      break;
    case 'confident':
      if (inactive > CONFIDENT_DECAY_DAYS) {
        updated.status = 'learning';
      }
      break;
    // learning, aware, not_started don't decay further
    default:
      break;
  }

  return updated;
}

/** Get a numeric level (0-4) for a competency status */
export function getCompetencyLevel(status: CompetencyStatus): number {
  const levels: Record<CompetencyStatus, number> = {
    not_started: 0,
    aware: 1,
    aware_not_confident: 1,
    learning: 2,
    confident: 3,
    expert: 4,
  };
  return levels[status];
}
