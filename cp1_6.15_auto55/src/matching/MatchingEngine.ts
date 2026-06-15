import { MatchResult, User, Idea } from '../lib/types';

export class MatchingEngine {
  private users: Map<string, User> = new Map();
  private ideas: Map<string, Idea> = new Map();
  private matchCounts: Map<string, Map<string, number>> = new Map();
  private readonly THRESHOLD = 0.7;
  private readonly MAX_MATCHES_PER_USER = 3;
  private readonly MAX_RESULTS = 10;

  setUsers(users: User[]) {
    users.forEach(u => this.users.set(u.id, u));
  }

  setIdeas(ideas: Idea[]) {
    ideas.forEach(i => this.ideas.set(i.id, i));
  }

  addUser(user: User) {
    this.users.set(user.id, user);
  }

  addIdea(idea: Idea) {
    this.ideas.set(idea.id, idea);
  }

  private jaccardSimilarity(setA: string[], setB: string[]): number {
    if (setA.length === 0 || setB.length === 0) return 0;
    const a = new Set(setA);
    const b = new Set(setB);
    const intersection = new Set([...a].filter(x => b.has(x)));
    const union = new Set([...a, ...b]);
    return intersection.size / union.size;
  }

  match(userId: string, ideaId: string, tags: string[]): MatchResult[] {
    const sourceUser = this.users.get(userId);
    const results: (MatchResult & { matchCount: number })[] = [];

    for (const [uid, user] of this.users.entries()) {
      if (uid === userId) continue;
      if (!user.isActive) continue;

      const ideaTags = tags;
      const userTags = user.tags;
      const allTags = [...new Set([...ideaTags, ...sourceUser?.tags || []])];

      const similarity = this.jaccardSimilarity(allTags, userTags);
      if (similarity < this.THRESHOLD) continue;

      const userMatchMap = this.matchCounts.get(userId);
      const countForThisUser = userMatchMap?.get(uid) || 0;
      if (countForThisUser >= this.MAX_MATCHES_PER_USER) continue;

      results.push({
        userId: uid,
        username: user.username,
        avatar: user.avatar,
        tags: user.tags,
        similarity: Math.round(similarity * 100),
        ideaId,
        matchCount: countForThisUser
      });
    }

    for (const [iid, idea] of this.ideas.entries()) {
      if (iid === ideaId) continue;
      const ideaAuthor = this.users.get(idea.userId);
      if (!ideaAuthor || ideaAuthor.id === userId) continue;
      if (!ideaAuthor.isActive) continue;

      const ideaTags = tags;
      const otherIdeaTags = idea.tags;
      const similarity = this.jaccardSimilarity(ideaTags, otherIdeaTags);
      if (similarity < this.THRESHOLD) continue;

      const alreadyIn = results.some(r => r.userId === ideaAuthor.id);
      if (alreadyIn) continue;

      const userMatchMap = this.matchCounts.get(userId);
      const countForThisUser = userMatchMap?.get(ideaAuthor.id) || 0;
      if (countForThisUser >= this.MAX_MATCHES_PER_USER) continue;

      results.push({
        userId: ideaAuthor.id,
        username: ideaAuthor.username,
        avatar: ideaAuthor.avatar,
        tags: ideaAuthor.tags,
        similarity: Math.round(similarity * 100),
        ideaId: iid,
        matchCount: countForThisUser
      });
    }

    results.sort((a, b) => b.similarity - a.similarity);

    const finalResults = results.slice(0, this.MAX_RESULTS).map(r => {
      const userMap = this.matchCounts.get(userId) || new Map();
      const current = userMap.get(r.userId) || 0;
      userMap.set(r.userId, current + 1);
      this.matchCounts.set(userId, userMap);

      const { matchCount, ...rest } = r;
      return rest;
    });

    return finalResults;
  }

  resetMatchCounts(userId: string) {
    this.matchCounts.delete(userId);
  }
}

export const matchingEngine = new MatchingEngine();
