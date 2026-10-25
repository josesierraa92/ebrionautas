export default function RuleBanner({ text }: { text: string }) {
  return (
    <div className="rounded-xl border-[3px] border-ink bg-btn-special/90 px-3 py-2 text-sm">
      ⚖️ <b>Ley vigente:</b> {text}
    </div>
  );
}
