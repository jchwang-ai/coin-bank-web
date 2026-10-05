// What the buddy "says" — shown as subtitles only (the sound is the animal's
// real cry). Lines are short and simple, then dressed in each animal's own
// speech style: a puppy ends with "멍!", a kitten with "냥~", a chick with
// "삐약!"… and now and then it just cries its own sound. Picked at random per
// situation, so the same tap rarely reads the same twice.

export type LineKey =
  | 'tap' | 'pat' | 'hungry' | 'tired' | 'dirty' | 'sad'
  | 'eat' | 'favorite' | 'full'
  | 'bathSoap' | 'bathRinse' | 'bathDry' | 'bathDone' | 'cleanAlready'
  | 'teeth' | 'teethDone'
  | 'brush' | 'brushDone' | 'dress' | 'dye'
  | 'walkStart' | 'walkStep' | 'butterfly' | 'flower' | 'puddle' | 'poop' | 'poopClean' | 'friend' | 'walkDone' | 'tooTired'
  | 'sleepy' | 'notSleepy' | 'dream' | 'wake'
  | 'shopThanks' | 'study' | 'morning' | 'night' | 'welcome'
  | 'quizRight' | 'quizWrong' | 'quizStart' | 'friendHi';

const LINES: Record<LineKey, string[]> = {
  tap: ['안녕!', '헤헤 간지러워!', '나랑 놀자!', '보고 싶었어!', '너 최고야!', '뭐 하고 놀까?', '나 귀엽지?', '산책 갈래?', '또 왔구나!', '같이 있자!'],
  pat: ['좋아~', '더 쓰다듬어줘!', '포근해~', '사랑해!', '기분 최고!', '거기 시원해~'],
  hungry: ['배고파…', '밥 줘!', '꼬르륵~', '맛있는 거 먹고 싶어!'],
  tired: ['졸려…', '하암~', '코 자고 싶어…'],
  dirty: ['근질근질해…', '목욕하고 싶어!', '꼬질꼬질해…'],
  sad: ['심심해…', '놀아줘~', '외로웠어…'],
  eat: ['냠냠!', '맛있어!', '쩝쩝~ 또 줘!', '배불러~', '고마워!'],
  favorite: ['이거 제일 좋아!!', '꺄! 최고야!', '세상에서 제일 맛있어!'],
  full: ['배 빵빵해~', '이따 먹을래!', '더는 못 먹어~'],
  bathSoap: ['뽀글뽀글!', '거품 좋아!', '간지러워~', '뽀득뽀득!'],
  bathRinse: ['앗 차가워!', '시원해~', '촤아아~', '물놀이 좋아!'],
  bathDry: ['보송보송~', '따뜻해!', '부들부들~'],
  bathDone: ['깨끗해졌다!', '좋은 냄새 나지?', '반짝반짝!'],
  cleanAlready: ['나 아직 깨끗해!', '목욕은 나중에~'],
  teeth: ['치카치카!', '아~!', '이가 반짝!'],
  teethDone: ['상쾌해!', '이 닦았다!'],
  brush: ['슥슥 좋아~', '시원해!', '털이 부드러워!', '빗질 최고!'],
  brushDone: ['털 반짝반짝!', '멋쟁이 됐다!', '나 예쁘지?'],
  dress: ['잘 어울려?', '멋지다!', '이거 좋아!'],
  dye: ['우와 새 색깔!', '나 달라졌어!', '이 색 좋아!'],
  walkStart: ['산책이다!!', '가자 가자!', '신난다!'],
  walkStep: ['룰루랄라~', '같이 걸으니까 좋아!', '바람 시원해!', '킁킁~'],
  butterfly: ['나비다!', '나비야 놀자!'],
  flower: ['꽃 냄새 좋아~', '예쁜 꽃이야!'],
  puddle: ['점프!', '첨벙!'],
  poop: ['앗… 응가했어', '부끄러워…'],
  poopClean: ['치워줘서 고마워!', '최고의 보호자야!'],
  friend: ['안녕 친구야!', '같이 놀자!', '반가워!'],
  walkDone: ['산책 재밌었어!', '또 가자!', '최고였어!'],
  tooTired: ['너무 졸려…', '코 자고 갈래…'],
  sleepy: ['잘 자…', '포근해…', '꿈에서 만나…'],
  notSleepy: ['안 졸려! 놀자!', '잠이 안 와~'],
  dream: ['음냐음냐…', '쿨쿨…', '맛있겠다… 음냐'],
  wake: ['잘 잤다!', '개운해!', '좋은 아침!'],
  shopThanks: ['우와 맛있겠다!', '고마워!'],
  study: ['일기 쓰면 사과 생긴대!', '영어 공부하면 쿠키 생겨!', '보석으로 간식 사줄래?'],
  morning: ['좋은 아침!', '오늘도 놀자!'],
  night: ['밤이야~ 졸려', '오늘도 수고했어!'],
  welcome: ['왔구나!', '기다렸어!', '드디어 왔다!'],
  quizRight: ['정답이야!', '우와 천재다!', '최고야!', '맞았어! 대단해!', '역시 너야!'],
  quizWrong: ['괜찮아, 다시 해보자!', '아깝다~', '다음엔 맞힐 수 있어!', '천천히 생각해봐~'],
  quizStart: ['같이 공부하자!', '문제 풀면 놀 수 있어!', '내가 응원할게!'],
  friendHi: ['안녕!', '나도 놀아줘!', '헤헤 반가워!', '나 불렀어?'],
};

