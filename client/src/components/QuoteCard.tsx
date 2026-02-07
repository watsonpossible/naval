import type { Quote } from '../types';

type Props = {
  quote: Quote;
  onChoose: () => void;
  disabled?: boolean;
  sideLabel: string;
};

const QuoteCard = ({ quote, onChoose, disabled, sideLabel }: Props) => (
  <button
    onClick={onChoose}
    disabled={disabled}
    className="flex h-full min-h-[260px] w-full flex-col justify-between rounded border border-zinc-700 bg-zinc-950 p-8 text-left transition hover:border-white disabled:cursor-not-allowed disabled:opacity-60"
  >
    <p className="text-2xl leading-relaxed md:text-3xl">“{quote.text}”</p>
    <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-zinc-400">
      <span>{sideLabel}</span>
      <span className="border border-zinc-700 px-3 py-1">Choose</span>
    </div>
  </button>
);

export default QuoteCard;
