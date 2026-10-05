'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShopItem, SlotId, itemById } from '@/lib/characterShop';
import { CareKind, FoodId, PetState } from '@/lib/petCare';
import { moodLine } from '@/lib/petLines';
import { playPop } from '@/lib/sound';
import { buyFood, doCare, feedPet, setFurHue } from '@/app/diary/petActions';
import { usePetTalk } from './common';
import { SCENES, SceneCtx, SceneId } from './types';
import LivingScene from './LivingScene';
import KitchenScene from './KitchenScene';
import BathScene from './BathScene';
import GroomScene from './GroomScene';
import WalkScene from './WalkScene';
import BedScene from './BedScene';

interface CareRoomProps {
  animalId: string | null;
  emoji: string;
  buddyName: string;
  pet: PetState;
  setPet: (s: PetState) => void;
  gemsLeft: number;
  setGemsLeft: (n: number) => void;
  ownedIds: string[];
  customItems: ShopItem[];
  equipped: Record<string, string>;
  onEquip: (slot: SlotId, itemId: string | null) => Promise<void>;
  onLevelUp: (level: number) => void;
  onClose: () => void;
  initialScene?: SceneId;
}

function Stat({ icon, value, low }: { icon: string; value: number; low: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <span className={`text-[14px] leading-none ${low ? 'animate-bounce' : ''}`}>{icon}</span>
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-black/10">
        <div
          className={`h-full rounded-full transition-all duration-700 ${low ? 'bg-red-400' : 'bg-emerald-400'}`}
          style={{ width: `${Math.round(value)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * 친구 돌보기: a fullscreen "house" with rooms. Each room is a small hands-on
 * activity (feeding, bathing, brushing, walking, bedtime) so looking after
 * the buddy feels like caring for a real pet.
 */
export default function CareRoom(props: CareRoomProps) {
  const { animalId, emoji, buddyName, pet, setPet, gemsLeft, setGemsLeft, onLevelUp, onClose } = props;
  const [scene, setScene] = useState<SceneId>(props.initialScene ?? 'living');
  const [curtain, setCurtain] = useState<{ phase: 'none' | 'closing' | 'opening'; to: SceneId }>({ phase: 'none', to: 'living' });
  const [toastMsg, setToastMsg] = useState('');
  const [poop, setPoop] = useState(() => pet.today.fed && Math.random() < 0.5);
  const [size, setSize] = useState(170);
  const { talk, say } = usePetTalk(animalId);

  useEffect(() => {
    const fit = () => setSize(Math.round(Math.min(window.innerWidth * 0.46, window.innerHeight * 0.26, 230)));
    fit();
    window.addEventListener('resize', fit);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('resize', fit);
      document.body.style.overflow = prev;
    };
  }, []);

  // Greet on arrival with whatever is on its mind.
  useEffect(() => {
    const t = setTimeout(() => say(moodLine(pet), pet.happiness > 60 ? 'happy' : 'normal'), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2600);
  }, []);

  const go = useCallback(
    (next: SceneId) => {
      if (next === scene || curtain.phase !== 'none') return;
      playPop();
      setCurtain({ phase: 'closing', to: next });
      setTimeout(() => {
        setScene(next);
        setCurtain({ phase: 'opening', to: next });
      }, 420);
      setTimeout(() => setCurtain({ phase: 'none', to: next }), 900);
    },
    [scene, curtain.phase]
  );

  const care = useCallback(
    async (kind: CareKind) => {
      try {
        const res = await doCare(kind);
        setPet(res.state);
        if (res.levelUpTo) setTimeout(() => onLevelUp(res.levelUpTo!), 1800);
        return { state: res.state, xpGained: res.xpGained, found: res.found };
      } catch (err) {
        say({ text: err instanceof Error ? err.message : '잠깐 문제가 생겼어요', raw: true }, 'sad');
        return null;
      }
    },
    [setPet, onLevelUp, say]
  );

  const feed = useCallback(
    async (foodId: FoodId) => {
      try {
        const res = await feedPet(foodId);
        setPet(res.state);
        if (res.levelUpTo) setTimeout(() => onLevelUp(res.levelUpTo!), 2200);
        // What goes in must come out — sometimes. Real pets!
        if (Math.random() < 0.4) setTimeout(() => setPoop(true), 9000);
        return { favorite: res.favorite };
      } catch (err) {
        say({ text: err instanceof Error ? err.message : '먹이를 주지 못했어요', raw: true }, 'sad');
        return null;
      }
    },
    [setPet, onLevelUp, say]
  );

  const buy = useCallback(
    async (foodId: FoodId, qty: number) => {
      try {
        const res = await buyFood(foodId, qty);
        setPet(res.state);
        setGemsLeft(res.gemsLeft);
        return true;
      } catch (err) {
        toast(err instanceof Error ? err.message : '사지 못했어요');
        return false;
      }
    },
    [setPet, setGemsLeft, toast]
  );

  const setHue = useCallback(
    async (hue: number) => {
      setPet({ ...pet, furHue: hue });
      try {
        await setFurHue(hue);
      } catch {
        toast('색을 저장하지 못했어요');
      }
    },
    [pet, setPet, toast]
  );

  const resolve = (id?: string) => (id ? itemById(id) || props.customItems.find((c) => c.id === id) : undefined);
  const accessories = useMemo(() => {
    const pick = (slot: string) => {
      const it = resolve(props.equipped[slot]);
      return it && !it.motion ? it.emoji : undefined;
    };
    return { hat: pick('hat'), face: pick('face'), held: pick('held') };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.equipped, props.customItems]);

  const dressItems = useMemo(
    () =>
      props.ownedIds
        .map((id) => resolve(id))
        .filter((i): i is ShopItem => !!i && (i.slot === 'hat' || i.slot === 'face' || i.slot === 'held') && !i.motion),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.ownedIds, props.customItems]
  );

  const ctx: SceneCtx = {
    animalId,
    emoji,
    buddyName,
    pet,
    size,
    accessories,
    say,
    care,
    feed,
    buy,
    setHue,
    gemsLeft,
    go,
    poop,
    setPoop,
    dressItems,
    equipped: props.equipped,
    onEquip: props.onEquip,
    toast,
  };

  const sceneEl = {
    living: <LivingScene ctx={ctx} talk={talk} />,
    kitchen: <KitchenScene ctx={ctx} talk={talk} />,
    bath: <BathScene ctx={ctx} talk={talk} />,
    groom: <GroomScene ctx={ctx} talk={talk} />,
    walk: <WalkScene ctx={ctx} talk={talk} />,
    bed: <BedScene ctx={ctx} talk={talk} />,
  }[scene];

  const curtainScene = SCENES.find((s) => s.id === curtain.to);

  return createPortal(
    <div className="fixed inset-0 z-[85] flex flex-col bg-[#1c1c1e] select-none">
      {/* Status bar */}
      <div className="safe-top shrink-0 bg-white/95 px-3 pb-2 pt-2 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-[16px] font-bold text-[#1c1c1e] active:scale-90"
            aria-label="닫기"
          >
            ✕
          </button>
          <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#1c1c1e]">
            {emoji} {buddyName} 돌보기
          </p>
          <span className="shrink-0 rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 px-2.5 py-1 text-[12px] font-bold text-white">
            💎 {gemsLeft}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <Stat icon="🍚" value={pet.fullness} low={pet.fullness < 30} />
          <Stat icon="😊" value={pet.happiness} low={pet.happiness < 30} />
          <Stat icon="🧼" value={pet.clean} low={pet.clean < 35} />
          <Stat icon="⚡" value={pet.energy} low={pet.energy < 25} />
        </div>
      </div>

      {/* Scene */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {sceneEl}

        {curtain.phase !== 'none' && (
          <div className={`care-curtain ${curtain.phase === 'closing' ? 'care-curtain-in' : 'care-curtain-out'}`}>
            <span className="text-6xl">{curtainScene?.emoji}</span>
            <span className="mt-2 text-[18px] font-bold text-white">{curtainScene?.label}</span>
          </div>
        )}

        {toastMsg && (
          <div className="animate-pop-in absolute inset-x-6 top-3 z-[60] rounded-2xl bg-[#1c1c1e]/85 px-4 py-2.5 text-center text-[13px] font-semibold text-white">
            {toastMsg}
          </div>
        )}
      </div>

      {/* Rooms */}
      <nav className="safe-bottom shrink-0 bg-white px-2 pt-1.5">
        <div className="mx-auto flex max-w-lg">
          {SCENES.map((s) => {
            const active = s.id === scene;
            const todo =
              (s.id === 'kitchen' && !pet.today.fed) ||
              (s.id === 'bath' && pet.clean < 35) ||
              (s.id === 'walk' && !pet.today.walk) ||
              (s.id === 'bed' && pet.energy < 25) ||
              (s.id === 'living' && poop);
            return (
              <button
                key={s.id}
                onClick={() => go(s.id)}
                className={`relative flex flex-1 flex-col items-center rounded-2xl py-1.5 transition-all active:scale-90 ${
                  active ? 'bg-violet-100' : ''
                }`}
              >
                <span className={`text-[22px] leading-none ${active ? '' : 'opacity-70'}`}>{s.emoji}</span>
                <span className={`mt-0.5 text-[10px] font-bold ${active ? 'text-violet-600' : 'text-[#8e8e93]'}`}>
                  {s.label}
                </span>
                {todo && <span className="absolute right-2 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>,
    document.body
  );
}
