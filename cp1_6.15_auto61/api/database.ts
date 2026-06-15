import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, 'codearena.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT NOT NULL,
    elo INTEGER DEFAULT 1000,
    rank TEXT DEFAULT 'bronze' CHECK(rank IN ('bronze','silver','gold','diamond')),
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS problems (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT CHECK(difficulty IN ('easy','medium','hard')),
    template TEXT NOT NULL,
    test_cases TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS battles (
    id TEXT PRIMARY KEY,
    problem_id TEXT NOT NULL REFERENCES problems(id),
    player1_id TEXT NOT NULL REFERENCES users(id),
    player2_id TEXT NOT NULL REFERENCES users(id),
    winner_id TEXT REFERENCES users(id),
    player1_passed INTEGER DEFAULT 0,
    player2_passed INTEGER DEFAULT 0,
    player1_time INTEGER DEFAULT 0,
    player2_time INTEGER DEFAULT 0,
    end_reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS battle_replays (
    id TEXT PRIMARY KEY,
    battle_id TEXT NOT NULL REFERENCES battles(id),
    timestamp INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    player_id TEXT NOT NULL REFERENCES users(id),
    event_data TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_battles_player1 ON battles(player1_id);
  CREATE INDEX IF NOT EXISTS idx_battles_player2 ON battles(player2_id);
  CREATE INDEX IF NOT EXISTS idx_replays_battle ON battle_replays(battle_id);
`)

const problemCount = db.prepare('SELECT COUNT(*) as count FROM problems').get() as { count: number }

if (problemCount.count === 0) {
  const insertProblem = db.prepare(`
    INSERT INTO problems (id, title, description, difficulty, template, test_cases)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const problems = [
    {
      id: uuidv4(),
      title: 'Two Sum',
      description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

**Example:**
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].`,
      difficulty: 'easy',
      template: `function twoSum(nums, target) {
  // Your code here
}`,
      test_cases: JSON.stringify([
        { input: 'nums=[2,7,11,15], target=9', expectedOutput: '[0,1]', isHidden: false },
        { input: 'nums=[3,2,4], target=6', expectedOutput: '[1,2]', isHidden: false },
        { input: 'nums=[3,3], target=6', expectedOutput: '[0,1]', isHidden: true },
        { input: 'nums=[1,5,3,7], target=8', expectedOutput: '[1,2]', isHidden: true },
        { input: 'nums=[-1,-2,-3,-4,-5], target=-8', expectedOutput: '[2,4]', isHidden: true },
      ]),
    },
    {
      id: uuidv4(),
      title: 'Reverse String',
      description: `Write a function that reverses a string. The input string is given as an array of characters.

You must do this by modifying the input array in-place with O(1) extra memory.

**Example:**
Input: s = ["h","e","l","l","o"]
Output: ["o","l","l","e","h"]`,
      difficulty: 'easy',
      template: `function reverseString(s) {
  // Your code here
  return s;
}`,
      test_cases: JSON.stringify([
        { input: 's=["h","e","l","l","o"]', expectedOutput: '["o","l","l","e","h"]', isHidden: false },
        { input: 's=["H","a","n","n","a","h"]', expectedOutput: '["h","a","n","n","a","H"]', isHidden: false },
        { input: 's=["a","b","c"]', expectedOutput: '["c","b","a"]', isHidden: true },
        { input: 's=["x"]', expectedOutput: '["x"]', isHidden: true },
        { input: 's=["A","B","C","D","E","F"]', expectedOutput: '["F","E","D","C","B","A"]', isHidden: true },
      ]),
    },
    {
      id: uuidv4(),
      title: 'Fibonacci',
      description: `Given an integer n, return the nth Fibonacci number.

The Fibonacci sequence is defined as:
- F(0) = 0, F(1) = 1
- F(n) = F(n - 1) + F(n - 2), for n > 1.

**Example:**
Input: n = 4
Output: 3
Explanation: F(4) = F(3) + F(2) = 2 + 1 = 3.`,
      difficulty: 'easy',
      template: `function fibonacci(n) {
  // Your code here
}`,
      test_cases: JSON.stringify([
        { input: 'n=0', expectedOutput: '0', isHidden: false },
        { input: 'n=4', expectedOutput: '3', isHidden: false },
        { input: 'n=10', expectedOutput: '55', isHidden: true },
        { input: 'n=1', expectedOutput: '1', isHidden: true },
        { input: 'n=20', expectedOutput: '6765', isHidden: true },
      ]),
    },
    {
      id: uuidv4(),
      title: 'Palindrome Check',
      description: `Given a string s, return true if it is a palindrome, or false otherwise.

A palindrome is a string that reads the same forward and backward. Ignore non-alphanumeric characters and case.

**Example:**
Input: s = "A man, a plan, a canal: Panama"
Output: true`,
      difficulty: 'medium',
      template: `function isPalindrome(s) {
  // Your code here
}`,
      test_cases: JSON.stringify([
        { input: 's="A man, a plan, a canal: Panama"', expectedOutput: 'true', isHidden: false },
        { input: 's="race a car"', expectedOutput: 'false', isHidden: false },
        { input: 's=" "', expectedOutput: 'true', isHidden: true },
        { input: 's="abba"', expectedOutput: 'true', isHidden: true },
        { input: 's="abcdba"', expectedOutput: 'false', isHidden: true },
      ]),
    },
    {
      id: uuidv4(),
      title: 'Maximum Subarray',
      description: `Given an integer array nums, find the subarray with the largest sum, and return its sum.

A subarray is a contiguous non-empty sequence of elements within an array.

**Example:**
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: The subarray [4,-1,2,1] has the largest sum 6.`,
      difficulty: 'medium',
      template: `function maxSubArray(nums) {
  // Your code here
}`,
      test_cases: JSON.stringify([
        { input: 'nums=[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', isHidden: false },
        { input: 'nums=[1]', expectedOutput: '1', isHidden: false },
        { input: 'nums=[5,4,-1,7,8]', expectedOutput: '23', isHidden: true },
        { input: 'nums=[-1]', expectedOutput: '-1', isHidden: true },
        { input: 'nums=[-2,-1]', expectedOutput: '-1', isHidden: true },
      ]),
    },
  ]

  const insertMany = db.transaction((items: typeof problems) => {
    for (const p of items) {
      insertProblem.run(p.id, p.title, p.description, p.difficulty, p.template, p.test_cases)
    }
  })

  insertMany(problems)
  console.log(`Seeded ${problems.length} problems`)
}

export function getRankByElo(elo: number): string {
  if (elo >= 1800) return 'diamond'
  if (elo >= 1400) return 'gold'
  if (elo >= 1000) return 'silver'
  return 'bronze'
}

export function calculateElo(winnerElo: number, loserElo: number): { winnerNew: number; loserNew: number } {
  const K = 32
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400))
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400))
  const winnerNew = Math.round(winnerElo + K * (1 - expectedWinner))
  const loserNew = Math.round(loserElo + K * (0 - expectedLoser))
  return { winnerNew, loserNew }
}

export default db
