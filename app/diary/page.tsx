'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import EmojiBurst from '@/components/EmojiBurst';
import DiaryCalendar, { DiaryMark } from '@/components/DiaryCalendar';
import DiaryBuddy from '@/components/DiaryBuddy';
import BuddyPickerSheet from '@/components/BuddyPickerSheet';
import CharacterStage from '@/components/CharacterStage';
import CharacterShopSheet from '@/components/CharacterShopSheet';
import MyCollectionSheet from '@/components/MyCollectionSheet';
import ItemWishSheet from '@/components/ItemWishSheet';
import ItemRevealOverlay from '@/components/ItemRevealOverlay';
import { useUnlockAudio } from '@/hooks/useUnlockAudio';
import { playChime, playPop, playSparkle } from '@/lib/sound';
import { formatCardDate, isToday, moodOf, todayKey } from '@/lib/diary';
import { ShopItem, SlotId } from '@/lib/characterShop';
import { getDiaryOverview, setDiaryPet, DiaryListItem } from './actions';
import {
  getShopState,
  buyItem,
  equipItem,
  createCustomItem,
  deleteCustomItem,
  CustomItem,
} from './shopActions';

export default function DiaryPage() {
  const router = useRouter();
  useUnlockAudio();

  const [recent, setRecent] = useState<DiaryListItem[]>([]);
  const [marks, setMarks] = useState<Record<string, DiaryMark>>({});
  const [monthCount, setMonthCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [toast, setToast] = useState('');
  const [burst, setBurst] = useState(0);
  const [petAnimal, setPetAnimal] = useState<string | null>(null);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // 캐릭터 상점
  const [gemsEarned, setGemsEarned] = useState(0);
  const [gemsSpent, setGemsSpent] = useState(0);
  const [gemsLeft, setGemsLeft] = useState(0);
  const [vocabConnected, setVocabConnected] = useState(true);
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [equipped, setEquipped] = useState<Record<string, string>>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [shopOpen, setShopOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  const [reveal, setReveal] = useState<{ item: ShopItem; wasHidden: boolean } | null>(null);

  const refreshShop = async () => {
    const s = await getShopState();
    setGemsEarned(s.gemsEarned);
    setGemsSpent(s.gemsSpent);
    setGemsLeft(s.gemsLeft);
    setVocabConnected(s.vocabConnected);
    setOwnedIds(s.ownedIds);
    setEquipped(s.equipped);
    setCustomItems(s.customItems);
  };

  useEffect(() => {
    let cancelled = false;

    // Shop state loads alongside the diary; a vocab-DB hiccup must not stop
    // the diary from rendering, so it has its own catch.
    getShopState()
      .then((s) => {
        if (cancelled) return;
        setGemsEarned(s.gemsEarned);
        setGemsSpent(s.gemsSpent);
        setGemsLeft(s.gemsLeft);
        setVocabConnected(s.vocabConnected);
        setOwnedIds(s.ownedIds);
        setEquipped(s.equipped);
        setCustomItems(s.customItems);
      })
      .catch((err) => console.error('Shop state load failed:', err));

    getDiaryOverview()
      .then((data) => {
        if (cancelled) return;
        setRecent(data.recent);
        setMarks(data.marks);
        setMonthCount(data.monthCount);
        setStreak(data.streak);
        setPetAnimal(data.petAnimal);
        setTotalCompleted(data.totalCompleted);
        // Small welcome-back celebration when today is already done.
        const today = todayKey();
        if (data.recent.some((d) => d.diary_date === today && d.status === 'completed')) {
          setBurst((b) => b + 1);
        }
      })
      .catch((err) => {
        console.error(err);
        // Show a persistent banner, not just a toast — a failed load used to
        // look identical to "no diaries yet", which hid the real problem.
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = todayKey();
  const todayDiary = recent.find((d) => d.diary_date === today);

  const todayLabel = !todayDiary
    ? '오늘 일기 쓰기'
    : todayDiary.status === 'completed'
      ? '오늘 일기 보기'
      : '오늘 일기 이어쓰기';

  const openDate = (dateKey: string) => {
    playPop();
    router.push(`/diary/${dateKey}`);
  };

  const handlePickBuddy = async (animalId: string) => {
    await setDiaryPet(animalId);
    setPetAnimal(animalId);
    setPickerOpen(false);
    playChime();
    setBurst((b) => b + 1);
    setToast('새 친구가 생겼어요! 🌱');
  };

  const handleBuy = async (item: ShopItem) => {
    const wasHidden = !!item.hidden;
    await buyItem(item.id);
    playSparkle();
    setReveal({ item, wasHidden });
    await refreshShop();
  };

  const handleEquip = async (slot: SlotId, itemId: string | null) => {
    await equipItem(slot, itemId);
    // Optimistic so the character updates the instant it's tapped.
    setEquipped((prev) => {
      const next = { ...prev };
      if (itemId === null) delete next[slot];
      else next[slot] = itemId;
      return next;
    });
  };

  const handleCreateItem = async (name: string, note: string) => {
    const res = await createCustomItem(name, note);
    playChime();
    setToast(`'${res.item.name}' 아이템이 상점에 생겼어요! ✨`);
    await refreshShop();
  };

  const handleDeleteCustomItem = async (rowId: string) => {
    await deleteCustomItem(rowId);
    setToast('아이템을 지웠어요');
    await refreshShop();
  };

  if (isLoading) {
    return <div className="pt-24 text-center text-[#8e8e93]">불러오는 중...</div>;
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="mx-auto w-full max-w-lg px-5 pt-6 safe-top">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[24px] font-bold leading-tight text-[#1c1c1e]">튼튼일기 🌱</p>
            <p className="mt-1 text-[13px] text-[#8e8e93]">오늘 있었던 일을 기록해보세요.</p>
          </div>
          <button
            onClick={() => router.push('/child')}
            className="shrink-0 rounded-full bg-black/5 px-3 py-1.5 text-[13px] font-medium text-[#8e8e93] transition-colors active:bg-black/10"
          >
            돌아가기
          </button>
        </div>

        {loadError && (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3.5 text-center">
            <p className="text-[14px] font-bold text-red-500">일기를 불러오지 못했어요</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 rounded-lg bg-red-500 px-4 py-2 text-[13px] font-bold text-white active:scale-95"
            >
              다시 시도하기
            </button>
          </div>
        )}

        {/* Dressed-up character stage (only once a friend is chosen) */}
        {petAnimal && (
          <div className="mb-3">
            <CharacterStage
              baseAnimalId={petAnimal}
              equipped={equipped}
              completedCount={totalCompleted}
              customItems={customItems}
            />

            {/* Gems + shop entry points */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 items-center justify-between rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-400 px-3.5 py-2.5 shadow-sm">
                <span className="text-[12px] font-semibold text-white/85">내 보석</span>
                <span className="text-[17px] font-bold text-white">💎 {gemsLeft}</span>
              </div>
              <button
                onClick={() => {
                  playPop();
                  setShopOpen(true);
                }}
                className="rounded-2xl bg-[#1c1c1e] px-4 py-2.5 text-[13px] font-bold text-white transition-transform active:scale-95"
              >
                🛍️ 상점
              </button>
              <button
                onClick={() => {
                  playPop();
                  setCollectionOpen(true);
                }}
                className="rounded-2xl bg-black/[0.06] px-4 py-2.5 text-[13px] font-bold text-[#1c1c1e] transition-transform active:scale-95"
              >
                🎒 내 것
              </button>
            </div>

            {!vocabConnected && (
              <p className="mt-1.5 px-1 text-[11px] text-amber-600">
                💎 보석을 불러오지 못했어요 — 영어 단어 앱과 연결을 확인해주세요
              </p>
            )}
            {vocabConnected && (
              <p className="mt-1.5 px-1 text-[11px] text-[#8e8e93]">
                💎 보석은 영어 단어를 공부하면 모여요 (모은 보석 {gemsEarned}개)
              </p>
            )}
          </div>
        )}

        {/* Growing buddy — the main motivation hook */}
        <DiaryBuddy
          animalId={petAnimal}
          completedCount={totalCompleted}
          onPick={() => {
            playPop();
            setPickerOpen(true);
          }}
        />

        {/* Streak + this month */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-[12px] font-medium text-[#8e8e93]">연속 기록</p>
            <p className="mt-0.5 text-[19px] font-bold text-[#1c1c1e]">
              {streak > 0 ? `🔥 ${streak}일 연속!` : '🌱 시작해봐요'}
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-[12px] font-medium text-[#8e8e93]">이번 달</p>
            <p className="mt-0.5 text-[19px] font-bold text-[#1c1c1e]">{monthCount}일 기록 🌱</p>
          </div>
        </div>

        {/* Today's diary — the main call to action */}
        <div className="relative mb-4">
          <button
            onClick={() => openDate(today)}
            className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-400 to-sky-400 p-6 text-left shadow-lg shadow-teal-500/20 transition-transform active:scale-[0.98]"
          >
            <div className="absolute -right-6 -top-8 text-8xl opacity-20">📔</div>
            <p className="relative text-[13px] font-medium text-white/80">{formatCardDate(today)}</p>
            <p className="relative mt-1 text-[26px] font-bold leading-tight text-white">{todayLabel}</p>
            <p className="relative mt-1 text-[12px] font-medium text-white/70">
              {todayDiary?.status === 'completed' ? '오늘 기록 완료! 잘했어요 🎉' : '눌러서 시작하기 →'}
            </p>
          </button>
          <EmojiBurst trigger={burst} emojis={['🌱', '✨', '📔']} />
        </div>

        {/* View toggle */}
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-black/[0.04] p-1">
          {(['list', 'calendar'] as const).map((v) => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                playPop();
              }}
              className={`rounded-xl py-2.5 text-[14px] font-bold transition-all ${
                view === v ? 'bg-white text-[#1c1c1e] shadow-sm' : 'text-[#8e8e93]'
              }`}
            >
              {v === 'list' ? '📋 목록' : '📅 달력'}
            </button>
          ))}
        </div>

        {view === 'calendar' ? (
          <DiaryCalendar marks={marks} onSelectDate={openDate} />
        ) : recent.length === 0 ? (
          <div className="rounded-2xl border border-black/5 bg-white py-14 text-center shadow-sm">
            <p className="text-4xl">🌱</p>
            <p className="mt-3 text-[15px] font-semibold text-[#1c1c1e]">아직 일기가 없어요</p>
            <p className="mt-1 text-[13px] text-[#8e8e93]">오늘 첫 일기를 써볼까요?</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recent.map((d, idx) => {
              const mood = moodOf(d.mood);
              const preview = (d.content || '').trim().replace(/\s+/g, ' ');
              return (
                <button
                  key={d.id}
                  onClick={() => openDate(d.diary_date)}
                  style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                  className="animate-sprout flex w-full gap-3 rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-[#8e8e93]">
                      <span>{formatCardDate(d.diary_date)}</span>
                      {mood && <span className="text-[15px] leading-none">{mood.emoji}</span>}
                      {isToday(d.diary_date) && (
                        <span className="rounded-full bg-pink-100 px-1.5 py-0.5 text-[10px] font-bold text-pink-600">
                          오늘
                        </span>
                      )}
                    </p>
                    <p className="mt-1 truncate text-[16px] font-bold text-[#1c1c1e]">
                      {d.title?.trim() || '(제목 없음)'}
                    </p>
                    {preview && (
                      <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#8e8e93]">{preview}</p>
                    )}
                    <p className="mt-1.5 text-[11px] font-semibold">
                      {d.status === 'completed' ? (
                        <span className="text-emerald-600">✅ 완성</span>
                      ) : (
                        <span className="text-amber-600">✏️ 쓰는 중</span>
                      )}
                      {d.image_count > 0 && (
                        <span className="ml-1.5 text-[#8e8e93]">📷 {d.image_count}</span>
                      )}
                    </p>
                  </div>

                  {d.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.thumbnail}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-xl border border-black/5 object-cover"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {pickerOpen && (
        <BuddyPickerSheet
          current={petAnimal}
          onClose={() => setPickerOpen(false)}
          onSelect={handlePickBuddy}
        />
      )}

      {shopOpen && (
        <CharacterShopSheet
          gemsLeft={gemsLeft}
          ownedIds={ownedIds}
          equipped={equipped}
          customItems={customItems}
          onClose={() => setShopOpen(false)}
          onBuy={handleBuy}
          onEquip={handleEquip}
          onDeleteCustom={handleDeleteCustomItem}
          onOpenWishes={() => setWishOpen(true)}
        />
      )}

      {collectionOpen && (
        <MyCollectionSheet
          ownedIds={ownedIds}
          equipped={equipped}
          gemsEarned={gemsEarned}
          gemsSpent={gemsSpent}
          onClose={() => setCollectionOpen(false)}
          onEquip={handleEquip}
        />
      )}

      {wishOpen && (
        <ItemWishSheet
          items={customItems}
          onClose={() => setWishOpen(false)}
          onSubmit={handleCreateItem}
          onDelete={handleDeleteCustomItem}
        />
      )}

      {reveal && (
        <ItemRevealOverlay
          item={reveal.item}
          wasHidden={reveal.wasHidden}
          onDone={() => setReveal(null)}
        />
      )}

      <Toast message={toast} visible={!!toast} onClose={() => setToast('')} />
    </div>
  );
}
