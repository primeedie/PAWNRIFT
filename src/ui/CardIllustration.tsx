import type { CardId } from '../data/cards'

// Small original geometric emblems; presentation only, with no downloaded assets.
const emblems: Record<CardId, string> = {
  cut: 'M17 45 42 14 48 10 46 19 23 48M15 39 29 51M20 46 12 55M10 53 14 57',
  ward: 'M32 10 49 17 47 37Q44 47 32 54 20 47 17 37L15 17ZM32 19V43M23 29H41',
  riposte: 'M29 12 44 18 42 35Q39 44 29 50 19 44 16 35L14 18ZM47 45H29M36 38 29 45 36 52M47 45 52 35',
  slip: 'M12 39H40M31 29 42 39 31 49M20 19H46M39 12 47 19 39 26M13 27H24',
  focus: 'M32 10 47 32 32 54 17 32ZM10 32H5M59 32H54M32 5V1M32 63V59M25 32H39M32 25V39',
  crimson: 'M14 50Q40 36 48 9L51 15Q47 41 23 52M13 42 26 56M19 50 12 58M35 19 40 14',
  mend: 'M25 12H39V25H52V39H39V52H25V39H12V25H25ZM8 13 12 9M51 55 55 51',
}

export function CardIllustration({ card }: { card: CardId }) {
  return <svg className="card-illustration" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path className="card-art-frame" d="M32 3 58 17V47L32 61 6 47V17Z" />
    <path d={emblems[card]} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}
