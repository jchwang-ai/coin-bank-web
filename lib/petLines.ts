// What the buddy says. Lines are picked at random per situation and get the
// animal's own sound word mixed in now and then ("멍!", "냥~"), so the same
// tap rarely produces the same reaction twice.

export type LineKey =
  | 'tap' | 'pat' | 'hungry' | 'tired' | 'dirty' | 'sad'
  | 'eat' | 'favorite' | 'full'
  | 'bathSoap' | 'bathRinse' | 'bathDry' | 'bathDone' | 'cleanAlready'
  | 'teeth' | 'teethDone'
  | 'brush' | 'brushDone' | 'dress' | 'dye'
  | 'walkStart' | 'walkStep' | 'butterfly' | 'flower' | 'puddle' | 'poop' | 'poopClean' | 'friend' | 'walkDone' | 'tooTired'
  | 'sleepy' | 'notSleepy' | 'dream' | 'wake'
  | 'shopThanks' | 'study' | 'morning' | 'night' | 'welcome';

const LINES: Record<LineKey, string[]> = {
  tap: [
    '안녕! 나 불렀어?',
    '히히 간지러워!',
    '나랑 놀자!',
    '오늘 하루 어땠어?',
    '너랑 있으면 제일 좋아!',
    '뭐 하고 놀까?',
    '나 오늘 멋있지?',
    '우리 산책 갈래?',
    '헤헤, 또 왔구나!',
    '오늘도 최고야!',
  ],
  pat: ['기분 좋아~', '더 쓰다듬어 줘!', '골골골…', '사랑해!', '포근해~', '거기 시원해!'],
  hungry: ['배고파… 밥 줘!', '꼬르륵~ 소리 들려?', '맛있는 거 먹고 싶다!', '부엌에 가볼까?'],
  tired: ['하암… 졸려', '잠깐 자고 싶어…', '눈이 감겨…'],
  dirty: ['몸이 근질근질해…', '목욕하고 싶어!', '나 냄새 나는 것 같아…'],
  sad: ['심심해…', '나랑 놀아줄래?', '조금 외로웠어'],
  eat: ['냠냠! 맛있다!', '와 최고야!', '쩝쩝… 또 줘!', '배가 든든해졌어!', '고마워, 잘 먹을게!'],
  favorite: ['이거 내가 제일 좋아하는 거야!!', '꺄! 최고의 간식이다!', '세상에서 제일 맛있어!'],
  full: ['배불러서 더는 못 먹어~', '배가 빵빵해!', '이따가 먹을래!'],
  bathSoap: ['뽀글뽀글!', '거품 너무 좋아!', '간지러워 히히', '뽀득뽀득~'],
  bathRinse: ['앗 차가워!', '시원하다~', '촤아아~', '물놀이 재밌어!'],
  bathDry: ['보송보송~', '따뜻해!', '부들부들해졌어'],
  bathDone: ['깨끗해졌다!', '나 향기 나지?', '반짝반짝 새것 같아!'],
  cleanAlready: ['나 아직 깨끗해!', '목욕은 나중에 할래~'],
  teeth: ['치카치카!', '아~ 해볼게!', '이가 반짝반짝!'],
  teethDone: ['상쾌해!', '이 닦으니까 좋다!'],
  brush: ['슥슥 시원해~', '거기 좋아!', '털이 부드러워져!', '빗질 최고!'],
  brushDone: ['털이 반짝반짝!', '멋쟁이 됐다!', '나 엄청 예쁘지?'],
  dress: ['어때, 잘 어울려?', '멋지다!', '이거 마음에 들어!'],
  dye: ['우와 새로운 색이야!', '나 완전 달라졌다!', '이 색 좋아!'],
  walkStart: ['산책이다!! 신난다!', '가자 가자!', '오늘은 어디 갈까?'],
  walkStep: ['룰루랄라~', '같이 걸으니까 신나!', '바람이 시원해!', '킁킁, 좋은 냄새!'],
  butterfly: ['저기 나비다!', '나비야 같이 놀자!'],
  flower: ['킁킁… 꽃 냄새 좋다!', '예쁜 꽃이야!'],
  puddle: ['물웅덩이다! 점프!', '첨벙!'],
  poop: ['앗… 응가했어', '부끄러워…'],
  poopClean: ['치워줘서 고마워!', '넌 최고의 보호자야!'],
  friend: ['안녕 친구야!', '같이 놀자!', '반가워!'],
  walkDone: ['산책 재밌었어!', '또 가자!', '최고의 산책이었어!'],
  tooTired: ['너무 졸려서 못 걷겠어…', '먼저 자고 갈래…'],
  sleepy: ['하암… 잘 자', '포근하다…', '꿈에서 만나…'],
  notSleepy: ['아직 안 졸려! 더 놀자!', '잠이 안 와~'],
  dream: ['음냐음냐…', '쿨쿨…', '맛있겠다… 음냐'],
  wake: ['잘 잤다!', '개운해!', '좋은 아침!'],
  shopThanks: ['우와 맛있겠다!', '고마워! 나중에 먹을래!'],
  study: ['일기 쓰면 사과가 생긴대!', '영어 공부하면 쿠키가 생겨!', '보석으로 맛있는 거 사줄래?'],
  morning: ['좋은 아침이야!', '오늘도 같이 놀자!'],
  night: ['밤이 됐어~ 졸려', '오늘도 수고했어!'],
  welcome: ['왔구나! 보고 싶었어!', '기다렸어!', '드디어 왔다!'],
};

/** The animal's own sound word, mixed into lines now and then. */
const CRY: Record<string, string> = {
  chick: '삐약!',
  dog: '멍멍!',
  cat: '야옹~',
  rabbit: '깡총!',
  panda: '뿌잉~',
  fox: '캥!',
  penguin: '꽥꽥!',
  unicorn: '히힝~',
};

const lastPicked = new Map<LineKey, string>();

export function pickLine(key: LineKey, animalId?: string | null): string {
  const options = LINES[key];
  // Avoid repeating the previous line for the same situation.
  let line = options[Math.floor(Math.random() * options.length)];
  if (options.length > 1 && line === lastPicked.get(key)) {
    line = options[(options.indexOf(line) + 1) % options.length];
  }
  lastPicked.set(key, line);
  const cry = animalId ? CRY[animalId] : undefined;
  if (cry && Math.random() < 0.35) line = Math.random() < 0.5 ? `${cry} ${line}` : `${line} ${cry}`;
  return line;
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
