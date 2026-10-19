//! Streaming windowed-sinc resampler to 16 kHz mono, plus channel mixing.
//! Written in-tree to avoid a heavy dependency; speech needs clean
//! anti-aliasing, not audiophile quality.

use std::f64::consts::PI;

const ZERO_CROSSINGS: usize = 16;

pub struct Resampler {
    ratio: f64,       // input samples consumed per output sample
    cutoff: f64,      // relative to input Nyquist
    pos: f64,         // next output position, in input-sample units, relative to buf[0]
    buf: Vec<f32>,
}

impl Resampler {
    pub fn new(from_hz: u32, to_hz: u32) -> Self {
        let ratio = from_hz as f64 / to_hz as f64;
        Self { ratio, cutoff: (1.0 / ratio).min(1.0) * 0.97, pos: 0.0, buf: Vec::new() }
    }

    fn half_width(&self) -> f64 {
        ZERO_CROSSINGS as f64 / self.cutoff.max(0.01)
    }

    pub fn process(&mut self, input: &[f32]) -> Vec<f32> {
        if (self.ratio - 1.0).abs() < 1e-9 {
            return input.to_vec();
        }
        self.buf.extend_from_slice(input);
        let hw = self.half_width();
        let mut out = Vec::with_capacity((input.len() as f64 / self.ratio) as usize + 1);
        // Need `hw` samples of lookahead past the output position.
        while self.pos + hw < self.buf.len() as f64 {
            let lo = ((self.pos - hw).ceil().max(0.0)) as usize;
            let hi = ((self.pos + hw).floor() as usize).min(self.buf.len() - 1);
            let mut acc = 0.0f64;
            for i in lo..=hi {
                let x = i as f64 - self.pos;
                let sinc = if x.abs() < 1e-12 { 1.0 } else { (PI * x * self.cutoff).sin() / (PI * x * self.cutoff) };
                let w = 0.5 + 0.5 * (PI * x / hw).cos(); // Hann window
                acc += self.buf[i] as f64 * sinc * w * self.cutoff;
            }
            out.push(acc as f32);
            self.pos += self.ratio;
        }
        // Drop consumed input, keeping the filter's look-behind.
        let keep_from = ((self.pos - hw).floor().max(0.0)) as usize;
        if keep_from > 0 {
            self.buf.drain(..keep_from);
            self.pos -= keep_from as f64;
        }
        out
    }
}

/// Average planar channels (`channels` slices of equal length) into mono.
pub fn mix_planar_to_mono(channels: &[&[f32]]) -> Vec<f32> {
    match channels {
        [] => Vec::new(),
        [only] => only.to_vec(),
        _ => {
            let n = channels[0].len();
            let scale = 1.0 / channels.len() as f32;
            (0..n).map(|i| channels.iter().map(|c| c[i]).sum::<f32>() * scale).collect()
        }
    }
}

/// Average interleaved frames into mono.
pub fn mix_interleaved_to_mono(samples: &[f32], channels: usize) -> Vec<f32> {
    if channels <= 1 {
        return samples.to_vec();
    }
    samples.chunks_exact(channels).map(|f| f.iter().sum::<f32>() / channels as f32).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sine(hz: f64, rate: u32, secs: f64) -> Vec<f32> {
        (0..(rate as f64 * secs) as usize).map(|i| (2.0 * PI * hz * i as f64 / rate as f64).sin() as f32).collect()
    }
    fn rms(x: &[f32]) -> f64 {
        (x.iter().map(|v| (*v as f64).powi(2)).sum::<f64>() / x.len() as f64).sqrt()
    }

    #[test]
    fn length_scales_by_ratio() {
        let mut r = Resampler::new(48_000, 16_000);
        let out = r.process(&sine(440.0, 48_000, 1.0));
        assert!((out.len() as i64 - 16_000).abs() < 40, "{}", out.len());
    }

    #[test]
    fn passes_speech_band_and_blocks_aliases() {
        let mut r = Resampler::new(48_000, 16_000);
        let pass = r.process(&sine(1_000.0, 48_000, 1.0));
        assert!((rms(&pass[200..pass.len() - 200]) - 0.7071).abs() < 0.05);
        let mut r = Resampler::new(48_000, 16_000);
        let alias = r.process(&sine(12_000.0, 48_000, 1.0)); // above 8 kHz Nyquist
        assert!(rms(&alias[200..alias.len() - 200]) < 0.05);
    }

    #[test]
    fn chunked_equals_whole() {
        let input = sine(500.0, 44_100, 0.5);
        let whole = Resampler::new(44_100, 16_000).process(&input);
        let mut r = Resampler::new(44_100, 16_000);
        let mut chunked = Vec::new();
        for c in input.chunks(333) {
            chunked.extend(r.process(c));
        }
        let n = chunked.len().min(whole.len());
        assert!(n > 7000);
        for i in 0..n {
            assert!((chunked[i] - whole[i]).abs() < 1e-4);
        }
    }

    #[test]
    fn mixes_to_mono() {
        assert_eq!(mix_planar_to_mono(&[&[1.0, 0.0], &[0.0, 1.0]]), vec![0.5, 0.5]);
        assert_eq!(mix_interleaved_to_mono(&[1.0, 0.0, 0.0, 1.0], 2), vec![0.5, 0.5]);
    }
}
