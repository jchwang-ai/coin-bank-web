'use client';

import { itemById } from '@/lib/characterShop';
import { animalOf, computeGrowth } from '@/lib/diaryPet';

interface CharacterStageProps {
  /** The free buddy animal picked in BuddyPickerSheet. */
  baseAnimalId: string | null;
  equipped: Record<string, string>;
  completedCount: number;
  /** Compact mode is used inside the shop preview. */
  size?: 'normal' | 'large';
}

/**
 * Draws the dressed-up character: background, the animal (or a purchased
 * character that overrides it), hat/face/held accessories, and a looping
 * particle effect. Everything is emoji layered with absolute positioning,
 * matching the rest of this app's icon approach.
 */
export default function CharacterStage({
  baseAnimalId,
  equipped,
  completedCount,
  size = 'normal',
}: CharacterStageProps) {
  const growth = computeGrowth(completedCount);
  const isEgg = growth.stage.level === 1;

  const boughtCharacter = itemById(equipped.character);
  const animal = animalOf(baseAnimalId);
  const hat = itemById(equipped.hat);
  const face = itemById(equipped.face);
  const held = itemById(equipped.held);
  const background = itemById(equipped.background);
  const effect = itemById(equipped.effect);

  // A purchased character replaces the free animal; the egg stage still wins
  // so growth stays meaningful.
  const bodyEmoji = isEgg ? '🥚' : boughtCharacter?.emoji || animal?.emoji || '🐣';
  const bodySize = size === 'large' ? growth.stage.size * 1.25 : growth.stage.size;

  const bgGradient = background?.gradient || (animal?.gradient ?? 'from-violet-200 via-purple-200 to-pink-200');
  const stageHeight = size === 'large' ? 240 : 180;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl bg-gradient-to-br ${bgGradient}`}
      style={{ height: stageHeight }}
    >
      {/* Soft ground */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-white/20" />

      {/* Looping effect particles */}
      {effect && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="animate-drift-up absolute bottom-10 text-2xl"
              style={{
                left: `${18 + i * 21}%`,
                animationDelay: `${i * 0.55}s`,
              }}
            >
              {effect.emoji}
            </span>
          ))}
        </>
      )}

      {/* Character + accessories */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-bob relative flex items-center justify-center">
          <span className="absolute inset-0 m-auto h-24 w-24 rounded-full bg-white/30 blur-2xl" />

          <span className="relative leading-none drop-shadow-md" style={{ fontSize: `${bodySize}px` }}>
            {bodyEmoji}
          </span>

          {/* Hat sits above the head */}
          {hat && !isEgg && (
            <span
              className="absolute leading-none drop-shadow-sm"
              style={{ fontSize: `${bodySize * 0.5}px`, top: `-${bodySize * 0.34}px` }}
            >
              {hat.emoji}
            </span>
          )}

          {/* Face accessory overlaps the middle of the face */}
          {face && !isEgg && (
            <span
              className="absolute leading-none drop-shadow-sm"
              style={{ fontSize: `${bodySize * 0.38}px`, top: `${bodySize * 0.12}px` }}
            >
              {face.emoji}
            </span>
          )}

          {/* Held item to the side */}
          {held && !isEgg && (
            <span
              className="absolute leading-none drop-shadow-sm"
              style={{ fontSize: `${bodySize * 0.42}px`, right: `-${bodySize * 0.34}px`, bottom: 0 }}
            >
              {held.emoji}
            </span>
          )}
        </div>
      </div>

      {/* Stage badge */}
      <div className="absolute left-3 top-3 rounded-full bg-white/75 px-2.5 py-1 backdrop-blur">
        <p className="text-[11px] font-bold text-[#1c1c1e]">
          Lv.{growth.stage.level} · {growth.stage.name}
        </p>
      </div>

      {isEgg && (
        <p className="absolute inset-x-0 bottom-3 text-center text-[11px] font-bold text-black/50">
          일기를 1개 쓰면 친구가 태어나요!
        </p>
      )}
    </div>
  );
}
