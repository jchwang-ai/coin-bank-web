'use client';

import { CSSProperties, ReactNode, useId } from 'react';
import { Art, BirdSpecies, creatureForItem, isRoamer, needsFeet } from '@/lib/creatures';
import { ShopItem } from '@/lib/characterShop';

/**
 * Drawings for stage creatures. Birds and insects are SVG so their wings can
 * really flap: the parts carry class names (bd-wing, bf-wing, bz-wing…) and
 * globals.css animates them according to the actor's data-pose
 * (fly / glide / perch / peck / held …). Everything faces RIGHT.
 */

function useSafeId() {
  return useId().replace(/[^a-zA-Z0-9]/g, '');
}

// ── Birds ──────────────────────────────────────────────────────────────

interface BirdLook {
  body: string;
  head: string;
  belly: string;
  wing: string;
  wingDark: string;
  wingTip: string;
  beak: string;
  legs: string;
  flap: string;
  throat?: string;
  cap?: string;
}

const BIRD_LOOK: Record<BirdSpecies, BirdLook> = {
  songbird: { body: '#4DABF7', head: '#339AF0', belly: '#E7F5FF', wing: '#1C7ED6', wingDark: '#1864AB', wingTip: '#0B4F8A', beak: '#FFA94D', legs: '#F08C00', flap: '.26s' },
  sparrow: { body: '#B07A50', head: '#9A6440', belly: '#F3E3CF', wing: '#7A4B2A', wingDark: '#5C3A21', wingTip: '#3E2716', beak: '#5C3A21', legs: '#C08A5B', flap: '.2s', cap: '#6B3F22' },
  swallow: { body: '#22306B', head: '#1E2B5C', belly: '#FFF7EC', wing: '#17235A', wingDark: '#0E1736', wingTip: '#0A1028', beak: '#222', legs: '#333', flap: '.3s', throat: '#E8590C' },
  parrot: { body: '#F03E3E', head: '#E03131', belly: '#FF8787', wing: '#FCC419', wingDark: '#E67700', wingTip: '#1C7ED6', beak: '#F1F3F5', legs: '#868E96', flap: '.3s' },
  hummingbird: { body: '#12B886', head: '#0CA678', belly: '#E6FCF5', wing: '#C3FAE8', wingDark: '#96F2D7', wingTip: '#63E6BE', beak: '#212529', legs: '#495057', flap: '.06s', throat: '#E64980' },
  owl: { body: '#9C6644', head: '#9C6644', belly: '#EBD7B9', wing: '#7F5539', wingDark: '#5E3B25', wingTip: '#4A2E1C', beak: '#F59F00', legs: '#F59F00', flap: '.42s' },
  phoenix: { body: '#FF7A1A', head: '#FF922B', belly: '#FFE066', wing: '#FA5252', wingDark: '#C92A2A', wingTip: '#FFD43B', beak: '#FFD43B', legs: '#E8590C', flap: '.36s' },
};

const WING = 'M56 58 C50 40 34 24 14 18 C20 30 22 38 28 46 C34 54 44 62 56 66 Z';
const WING_TIP = 'M14 18 C22 22 28 30 30 40 L24 38 C22 32 18 26 14 18 Z';

function birdTail(species: BirdSpecies, l: BirdLook, fire: string): ReactNode {
  switch (species) {
    case 'swallow':
      return <path d="M38 62 L2 50 L20 64 L2 82 Z" fill={l.wingDark} />;
    case 'parrot':
      return (
        <>
          <path d="M38 62 L4 84 L10 90 L40 70 Z" fill="#1C7ED6" />
          <path d="M38 64 L8 88 L12 92 L40 70 Z" fill="#E03131" />
        </>
      );
    case 'hummingbird':
      return <path d="M42 64 L22 60 L24 72 Z" fill={l.wingDark} />;
    case 'owl':
      return <path d="M36 70 L20 72 L30 80 Z" fill={l.wingDark} />;
    case 'sparrow':
      return <path d="M36 62 L8 56 L10 72 Z" fill={l.wingDark} />;
    case 'phoenix':
      return (
        <g className="bd-flame">
          <path d="M38 62 C22 48 12 64 2 52 C8 70 22 74 38 70 Z" fill={fire} />
          <path d="M38 66 C20 72 12 88 2 92 C16 94 28 84 40 72 Z" fill={fire} />
          <path d="M38 64 C24 60 14 72 6 72 C16 78 28 74 40 68 Z" fill="#FFD43B" />
        </g>
      );
    default:
      return <path d="M36 60 L8 50 L12 62 L8 74 Z" fill={l.wingDark} />;
  }
}

