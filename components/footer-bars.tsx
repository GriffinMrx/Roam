/* Decorative bars along the bottom edge: [left %, width %, height px]. They cover 0–100% with no gap. */
const bars: [number, number, number][] = [
  [0, 7, 90], [7, 6, 120], [13, 6, 150], [19, 6, 190], [25, 9, 130], [34, 5, 95],
  [39, 10, 80], [49, 3, 70], [52, 8, 110], [60, 8, 140], [68, 5, 150], [73, 6, 190],
  [79, 5, 110], [84, 4, 130], [88, 12, 170],
];

/** Soft silver bars, drawn behind the site footer's content. */
export function FooterBars({ className }: { className?: string }) {
  return (
    <div aria-hidden className={className ?? "relative h-48"}>
      {bars.map(([left, width, height]) => (
        <span
          key={left}
          className="absolute bottom-0 bg-linear-to-t from-[#a1a1aa]/20 to-transparent"
          style={{ left: `${left}%`, width: `${width}%`, height }}
        />
      ))}
    </div>
  );
}
