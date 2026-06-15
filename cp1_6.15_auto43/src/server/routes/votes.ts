import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getRandomAnimalName } from '../index';
import type { Idea, Vote, Comment } from '../index';

interface Store {
  ideas: Idea[];
  votes: Vote[];
  comments: Comment[];
}

export function createVotesRouter(store: Store) {
  const router = Router();

  router.post('/', (req, res) => {
    const { ideaId, type, voterId } = req.body;
    if (!ideaId || !type || !voterId) {
      res.status(400).json({ error: 'ideaId, type, and voterId are required' });
      return;
    }
    if (type !== 'for' && type !== 'against') {
      res.status(400).json({ error: 'Type must be "for" or "against"' });
      return;
    }
    const idea = store.ideas.find((i) => i.id === ideaId);
    if (!idea) {
      res.status(404).json({ error: 'Idea not found' });
      return;
    }

    const existingVoteIndex = store.votes.findIndex(
      (v) => v.ideaId === ideaId && v.voterId === voterId
    );

    if (existingVoteIndex !== -1) {
      const existingVote = store.votes[existingVoteIndex];
      if (existingVote.type === type) {
        if (existingVote.type === 'for') idea.votesFor--;
        else idea.votesAgainst--;
        idea.voterIds = idea.voterIds.filter((vid) => vid !== voterId);
        store.votes.splice(existingVoteIndex, 1);
        res.json({ idea, vote: null });
        return;
      } else {
        if (existingVote.type === 'for') idea.votesFor--;
        else idea.votesAgainst--;
        if (type === 'for') idea.votesFor++;
        else idea.votesAgainst++;
        store.votes[existingVoteIndex] = { ...existingVote, type };
        res.json({ idea, vote: store.votes[existingVoteIndex] });
        return;
      }
    }

    const vote: Vote = {
      id: uuidv4(),
      ideaId,
      type,
      voterId,
    };
    store.votes.push(vote);
    if (type === 'for') idea.votesFor++;
    else idea.votesAgainst++;
    if (!idea.voterIds.includes(voterId)) {
      idea.voterIds.push(voterId);
    }
    res.status(201).json({ idea, vote });
  });

  router.get('/:ideaId', (req, res) => {
    const ideaVotes = store.votes.filter((v) => v.ideaId === req.params.ideaId);
    const idea = store.ideas.find((i) => i.id === req.params.ideaId);
    if (!idea) {
      res.status(404).json({ error: 'Idea not found' });
      return;
    }
    res.json({
      votesFor: idea.votesFor,
      votesAgainst: idea.votesAgainst,
      totalVotes: idea.votesFor + idea.votesAgainst,
      voterCount: idea.voterIds.length,
      votes: ideaVotes,
    });
  });

  router.post('/:ideaId/comments', (req, res) => {
    const { content, voterId } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }
    const idea = store.ideas.find((i) => i.id === req.params.ideaId);
    if (!idea) {
      res.status(404).json({ error: 'Idea not found' });
      return;
    }
    const comment: Comment = {
      id: uuidv4(),
      ideaId: req.params.ideaId,
      anonymousName: getRandomAnimalName(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    idea.comments.push(comment);
    store.comments.push(comment);
    res.status(201).json(comment);
  });

  router.get('/:ideaId/comments', (req, res) => {
    const idea = store.ideas.find((i) => i.id === req.params.ideaId);
    if (!idea) {
      res.status(404).json({ error: 'Idea not found' });
      return;
    }
    res.json(idea.comments);
  });

  return router;
}
