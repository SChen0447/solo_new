import { v4 as uuidv4 } from 'uuid';
import type {
  Vote,
  Option,
  Session,
  Participant,
  CreateVoteParams,
  ValidationResult,
  ExportData,
  VoteRecord,
} from './types';

export function generateSessionCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashColorFromString(str: string): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function createParticipant(name: string, isHost: boolean): Participant {
  return {
    id: uuidv4(),
    name,
    isHost,
    avatarColor: hashColorFromString(name),
    votedVoteIds: [],
    joinedAt: Date.now(),
  };
}

export function createSession(host: Participant): Session {
  return {
    id: uuidv4(),
    code: generateSessionCode(),
    hostId: host.id,
    participants: [host],
    votes: [],
    createdAt: Date.now(),
  };
}

export function validateVoteTitle(title: string): ValidationResult {
  if (!title.trim()) {
    return { valid: false, message: '投票标题不能为空' };
  }
  if (title.length > 50) {
    return { valid: false, message: '投票标题最多50个字符' };
  }
  return { valid: true };
}

export function validateOptions(options: string[]): ValidationResult {
  const filtered = options.filter((o) => o.trim());
  if (filtered.length < 2) {
    return { valid: false, message: '至少需要2个有效选项' };
  }
  if (filtered.length > 8) {
    return { valid: false, message: '最多只能有8个选项' };
  }
  for (const opt of filtered) {
    if (opt.length > 30) {
      return { valid: false, message: '每个选项最多30个字符' };
    }
  }
  return { valid: true };
}

export function createVote(params: CreateVoteParams): Vote {
  const { title, options, isAnonymous, voteType, maxSelections } = params;

  const voteOptions: Option[] = options
    .filter((o) => o.trim())
    .map((text) => ({
      id: uuidv4(),
      text: text.trim(),
      voteCount: 0,
    }));

  return {
    id: uuidv4(),
    title: title.trim(),
    options: voteOptions,
    status: 'active',
    isAnonymous,
    voteType,
    maxSelections,
    createdAt: Date.now(),
    voteRecords: [],
  };
}

export function castVote(
  session: Session,
  voteId: string,
  participantId: string,
  optionIds: string[]
): Session {
  const voteIndex = session.votes.findIndex((v) => v.id === voteId);
  if (voteIndex === -1) return session;

  const vote = session.votes[voteIndex];
  if (vote.status !== 'active') return session;

  if (vote.voteType === 'single' && optionIds.length > 1) {
    return session;
  }

  if (optionIds.length > vote.maxSelections) {
    return session;
  }

  const participantIndex = session.participants.findIndex(
    (p) => p.id === participantId
  );
  if (participantIndex === -1) return session;

  const existingRecordIndex = vote.voteRecords.findIndex(
    (r) => r.participantId === participantId
  );

  const participant = session.participants[participantIndex];
  const hasVoted = participant.votedVoteIds.includes(voteId);

  const updatedVoteRecords = [...vote.voteRecords];
  const updatedOptions = vote.options.map((opt) => ({ ...opt }));

  if (existingRecordIndex !== -1) {
    const oldRecord = updatedVoteRecords[existingRecordIndex];
    oldRecord.optionIds.forEach((optId) => {
      const opt = updatedOptions.find((o) => o.id === optId);
      if (opt && opt.voteCount > 0) {
        opt.voteCount--;
      }
    });

    if (optionIds.length === 0) {
      updatedVoteRecords.splice(existingRecordIndex, 1);
    } else {
      optionIds.forEach((optId) => {
        const opt = updatedOptions.find((o) => o.id === optId);
        if (opt) {
          opt.voteCount++;
        }
      });
      updatedVoteRecords[existingRecordIndex] = {
        ...oldRecord,
        optionIds,
        votedAt: Date.now(),
      };
    }
  } else if (optionIds.length > 0) {
    optionIds.forEach((optId) => {
      const opt = updatedOptions.find((o) => o.id === optId);
      if (opt) {
        opt.voteCount++;
      }
    });

    const newRecord: VoteRecord = {
      participantId,
      participantName: vote.isAnonymous ? undefined : participant.name,
      optionIds,
      votedAt: Date.now(),
    };
    updatedVoteRecords.push(newRecord);
  }

  const updatedVotedVoteIds =
    optionIds.length > 0
      ? hasVoted
        ? participant.votedVoteIds
        : [...participant.votedVoteIds, voteId]
      : participant.votedVoteIds.filter((id) => id !== voteId);

  const updatedParticipants = [...session.participants];
  updatedParticipants[participantIndex] = {
    ...participant,
    votedVoteIds: updatedVotedVoteIds,
  };

  const updatedVotes = [...session.votes];
  updatedVotes[voteIndex] = {
    ...vote,
    options: updatedOptions,
    voteRecords: updatedVoteRecords,
  };

  return {
    ...session,
    participants: updatedParticipants,
    votes: updatedVotes,
  };
}

export function endVote(vote: Vote): Vote {
  return {
    ...vote,
    status: 'ended',
    endedAt: Date.now(),
  };
}

export function reactivateVote(vote: Vote): Vote {
  return {
    ...vote,
    status: 'active',
    endedAt: undefined,
    options: vote.options.map((opt) => ({ ...opt, voteCount: 0 })),
    voteRecords: [],
  };
}

export function getTotalVotes(vote: Vote): number {
  return vote.options.reduce((sum, opt) => sum + opt.voteCount, 0);
}

export function getUniqueVotersCount(vote: Vote): number {
  return new Set(vote.voteRecords.map((r) => r.participantId)).size;
}

export function getSortedOptionsByVotes(vote: Vote): Option[] {
  return [...vote.options].sort((a, b) => b.voteCount - a.voteCount);
}

export function exportVoteResult(vote: Vote): ExportData {
  const totalVotes = getTotalVotes(vote);
  return {
    title: vote.title,
    options: vote.options.map((opt) => ({
      text: opt.text,
      voteCount: opt.voteCount,
      percentage: totalVotes > 0 ? (opt.voteCount / totalVotes) * 100 : 0,
    })),
    totalVotes,
    timestamp: Date.now(),
  };
}

export function addParticipant(
  session: Session,
  participant: Participant
): Session {
  const exists = session.participants.some((p) => p.id === participant.id);
  if (exists) return session;
  return {
    ...session,
    participants: [...session.participants, participant],
  };
}

export function hasParticipantVoted(
  participant: Participant,
  voteId: string
): boolean {
  return participant.votedVoteIds.includes(voteId);
}

export function getParticipantSelections(
  vote: Vote,
  participantId: string
): string[] {
  const record = vote.voteRecords.find((r) => r.participantId === participantId);
  return record ? record.optionIds : [];
}