interface SpeechStyle {
  /** Added to the end of the last sentence: 놀자 → 놀자멍. */
  tail: string;
  /** The animal's own sound, sometimes said instead of / before a line. */
  cries: string[];
  /** Little emoji sprinkled on now and then. */
  deco: string[];
}

const STYLES: Record<string, SpeechStyle> = {
  chick: { tail: '삐약', cries: ['삐약삐약!', '삐약?', '삐이약~!'], deco: ['🐥', '💛'] },
  dog: { tail: '멍', cries: ['멍멍!', '왈왈!', '멍?', '끼잉~'], deco: ['🐾', '🦴'] },
  cat: { tail: '냥', cries: ['냐옹~', '냥냥!', '냐아앙~', '골골골…'], deco: ['🐾', '💕'] },
  rabbit: { tail: '토끼', cries: ['킁킁!', '깡총깡총!', '쫑긋!'], deco: ['🥕', '🌸'] },
  panda: { tail: '판다', cries: ['뿌잉뿌잉~', '음냐!', '데굴데굴~'], deco: ['🎋', '🐾'] },
  fox: { tail: '캥', cries: ['캥캥!', '캐앵~', '꼬리 살랑~'], deco: ['🍂', '✨'] },
  penguin: { tail: '펭', cries: ['꽥꽥!', '뒤뚱뒤뚱~', '펭펭!'], deco: ['🐟', '❄️'] },
  unicorn: { tail: '히힝', cries: ['히히힝~', '다그닥!', '반짝반짝~'], deco: ['🌈', '✨'] },
};

/**
 * Dresses a plain line in the animal's speech style: the tail goes on the
 * last sentence ("놀자!" → "놀자멍!"), sometimes the cry comes first, and
 * sometimes a little emoji.
 */
export function animalize(line: string, animalId?: string | null): string {
  const style = animalId ? STYLES[animalId] : undefined;
  if (!style) return line;

  // Insert the tail before the final punctuation of the last Hangul word.
  let out = line;
  const m = out.match(/([가-힣])([!?~…]*)\s*$/);
  if (m && m.index !== undefined && !out.endsWith(style.tail)) {
    out = out.slice(0, m.index + 1) + style.tail + (m[2] || '!') + out.slice(m.index + m[0].length);
  }
  if (Math.random() < 0.18) out = `${style.cries[Math.floor(Math.random() * style.cries.length)]} ${out}`;
  if (Math.random() < 0.25) out = `${out} ${style.deco[Math.floor(Math.random() * style.deco.length)]}`;
  return out;
}

const lastPicked = new Map<LineKey, string>();

export function pickLine(key: LineKey, animalId?: string | null): string {
  const style = animalId ? STYLES[animalId] : undefined;
  // Happy little moments are sometimes just the animal's own cry.
  if (style && (key === 'tap' || key === 'pat') && Math.random() < 0.2) {
    return style.cries[Math.floor(Math.random() * style.cries.length)];
  }
  const options = LINES[key];
  let line = options[Math.floor(Math.random() * options.length)];
  if (options.length > 1 && line === lastPicked.get(key)) {
    line = options[(options.indexOf(line) + 1) % options.length];
  }
  lastPicked.set(key, line);
  return animalize(line, animalId);
}

/** What the buddy brings up on its own, based on how it's doing. */
export function moodLine(s: { fullness: number; clean: number; energy: number; happiness: number }): LineKey {
  if (s.fullness < 30) return 'hungry';
  if (s.energy < 25) return 'tired';
  if (s.clean < 35) return 'dirty';
  if (s.happiness < 30) return 'sad';
  const h = new Date().getHours();
  if (h >= 21 || h < 6) return 'night';
  if (h < 10) return 'morning';
  return Math.random() < 0.3 ? 'study' : 'welcome';
}
