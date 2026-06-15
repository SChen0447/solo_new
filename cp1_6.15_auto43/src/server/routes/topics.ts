import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Topic, Idea, Vote, Comment } from '../index';

interface Store {
  topics: Topic[];
  ideas: Idea[];
  votes: Vote[];
  comments: Comment[];
}

export function createTopicsRouter(store: Store) {
  const router = Router();

  router.get('/', (req, res) => {
    const { tag, status } = req.query;
    let filtered = [...store.topics];
    if (tag && typeof tag === 'string') {
      filtered = filtered.filter((t) => t.tags.includes(tag));
    }
    if (status && typeof status === 'string') {
      filtered = filtered.filter((t) => t.status === status);
    }
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(filtered);
  });

  router.get('/:id', (req, res) => {
    const topic = store.topics.find((t) => t.id === req.params.id);
    if (!topic) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }
    const topicIdeas = store.ideas
      .filter((i) => i.topicId === req.params.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ topic, ideas: topicIdeas });
  });

  router.post('/', (req, res) => {
    const { title, description, tags } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    if (title.length > 50) {
      res.status(400).json({ error: 'Title must be 50 characters or less' });
      return;
    }
    if (description && description.length > 500) {
      res.status(400).json({ error: 'Description must be 500 characters or less' });
      return;
    }
    const topic: Topic = {
      id: uuidv4(),
      title: title.trim(),
      description: (description || '').trim(),
      tags: tags || [],
      participants: 1,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    store.topics.push(topic);
    res.status(201).json(topic);
  });

  router.post('/:id/ideas', (req, res) => {
    const topic = store.topics.find((t) => t.id === req.params.id);
    if (!topic) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }
    const { content, imageUrl } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }
    if (content.length > 200) {
      res.status(400).json({ error: 'Content must be 200 characters or less' });
      return;
    }
    topic.participants += 1;
    const idea: Idea = {
      id: uuidv4(),
      topicId: req.params.id,
      content: content.trim(),
      imageUrl: imageUrl || undefined,
      createdAt: new Date().toISOString(),
      votesFor: 0,
      votesAgainst: 0,
      voterIds: [],
      comments: [],
    };
    store.ideas.push(idea);
    res.status(201).json(idea);
  });

  router.get('/:id/ideas', (req, res) => {
    const { sort } = req.query;
    let topicIdeas = store.ideas.filter((i) => i.topicId === req.params.id);
    if (sort === 'votes') {
      topicIdeas.sort((a, b) => (b.votesFor - b.votesAgainst) - (a.votesFor - a.votesAgainst));
    } else {
      topicIdeas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    res.json(topicIdeas);
  });

  router.patch('/:id/status', (req, res) => {
    const topic = store.topics.find((t) => t.id === req.params.id);
    if (!topic) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }
    const { status } = req.body;
    if (status !== 'active' && status !== 'ended') {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    topic.status = status;
    res.json(topic);
  });

  return router;
}
