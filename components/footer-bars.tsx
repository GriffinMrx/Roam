/* Decorative bars along the bottom edge: [left %, width %, height px] */
const bars: [number, number, number][] = [
  [0, 7, 90], [7, 6, 120], [13, 6, 150], [19, 6, 190], [25, 9, 130], [34, 5, 95],
  [49, 3, 70], [52, 8, 110], [60, 8, 140], [68, 5, 150], [73, 6, 190],
  [79, 5, 110], [84, 4, 130], [88, 12, 170],
];

export function FooterBars() {
  return (
    <div aria-hidden className="relative h-48">
      {bars.map(([left, width, height]) => (
        <span
          key={left}
          className="absolute bottom-0 bg-linear-to-t from-primary-300 to-primary-100/0"
          style={{ left: `${left}%`, width: `${width}%`, height }}
        />
      ))}
    </div>
  );
}
