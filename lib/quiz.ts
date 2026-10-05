// Care-room study questions. Generated on the server; the answer is stored
// there and never sent to the client, so points can only come from actually
// solving them.
//
// English uses the child's real wordbooks (lib/vocabWords.ts). Maths is
// grade 3–4 arithmetic typed on a keypad (no guessing). Both have five
// levels; the server moves the level up after a streak of right answers and
// down after misses, so it stays "a little hard" instead of boring.

import { QUIZ_WORDS } from './vocabWords';

export type QuizSubject = 'english' | 'math';

export interface QuizDraft {
  subject: QuizSubject;
  level: number;
  /** Main line, e.g. "wildlife habitat" or "23 + 48 = ?". */
  prompt: string;
  /** Instruction line above it. */
  ask: string;
  /** Multiple choice options (English); absent → type a number (maths). */
  choices?: string[];
  /** For English, the part of the prompt to highlight. */
  highlight?: string;
  answer: string;
  /** Shown after answering so a miss still teaches something. */
  explain: string;
}

const rint = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeMath(level: number): QuizDraft {
  let a: number, b: number, op: string, ans: number;
  const kind = rint(0, 1);
  switch (Math.max(1, Math.min(5, level))) {
    case 1:
      if (kind) {
        a = rint(11, 40); b = rint(2, 9); op = '+'; ans = a + b;
      } else {
        a = rint(12, 30); b = rint(2, 9); op = '-'; ans = a - b;
      }
      break;
    case 2:
      if (kind) {
        a = rint(15, 69); b = rint(15, 29); op = '+'; ans = a + b;
      } else {
        a = rint(2, 5); b = rint(2, 9); op = '×'; ans = a * b;
      }
      break;
    case 3:
      if (kind) {
        a = rint(3, 9); b = rint(3, 9); op = '×'; ans = a * b;
      } else {
        a = rint(120, 480); b = rint(15, 89); op = '-'; ans = a - b;
      }
      break;
    case 4:
      if (kind) {
        a = rint(12, 49); b = rint(2, 6); op = '×'; ans = a * b;
      } else {
        b = rint(3, 9); ans = rint(4, 12); a = b * ans; op = '÷';
      }
      break;
    default:
      if (kind) {
        a = rint(11, 25); b = rint(11, 19); op = '×'; ans = a * b;
      } else {
        b = rint(3, 9); ans = rint(12, 32); a = b * ans; op = '÷';
      }
  }
  return {
    subject: 'math',
    level,
    ask: '계산해서 답을 눌러요',
    prompt: `${a} ${op} ${b} = ?`,
    answer: String(ans),
    explain: `${a} ${op} ${b} = ${ans}`,
  };
}

export function makeEnglish(level: number): QuizDraft {
  const w = QUIZ_WORDS[Math.floor(Math.random() * QUIZ_WORDS.length)];
  const others = shuffle(QUIZ_WORDS.filter((x) => x.target !== w.target && x.korean !== w.korean)).slice(0, 3);

  if (level <= 2) {
    // See the English phrase → pick its meaning.
    return {
      subject: 'english',
      level,
      ask: '뜻을 골라요',
      prompt: w.full,
      highlight: w.target,
      choices: shuffle([w.korean, ...others.map((o) => o.korean)]),
      answer: w.korean,
      explain: `${w.full} = ${w.korean}`,
    };
  }
  // See the meaning + phrase with a blank → pick the missing word.
  const blank = w.full.replace(new RegExp(w.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '_____');
  if (blank === w.full) return makeEnglish(1);
  return {
    subject: 'english',
    level,
    ask: `"${w.korean}" — 빈칸에 들어갈 단어는?`,
    prompt: blank,
    choices: shuffle([w.target, ...others.map((o) => o.target)]),
    answer: w.target,
    explain: `${w.full} = ${w.korean}`,
  };
}

export function normalizeAnswer(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}