function Bird({ species }: { species: BirdSpecies }) {
  const l = BIRD_LOOK[species];
  const uid = useSafeId();
  const fire = `url(#${uid}f)`;
  const isPhoenix = species === 'phoenix';
  const isOwl = species === 'owl';

  return (
    <svg
      viewBox="0 0 120 100"
      className="cr-svg"
      style={{ '--flap': l.flap, width: '120%', left: '-10%' } as CSSProperties}
    >
      {isPhoenix && (
        <defs>
          <linearGradient id={`${uid}f`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFE066" />
            <stop offset=".5" stopColor="#FF6B00" />
            <stop offset="1" stopColor="#E03131" />
          </linearGradient>
        </defs>
      )}

      <g className="bd-tail">{birdTail(species, l, fire)}</g>
      <g className="bd-wing bd-far">
        <path d={WING} fill={isPhoenix ? fire : l.wingDark} opacity={0.9} />
      </g>
      <g className="bd-legs" stroke={l.legs} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M52 80 L50 94 M50 94 L44 96 M50 94 L55 97" />
        <path d="M62 80 L62 94 M62 94 L56 96 M62 94 L67 97" />
      </g>

      <ellipse cx="56" cy="64" rx={species === 'hummingbird' ? 21 : 27} ry={isOwl ? 24 : 20} fill={l.body} />
      <ellipse cx="63" cy="71" rx="16" ry="11" fill={l.belly} />
      {isOwl && (
        <g stroke={l.wingDark} strokeWidth="1.6" fill="none" opacity=".55">
          <path d="M56 68 l3 3 l3 -3" />
          <path d="M64 74 l3 3 l3 -3" />
          <path d="M58 78 l3 3 l3 -3" />
        </g>
      )}

      <g className="bd-head">
        <circle cx="80" cy="46" r={isOwl ? 20 : species === 'hummingbird' ? 13 : 17} fill={l.head} />
        {l.cap && <ellipse cx="80" cy="36" rx="13" ry="7" fill={l.cap} />}
        {l.throat && <ellipse cx="88" cy="56" rx="8" ry="5" fill={l.throat} />}
        {isPhoenix && (
          <path className="bd-flame" d="M74 32 Q70 16 78 6 Q79 18 84 24 Q86 12 95 8 Q91 22 89 32 Z" fill={fire} />
        )}

        {isOwl ? (
          <>
            <path d="M66 34 L62 18 L74 30 Z" fill={l.wingDark} />
            <path d="M94 30 L100 16 L98 34 Z" fill={l.wingDark} />
            <circle cx="82" cy="47" r="16" fill="#F3E3C7" />
            <g className="bd-eye">
              <circle cx="75" cy="45" r="6.5" fill="#FFD43B" stroke="#5E3B25" strokeWidth="1.5" />
              <circle cx="89" cy="45" r="6.5" fill="#FFD43B" stroke="#5E3B25" strokeWidth="1.5" />
              <circle cx="76" cy="45" r="3.4" fill="#1b1b1b" />
              <circle cx="90" cy="45" r="3.4" fill="#1b1b1b" />
              <circle cx="77" cy="43.6" r="1.2" fill="#fff" />
              <circle cx="91" cy="43.6" r="1.2" fill="#fff" />
            </g>
            <path d="M79 51 L82 58 L85 51 Z" fill={l.beak} />
          </>
        ) : (
          <>
            {species === 'hummingbird' ? (
              <path d="M92 45 L119 47.5 L92 50 Z" fill={l.beak} />
            ) : species === 'parrot' ? (
              <path d="M93 38 Q110 38 105 55 Q101 49 93 51 Z" fill={l.beak} stroke="#ADB5BD" strokeWidth="1" />
            ) : species === 'sparrow' ? (
              <path d="M94 42 L104 47 L94 52 Z" fill={l.beak} />
            ) : (
              <path d="M94 43 L107 48 L94 53 Z" fill={l.beak} />
            )}
            <g className="bd-eye">
              <circle cx="86" cy="42" r="3.8" fill="#1b1b1b" />
              <circle cx="87.3" cy="40.7" r="1.3" fill="#fff" />
            </g>
            <circle cx="84" cy="51" r="3.6" fill="#FF8FAB" opacity=".5" />
          </>
        )}
      </g>

      <g className="bd-wing bd-near">
        <path d={WING} fill={isPhoenix ? fire : l.wing} opacity={species === 'hummingbird' ? 0.75 : 1} />
        <path d={WING_TIP} fill={l.wingTip} />
      </g>
    </svg>
  );
}

// ── Insects ────────────────────────────────────────────────────────────

function Butterfly({ wing, wing2, edge }: { wing: string; wing2: string; edge: string }) {
  const half = (
    <>
      <path d="M50 46 C32 8 4 12 8 38 C10 52 34 54 50 50 Z" fill={wing} stroke={edge} strokeWidth="2.5" />
      <path d="M50 53 C32 56 16 72 24 86 C34 94 46 74 50 57 Z" fill={wing2} stroke={edge} strokeWidth="2.5" />
      <circle cx="22" cy="30" r="4.5" fill="#fff" opacity=".85" />
      <circle cx="31" cy="74" r="3" fill="#fff" opacity=".7" />
    </>
  );
  return (
    <svg viewBox="0 0 100 100" className="cr-svg">
      <g className="bf-wing">{half}</g>
      <g className="bf-wing">
        <g transform="translate(100 0) scale(-1 1)">{half}</g>
      </g>
      <ellipse cx="50" cy="56" rx="3.6" ry="17" fill={edge} />
      <circle cx="50" cy="36" r="4.6" fill={edge} />
      <path d="M48 33 Q42 20 38 16 M52 33 Q58 20 62 16" stroke={edge} strokeWidth="1.8" fill="none" />
      <circle cx="38" cy="16" r="2" fill={edge} />
      <circle cx="62" cy="16" r="2" fill={edge} />
    </svg>
  );
}

function Bee() {
  const uid = useSafeId();
  return (
    <svg viewBox="0 0 100 100" className="cr-svg">
      <defs>
        <clipPath id={`${uid}b`}>
          <ellipse cx="48" cy="60" rx="27" ry="20" />
        </clipPath>
      </defs>
      <g className="bz-wing" style={{ transformOrigin: '50px 44px' }}>
        <ellipse cx="40" cy="30" rx="13" ry="19" transform="rotate(-25 40 30)" fill="#E7F5FF" opacity=".8" stroke="#A5D8FF" strokeWidth="1.5" />
        <ellipse cx="56" cy="30" rx="10" ry="16" transform="rotate(15 56 30)" fill="#E7F5FF" opacity=".7" stroke="#A5D8FF" strokeWidth="1.5" />
      </g>
      <path d="M22 60 L12 62 L22 66 Z" fill="#343A40" />
      <ellipse cx="48" cy="60" rx="27" ry="20" fill="#FFD43B" />
      <g clipPath={`url(#${uid}b)`} fill="#343A40">
        <rect x="30" y="38" width="7" height="44" />
        <rect x="44" y="38" width="7" height="44" />
      </g>
      <circle cx="76" cy="56" r="12" fill="#495057" />
      <circle cx="80" cy="53" r="3" fill="#fff" />
      <circle cx="80.6" cy="53" r="1.6" fill="#111" />
      <path d="M74 46 Q74 34 68 30 M80 46 Q84 34 90 32" stroke="#343A40" strokeWidth="2" fill="none" />
      <path d="M78 62 Q82 65 86 61" stroke="#fff" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

function Dragonfly() {
  return (
    <svg viewBox="0 0 100 100" className="cr-svg">
      <g className="bz-wing" style={{ transformOrigin: '66px 54px' }}>
        <ellipse cx="54" cy="40" rx="26" ry="6" transform="rotate(-18 54 40)" fill="#D0EBFF" opacity=".7" stroke="#74C0FC" strokeWidth="1.2" />
        <ellipse cx="50" cy="44" rx="24" ry="5.5" transform="rotate(-32 50 44)" fill="#D0EBFF" opacity=".6" stroke="#74C0FC" strokeWidth="1.2" />
      </g>
      <rect x="6" y="53" width="60" height="6" rx="3" fill="#1098AD" />
      <g fill="#0B7285">
        <rect x="16" y="53" width="2" height="6" />
        <rect x="28" y="53" width="2" height="6" />
        <rect x="40" y="53" width="2" height="6" />
      </g>
      <ellipse cx="70" cy="56" rx="9" ry="6" fill="#15AABF" />
      <circle cx="82" cy="55" r="7" fill="#0C8599" />
      <circle cx="84" cy="52" r="4.5" fill="#3BC9DB" />
      <circle cx="85" cy="51" r="1.5" fill="#fff" />
      <g className="bz-wing bz-wing2" style={{ transformOrigin: '66px 58px' }}>
        <ellipse cx="54" cy="70" rx="24" ry="5.5" transform="rotate(20 54 70)" fill="#D0EBFF" opacity=".55" stroke="#74C0FC" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

function Firefly() {
  const uid = useSafeId();
  return (
    <svg viewBox="0 0 100 100" className="cr-svg" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`${uid}g`}>
          <stop offset="0" stopColor="#FFF9DB" stopOpacity=".95" />
          <stop offset=".45" stopColor="#FFE066" stopOpacity=".55" />
          <stop offset="1" stopColor="#FFE066" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="ff-glow" cx="34" cy="56" r="40" fill={`url(#${uid}g)`} />
      <g className="bz-wing" style={{ transformOrigin: '50px 48px' }}>
        <ellipse cx="46" cy="38" rx="9" ry="14" transform="rotate(-25 46 38)" fill="#F1F3F5" opacity=".7" />
      </g>
      <ellipse cx="36" cy="56" rx="12" ry="9" fill="#FFF3BF" />
      <ellipse cx="52" cy="52" rx="12" ry="8" fill="#5C4033" />
      <circle cx="66" cy="50" r="7" fill="#3B2A20" />
      <circle cx="68.5" cy="48.5" r="1.8" fill="#fff" />
    </svg>
  );
}

// ── Fish in a bubble ───────────────────────────────────────────────────

function Fish({ body, fin, stripes }: { body: string; fin: string; stripes?: boolean }) {
  const uid = useSafeId();
  return (
    <svg viewBox="0 0 100 100" className="cr-svg">
      <defs>
        <radialGradient id={`${uid}w`} cx=".35" cy=".3">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".6" stopColor="#A5D8FF" stopOpacity=".28" />
          <stop offset="1" stopColor="#4DABF7" stopOpacity=".45" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${uid}w)`} stroke="#fff" strokeOpacity=".85" strokeWidth="2" />
      <g className="fs-fish">
        <g className="fs-tail">
          <path d="M34 52 L14 38 L18 52 L14 66 Z" fill={fin} stroke={body} strokeWidth="1.5" />
        </g>
        <path d="M44 40 Q54 28 64 40 Z" fill={fin} />
        <ellipse cx="52" cy="52" rx="21" ry="13" fill={body} />
        {stripes && (
          <g fill="#fff" opacity=".9">
            <rect x="44" y="40" width="4" height="24" rx="2" />
            <rect x="58" y="41" width="4" height="22" rx="2" />
          </g>
        )}
        <path d="M50 58 Q54 66 58 58 Z" fill={fin} />
        <circle cx="65" cy="48" r="3.6" fill="#1b1b1b" />
        <circle cx="66.2" cy="46.8" r="1.2" fill="#fff" />
        <path d="M71 55 Q73 56 72 58" stroke="#1b1b1b" strokeWidth="1.2" fill="none" />
      </g>
      <path d="M22 26 A34 34 0 0 1 46 12" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".8" />
    </svg>
  );
}

// ── Emoji creatures ────────────────────────────────────────────────────

const FOOT_COLOR: Record<string, string> = {
  '🐶': '#C68B59', '🐱': '#F4B860', '🐰': '#F8D7E3', '🐼': '#343A40', '🦊': '#E8590C',
  '🐹': '#E9B872', '🐸': '#69DB7C', '🐨': '#ADB5BD', '🐲': '#69DB7C', '🐣': '#FFA94D',
};

function EmojiBody({ emoji, feet }: { emoji: string; feet: boolean }) {
  const color = FOOT_COLOR[emoji] || '#D9A066';
  return (
    <>
      {feet && (
        <>
          <span className="cr-foot cr-foot-l" style={{ background: color }} />
          <span className="cr-foot cr-foot-r" style={{ background: color }} />
        </>
      )}
      <span className="cr-emoji" style={{ bottom: feet ? '8%' : 0 }}>
        {emoji}
      </span>
    </>
  );
}

export function ArtView({ art }: { art: Art }) {
  switch (art.kind) {
    case 'bird':
      return <Bird species={art.species} />;
    case 'butterfly':
      return <Butterfly wing={art.wing} wing2={art.wing2} edge={art.edge} />;
    case 'bee':
      return <Bee />;
    case 'dragonfly':
      return <Dragonfly />;
    case 'firefly':
      return <Firefly />;
    case 'fish':
      return <Fish body={art.body} fin={art.fin} stripes={art.stripes} />;
    default:
      return <EmojiBody emoji={art.emoji} feet={needsFeet(art)} />;
  }
}

interface Accessories {
  hat?: string;
  face?: string;
  held?: string;
}

/** A creature's full drawing, sized to fill its actor box (em = box size). */
export default function CreatureArt({
  art,
  size,
  accessories,
  aura,
}: {
  art: Art;
  /** Omit to inherit the font-size the stage sets on the actor box. */
  size?: number;
  accessories?: Accessories;
  aura?: boolean;
}) {
  return (
    <div className="cr-art" style={size ? { fontSize: size } : undefined}>
      {aura && <span className="cr-aura" />}
      <ArtView art={art} />
      {accessories?.hat && (
        <span className="cr-acc" style={{ fontSize: '0.46em', top: '-0.22em', left: '50%', transform: 'translateX(-50%)' }}>
          {accessories.hat}
        </span>
      )}
      {accessories?.face && (
        <span className="cr-acc" style={{ fontSize: '0.36em', top: '0.3em', left: '50%', transform: 'translateX(-50%)' }}>
          {accessories.face}
        </span>
      )}
      {accessories?.held && (
        <span className="cr-acc" style={{ fontSize: '0.4em', right: '-0.22em', bottom: '0.05em' }}>
          {accessories.held}
        </span>
      )}
    </div>
  );
}

/** Shop/collection icon: the real drawing for drawn creatures, else the emoji. */
export function ItemIcon({ item, size, className = '' }: { item: ShopItem; size: number; className?: string }) {
  if (isRoamer(item)) {
    const art = creatureForItem(item).art;
    if (art.kind !== 'emoji') {
      return (
        <span
          data-pose="icon"
          className={`relative inline-block ${className}`}
          style={{ width: size, height: size }}
        >
          <span className="cr-art" style={{ fontSize: size }}>
            <ArtView art={art} />
          </span>
        </span>
      );
    }
  }
  return (
    <span className={`inline-block leading-none ${className}`} style={{ fontSize: size }}>
      {item.emoji}
    </span>
  );
}
