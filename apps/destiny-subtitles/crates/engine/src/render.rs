//! Rasterises caption lines into a BGRA frame with a transparent background,
//! for NDI output. White text, thin black outline, dark plate behind each line
//! (the design's lower-third look). Straight (unassociated) alpha, as NDI's
//! BGRA expects: premultiplied output would leave a dark fringe on glyph edges
//! when a switcher keys it.

use cosmic_text::{Align, Attrs, Buffer, Color, Family, FontSystem, Metrics, Shaping, SwashCache, Weight};
use tiny_skia::{Paint, Pixmap, Rect, Transform};

pub struct CaptionRenderer {
    pub width: u32,
    pub height: u32,
    fonts: FontSystem,
    cache: SwashCache,
}

impl CaptionRenderer {
    pub fn new(width: u32, height: u32) -> Self {
        Self { width, height, fonts: FontSystem::new(), cache: SwashCache::new() }
    }

    /// True if the system has any font at all (false on a bare CI box).
    pub fn has_fonts(&self) -> bool {
        self.fonts.db().faces().next().is_some()
    }

    /// Render `lines` (oldest first) stacked upward from the bottom margin.
    /// Returns `width * height * 4` bytes of BGRA. Empty input is fully clear.
    pub fn render(&mut self, lines: &[String], font_px: f32) -> Vec<u8> {
        let mut pix = Pixmap::new(self.width, self.height).expect("non-zero frame size");
        let line_h = font_px * 1.25;
        let pad_x = font_px * 0.35;
        let pad_y = font_px * 0.08;
        let gap = font_px * 0.08;
        let mut bottom = self.height as f32 * 0.94;

        for line in lines.iter().rev().filter(|l| !l.trim().is_empty()) {
            let mut buf = Buffer::new(&mut self.fonts, Metrics::new(font_px, line_h));
            buf.set_size(None, None);
            let attrs = Attrs::new().family(Family::SansSerif).weight(Weight::BOLD);
            buf.set_text(line, &attrs, Shaping::Advanced, Some(Align::Left));
            buf.shape_until_scroll(&mut self.fonts, false);
            let text_w = buf.layout_runs().map(|r| r.line_w).fold(0.0, f32::max);

            let plate_w = text_w + pad_x * 2.0;
            let plate_h = line_h + pad_y * 2.0;
            let left = (self.width as f32 - plate_w) / 2.0;
            let top = bottom - plate_h;

            fill(&mut pix, left, top, plate_w, plate_h, [0, 0, 0, 199]);

            let (ox, oy) = ((left + pad_x) as i32, (top + pad_y) as i32);
            let o = (font_px / 28.0).round().max(1.0) as i32;
            for (dx, dy) in [(-o, 0), (o, 0), (0, -o), (0, o), (-o, -o), (o, -o), (-o, o), (o, o)] {
                buf.draw(&mut self.fonts, &mut self.cache, Color::rgb(0, 0, 0), |x, y, w, h, c| {
                    fill(&mut pix, (ox + dx + x) as f32, (oy + dy + y) as f32, w as f32, h as f32, [0, 0, 0, c.a()]);
                });
            }
            buf.draw(&mut self.fonts, &mut self.cache, Color::rgb(255, 255, 255), |x, y, w, h, c| {
                fill(&mut pix, (ox + x) as f32, (oy + y) as f32, w as f32, h as f32, [255, 255, 255, c.a()]);
            });

            bottom = top - gap;
            if bottom < 0.0 {
                break;
            }
        }
        premultiplied_rgba_to_straight_bgra(pix.data())
    }
}

fn fill(pix: &mut Pixmap, x: f32, y: f32, w: f32, h: f32, rgba: [u8; 4]) {
    if rgba[3] == 0 {
        return;
    }
    if let Some(rect) = Rect::from_xywh(x, y, w.max(0.01), h.max(0.01)) {
        let mut paint = Paint::default();
        paint.set_color_rgba8(rgba[0], rgba[1], rgba[2], rgba[3]);
        paint.anti_alias = false;
        pix.fill_rect(rect, &paint, Transform::identity(), None);
    }
}

pub fn premultiplied_rgba_to_straight_bgra(data: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(data.len());
    for px in data.chunks_exact(4) {
        let a = px[3] as u32;
        let un = |c: u8| if a == 0 { 0 } else { ((c as u32 * 255 + a / 2) / a).min(255) as u8 };
        out.extend_from_slice(&[un(px[2]), un(px[1]), un(px[0]), px[3]]);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_is_fully_transparent() {
        let mut r = CaptionRenderer::new(320, 180);
        assert!(r.render(&[], 24.0).iter().all(|b| *b == 0));
    }

    #[test]
    fn text_draws_only_in_lower_part_with_alpha() {
        let mut r = CaptionRenderer::new(640, 360);
        if !r.has_fonts() {
            eprintln!("no system fonts; skipping");
            return;
        }
        let px = r.render(&["Hello Destiny".to_string()], 32.0);
        let alpha = |y: usize, x: usize| px[(y * 640 + x) * 4 + 3];
        let any_top = (0..180).any(|y| (0..640).any(|x| alpha(y, x) > 0));
        let any_bottom = (240..360).any(|y| (0..640).any(|x| alpha(y, x) > 0));
        assert!(!any_top && any_bottom);
        // There are fully opaque white glyph pixels (BGRA all 255).
        assert!(px.chunks_exact(4).any(|p| p == [255, 255, 255, 255]));
    }

    #[test]
    fn unpremultiply_restores_colour() {
        // 50% alpha white, premultiplied RGBA (128,128,128,128) -> straight BGRA 255s.
        assert_eq!(premultiplied_rgba_to_straight_bgra(&[128, 128, 128, 128]), vec![255, 255, 255, 128]);
    }
}

/// Save straight BGRA as a PNG, for eyeballing a frame without NDI.
pub fn save_bgra_png(width: u32, height: u32, bgra: &[u8], path: &std::path::Path) -> Result<(), String> {
    let mut rgba = Vec::with_capacity(bgra.len());
    for px in bgra.chunks_exact(4) {
        let a = px[3] as u32;
        let pm = |c: u8| ((c as u32 * a + 127) / 255) as u8;
        rgba.extend_from_slice(&[pm(px[2]), pm(px[1]), pm(px[0]), px[3]]);
    }
    let size = tiny_skia::IntSize::from_wh(width, height).ok_or("bad size")?;
    let pix = Pixmap::from_vec(rgba, size).ok_or("bad pixel buffer")?;
    pix.save_png(path).map_err(|e| e.to_string())
}
