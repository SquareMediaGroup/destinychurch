//! Load a WAV file as 16 kHz mono f32, for tests and the offline benchmark.

use std::path::Path;

use crate::resample::{mix_interleaved_to_mono, Resampler};

pub fn load_mono_16k(path: &Path) -> Result<Vec<f32>, String> {
    let mut reader = hound::WavReader::open(path).map_err(|e| format!("{}: {e}", path.display()))?;
    let spec = reader.spec();
    let interleaved: Vec<f32> = match spec.sample_format {
        hound::SampleFormat::Float => reader.samples::<f32>().collect::<Result<_, _>>().map_err(|e| e.to_string())?,
        hound::SampleFormat::Int => {
            let scale = 1.0 / (1i64 << (spec.bits_per_sample - 1)) as f32;
            reader.samples::<i32>().map(|s| s.map(|v| v as f32 * scale)).collect::<Result<_, _>>().map_err(|e| e.to_string())?
        }
    };
    let mono = mix_interleaved_to_mono(&interleaved, spec.channels as usize);
    Ok(Resampler::new(spec.sample_rate, 16_000).process(&mono))
}
