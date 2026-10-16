import {
  ClipOp,
  Skia,
  type SkCanvas,
  type SkFont,
  type SkImage,
  type SkPaint,
} from '@shopify/react-native-skia';
import type { TicketTheme } from '@/domain/entities/Look';
import type { TicketGrid } from '@/domain/entities/Ticket';

export interface SheetTicket {
  readonly id: string;
  readonly grid: TicketGrid;
}

export interface SheetText {
  readonly title: string;
  readonly room: string;
  readonly footer: string;
  readonly ticketLabel: (id: string) => string;
  /** The small mark in the corner; null with Plus. */
  readonly watermark: string | null;
}

export const SHEET_WIDTH = 1080;
const M = 54;
const GAP = 8;
const HEADER = 74;

function ticketHeight(): number {
  const cell = (SHEET_WIDTH - M * 2 - 24 - GAP * 8) / 9;
  return HEADER + 24 + cell * 1.08 * 3 + GAP * 2;
}

/** The full sheet's height for `count` tickets. */
export function sheetHeight(count: number): number {
  return 210 + count * (ticketHeight() + 34) + 90;
}

/**
 * Paints printable tickets into one crisp image (1080 px wide), in the
 * player's ticket theme: big numbers, ticket IDs, the room code, and a line
 * on how to claim. Without Plus a small Tambola Party mark sits in the
 * corner.
 */
export function drawTicketSheet(
  tickets: readonly SheetTicket[],
  look: TicketTheme,
  font: SkFont,
  text: SheetText,
): SkImage | null {
  const W = SHEET_WIDTH;
  const H = Math.round(sheetHeight(tickets.length));
  const surface = Skia.Surface.MakeOffscreen(W, H) ?? Skia.Surface.Make(W, H);
  if (!surface) return null;
  const c = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  const fill = (color: string) => {
    paint.setColor(Skia.Color(color));
    return paint;
  };
  const textAt = (
    s: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align: 'left' | 'center' | 'right' = 'left',
  ) => {
    font.setSize(size);
    const w = font.getTextWidth(s);
    const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    c.drawText(s, left, y, fill(color), font);
  };

  // Paper.
  c.drawRect(Skia.XYWHRect(0, 0, W, H), fill('#fffdf8'));
  c.drawRect(Skia.XYWHRect(0, 0, W, 16), fill(look.header));

  // Title and room code.
  textAt(text.title, M, 112, 54, '#2a1238');
  textAt(text.room, W - M, 112, 46, look.header === '#00e5ff' ? '#2a1238' : look.header, 'right');
  c.drawRect(Skia.XYWHRect(M, 148, W - M * 2, 3), fill('#ead8bd'));

  let y = 190;
  const th = ticketHeight();
  for (const tk of tickets) {
    drawTicket(c, tk, look, font, M, y, W - M * 2, th, text.ticketLabel(tk.id), textAt, fill);
    y += th + 34;
  }

  textAt(text.footer, W / 2, H - 46, 34, '#62445c', 'center');

  if (text.watermark) {
    font.setSize(26);
    const w = font.getTextWidth(text.watermark);
    const x = W - M - w - 28;
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, H - 132, w + 28, 44), 22, 22), fill('#2a1238'));
    textAt(text.watermark, x + 14, H - 101, 26, '#ffd166');
  }

  surface.flush();
  const image = surface.makeImageSnapshot();
  return image.makeNonTextureImage() ?? image;
}

function drawTicket(
  c: SkCanvas,
  tk: SheetTicket,
  look: TicketTheme,
  font: SkFont,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  textAt: (
    s: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align?: 'left' | 'center' | 'right',
  ) => void,
  fill: (color: string) => SkPaint,
) {
  const outer = Skia.RRectXY(Skia.XYWHRect(x, y, w, h), 26, 26);
  c.drawRRect(outer, fill(look.rule));
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + 4, y + 4, w - 8, h - 8), 23, 23), fill(look.paper));
  c.save();
  c.clipRRect(
    Skia.RRectXY(Skia.XYWHRect(x + 4, y + 4, w - 8, h - 8), 23, 23),
    ClipOp.Intersect,
    true,
  );
  c.drawRect(Skia.XYWHRect(x, y, w, HEADER), fill(look.header));
  c.restore();
  textAt(label, x + 26, y + 50, 34, look.headerInk);

  const inner = w - 24;
  const cell = (inner - GAP * 8) / 9;
  const ch = cell * 1.08;
  const gx = x + 12;
  const gy = y + HEADER + 12;
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 9; col++) {
      const n = tk.grid[r]?.[col] ?? null;
      const cx = gx + col * (cell + GAP);
      const cy = gy + r * (ch + GAP);
      c.drawRRect(
        Skia.RRectXY(Skia.XYWHRect(cx, cy, cell, ch), 14, 14),
        fill(n === null ? look.blank : look.cell),
      );
      if (n !== null)
        textAt(String(n), cx + cell / 2, cy + ch / 2 + cell * 0.2, cell * 0.56, look.ink, 'center');
    }
  }
}
