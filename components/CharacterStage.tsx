'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Motion, ShopItem, itemById } from '@/lib/characterShop';
import { animalOf, computeGrowth } from '@/lib/diaryPet';
import { playPop } from '@/lib/sound';

interface CharacterStageProps {
  /** The free buddy animal picked in BuddyPickerSheet. */
  baseAnimalId: string | null;
  equipped: Record<string, string>;
  completedCount: number;
  /** Child-made items, needed to resolve `custom:` ids. */
  customItems?: ShopItem[];
  size?: 'normal' | 'large';
}

/** Little reactions the character shows when tapped or idling. */
const EMOTES = ['💕', '🎵', '😆', '✨', '❗', '💫', '🥰'];

export default function CharacterStage({
  baseAnimalId,
  equipped,
  completedCount,
  customItems = [],
  size = 'normal',
}: CharacterStageProps) {
  const growth = computeGrowth(completedCount);
  const isEgg = growth.stage.level === 1;

  // Resolve ids against both the code catalog and the child's own items.
  const resolve = useCallback(
    (id: string | undefined) => (id ? itemById(id) || customItems.find((c) => c.id === id) : undefined),
    [customItems]
  );

  const boughtCharacter = resolve(equipped.character);
  const animal = animalOf(baseAnimalId);
  const hat = resolve(equipped.hat);
  const face = resolve(equipped.face);
  const held = resolve(equipped.held);
  const background = resolve(equipped.background);
  const effect = resolve(equipped.effect);
  const companion = resolve(equipped.companion);

  const bodyEmoji = isEgg ? '🥚' : boughtCharacter?.emoji || animal?.emoji || '🐣';
  const bodySize = size === 'large' ? growth.stage.size * 1.25 : growth.stage.size;
  const bgGradient =
    background?.gradient || (animal?.gradient ?? 'from-violet-200 via-purple-200 to-pink-200');
  const stageHeight = size === 'large' ? 240 : 190;

  // ── Reactions ──────────────────────────────────────────────────────────
  const [tapKey, setTapKey] = useState(0);
  const [wiggleKey, setWiggleKey] = useState(0);
  const [emote, setEmote] = useState<{ key: number; char: string } | null>(null);
  const [spun, setSpun] = useState<{ key: number; id: string } | null>(null);
  const emoteSeq = useRef(0);

  const showEmote = useCallback(() => {
    emoteSeq.current += 1;
    setEmote({ key: emoteSeq.current, char: EMOTES[Math.floor(Math.random() * EMOTES.length)] });
  }, []);

  const handleTapCharacter = () => {
    setTapKey((k) => k + 1);
    showEmote();
    playPop();
  };

  const handleTapRoamer = (id: string) => {
    setSpun({ key: Date.now(), id });
    showEmote();
    playPop();
  };

  // Idle life: wiggle + emote every few seconds so it never looks frozen.
  useEffect(() => {
    if (isEgg) return;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      // 4–9s apart so it feels spontaneous rather than metronomic.
      timer = setTimeout(() => {
        setWiggleKey((k) => k + 1);
        if (Math.random() < 0.55) showEmote();
        schedule();
      }, 4000 + Math.random() * 5000);
    };

    schedule();
    return () => clearTimeout(timer);
  }, [isEgg, showEmote]);

  /** Renders one free-roaming item with the motion its catalog entry asked for. */
  const renderRoamer = (item: ShopItem, motion: Motion, index: number) => {
    const isSpinning = spun?.id === item.id;
    const spinClass = isSpinning ? 'animate-tap-spin' : '';

    if (motion === 'orbit') {
      return (
        <div
          key={item.id}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="animate-orbit-spin" style={{ width: bodySize * 2.1, height: bodySize * 2.1 }}>
            <button
              onClick={() => handleTapRoamer(item.id)}
              className="pointer-events-auto absolute left-1/2 top-0 -translate-x-1/2"
              aria-label={item.name}
            >
              <span
                key={spun?.key}
                className={`animate-orbit-upright inline-block text-2xl leading-none drop-shadow ${spinClass}`}
              >
                {item.emoji}
              </span>
            </button>
          </div>
        </div>
      );
    }

    if (motion === 'hop') {
      return (
        <button
          key={item.id}
          onClick={() => handleTapRoamer(item.id)}
          className="animate-hop-along absolute bottom-4 left-5 leading-none"
          style={{ animationDelay: `${index * 1.3}s` }}
          aria-label={item.name}
        >
          <span key={spun?.key} className={`inline-block text-2xl drop-shadow ${spinClass}`}>
            {item.emoji}
          </span>
        </button>
      );
    }

    // 'fly' — wander the whole stage, flapping as it goes.
    return (
      <button
        key={item.id}
        onClick={() => handleTapRoamer(item.id)}
        className="animate-fly-around absolute left-4 top-8 leading-none"
        style={{ animationDelay: `${index * 2.1}s` }}
        aria-label={item.name}
      >
        <span key={spun?.key} className={`inline-block ${spinClass}`}>
          <span className="animate-flutter inline-block text-2xl drop-shadow">{item.emoji}</span>
        </span>
      </button>
    );
  };

  // Anything with a motion roams free, whatever slot it came from — that's how
  // a butterfly bought into the 'face' slot still flies around.
  const roamers = [companion, face, held, hat, boughtCharacter]
    .filter((i): i is ShopItem => !!i && !!i.motion && i.motion !== 'float')
    .filter((i) => !isEgg);

  // Attached accessories: only the ones that don't move.
  const attachedHat = hat && !hat.motion ? hat : undefined;
  const attachedFace = face && !face.motion ? face : undefined;
  const attachedHeld = held && !held.motion ? held : undefined;

  return (
    <div
      className={`relative w-full select-none overflow-hidden rounded-3xl bg-gradient-to-br ${bgGradient}`}
      style={{ height: stageHeight }}
    >
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-white/20" />

      {/* Upward-drifting sparkle effects */}
      {effect && (effect.motion === 'float' || !effect.motion) && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="animate-drift-up pointer-events-none absolute bottom-10 text-2xl"
              style={{ left: `${18 + i * 21}%`, animationDelay: `${i * 0.55}s` }}
            >
              {effect.emoji}
            </span>
          ))}
        </>
      )}

      {/* Character — tap it for a reaction */}
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          onClick={handleTapCharacter}
          className="relative flex items-center justify-center"
          aria-label="친구 쓰다듬기"
        >
          <span className="absolute inset-0 m-auto h-24 w-24 rounded-full bg-white/30 blur-2xl" />

          {/* tapKey/wiggleKey remount these spans so the one-shot animations replay */}
          <span key={`tap-${tapKey}`} className={tapKey ? 'animate-tap-jump' : ''}>
            <span key={`wig-${wiggleKey}`} className={wiggleKey ? 'animate-idle-wiggle' : 'animate-bob'}>
              <span className="relative inline-block leading-none drop-shadow-md" style={{ fontSize: `${bodySize}px` }}>
                {bodyEmoji}
              </span>

              {attachedHat && !isEgg && (
                <span
                  className="absolute leading-none drop-shadow-sm"
                  style={{ fontSize: `${bodySize * 0.5}px`, top: `-${bodySize * 0.3}px`, left: '50%', transform: 'translateX(-50%)' }}
                >
                  {attachedHat.emoji}
                </span>
              )}

              {attachedFace && !isEgg && (
                <span
                  className="absolute leading-none drop-shadow-sm"
                  style={{ fontSize: `${bodySize * 0.38}px`, top: `${bodySize * 0.16}px`, left: '50%', transform: 'translateX(-50%)' }}
                >
                  {attachedFace.emoji}
                </span>
              )}

              {attachedHeld && !isEgg && (
                <span
                  className="absolute leading-none drop-shadow-sm"
                  style={{ fontSize: `${bodySize * 0.42}px`, right: `-${bodySize * 0.32}px`, bottom: 0 }}
                >
                  {attachedHeld.emoji}
                </span>
              )}
            </span>
          </span>

          {/* Emote bubble */}
          {emote && (
            <span
              key={emote.key}
              className="animate-emote-pop pointer-events-none absolute left-1/2 rounded-2xl bg-white/90 px-2.5 py-1 text-lg shadow-md"
              style={{ bottom: `${bodySize * 0.9}px` }}
            >
              {emote.char}
            </span>
          )}
        </button>
      </div>

      {/* Free-roaming owned items */}
      {roamers.map((item, i) => renderRoamer(item, item.motion as Motion, i))}

      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/75 px-2.5 py-1 backdrop-blur">
        <p className="text-[11px] font-bold text-[#1c1c1e]">
          Lv.{growth.stage.level} · {growth.stage.name}
        </p>
      </div>

      {isEgg ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] font-bold text-black/50">
          일기를 1개 쓰면 친구가 태어나요!
        </p>
      ) : (
        <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[10px] font-semibold text-black/35">
          친구를 콕 눌러보세요!
        </p>
      )}
    </div>
  );
}
