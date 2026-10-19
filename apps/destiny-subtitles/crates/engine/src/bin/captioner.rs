//! Command-line captioner: the engine end to end, without the UI.
//!
//!   captioner sources
//!   captioner wav  <file.wav> --model <ggml.bin> [--lang en] [--png out.png]
//!   captioner run  --in <NDI audio source> --out <NDI name> --model <ggml.bin>
//!                  [--fps 25] [--width 1920] [--height 1080] [--lang en]
//!
//! `wav` replays a recording faster than real time and reports the real-time
//! factor (RTF = processing time / audio time; must stay well under 1, and the
//! project target is 0.5 or lower on the Apple Silicon Mac).

use std::path::PathBuf;
use std::sync::{mpsc, Arc, Mutex};
use std::time::{Duration, Instant};

use engine::format::CaptionFormat;
use engine::ndi::Ndi;
use engine::render::{save_bgra_png, CaptionRenderer};
use engine::resample::{mix_planar_to_mono, Resampler};
use engine::speech::{SpeechEngine, SpeechError};
use engine::vocabulary::{build_prompt, BIBLE_BOOKS};
use engine::{Stabilizer, StreamingTranscriber, TranscriptEvent};

type Res<T> = Result<T, Box<dyn std::error::Error>>;

fn main() {
    if let Err(e) = real_main() {
        eprintln!("error: {e}");
        std::process::exit(1);
    }
}

struct Args(Vec<String>);
impl Args {
    fn opt(&self, name: &str) -> Option<&str> {
        self.0.iter().position(|a| a == name).and_then(|i| self.0.get(i + 1)).map(String::as_str)
    }
    fn req(&self, name: &str) -> Res<&str> {
        self.opt(name).ok_or_else(|| format!("missing {name}").into())
    }
    fn num<T: std::str::FromStr>(&self, name: &str, default: T) -> Res<T> {
        match self.opt(name) {
            None => Ok(default),
            Some(v) => v.parse().map_err(|_| format!("bad value for {name}: {v}").into()),
        }
    }
}

fn real_main() -> Res<()> {
    let raw: Vec<String> = std::env::args().skip(1).collect();
    let args = Args(raw.clone());
    match raw.first().map(String::as_str) {
        Some("sources") => sources(),
        Some("wav") => wav(raw.get(1).ok_or("usage: captioner wav <file.wav> --model <ggml.bin>")?, &args),
        Some("run") => run(&args),
        _ => Err("usage: captioner sources | wav <file> --model M | run --in NAME --out NAME --model M".into()),
    }
}

fn prompt() -> String {
    let vocab: Vec<String> = BIBLE_BOOKS.iter().map(|s| s.to_string()).collect();
    build_prompt("Church sermon at Destiny Church.", &vocab)
}

#[cfg(feature = "whisper")]
fn make_engine(model: &str, lang: &str) -> Result<Box<dyn SpeechEngine>, SpeechError> {
    Ok(Box::new(engine::whisper::WhisperEngine::load(std::path::Path::new(model), lang)?))
}

#[cfg(not(feature = "whisper"))]
fn make_engine(_model: &str, _lang: &str) -> Result<Box<dyn SpeechEngine>, SpeechError> {
    Err(SpeechError("built without the `whisper` feature: rebuild with --features metal (Apple Silicon) or --features whisper".into()))
}

fn sources() -> Res<()> {
    let ndi = Ndi::load()?;
    println!("Looking for NDI sources for 3 s...");
    for s in ndi.list_sources(Duration::from_secs(3))? {
        println!("  {s}");
    }
    Ok(())
}

fn wav(path: &str, args: &Args) -> Res<()> {
    let samples = engine::wav::load_mono_16k(&PathBuf::from(path))?;
    let audio_secs = samples.len() as f64 / 16_000.0;
    let mut engine = make_engine(args.req("--model")?, args.opt("--lang").unwrap_or("en"))?;
    // Warm up so model load and first-run setup are not counted as RTF.
    let _ = engine.transcribe(&samples[..16_000.min(samples.len())], "");

    let mut t = StreamingTranscriber::new(engine, prompt());
    let mut stab = Stabilizer::new(Duration::ZERO);
    let started = Instant::now();
    let mut window_times: Vec<f64> = Vec::new();
    let mut last_window_start = Instant::now();
    for chunk in samples.chunks(1_600) {
        let before = t.window_counter();
        for ev in t.push(chunk, Instant::now()) {
            if args.0.iter().any(|a| a == "--verbose") {
                match &ev {
                    TranscriptEvent::Partial { words, window_id } => {
                        let w: Vec<String> = words.iter().map(|w| format!("{}@{:.1}", w.text, w.start_time)).collect();
                        eprintln!("[window {window_id} start {:.1}] partial: {}", t.last_window_start(), w.join(" "));
                    }
                    TranscriptEvent::Finalized { words, segment_id } => {
                        let w: Vec<String> = words.iter().map(|w| format!("{}@{:.1}", w.text, w.start_time)).collect();
                        eprintln!("  final #{segment_id}: {}", w.join(" "));
                    }
                }
            }
            stab.ingest(ev);
        }
        if t.window_counter() != before {
            window_times.push(last_window_start.elapsed().as_secs_f64());
            last_window_start = Instant::now();
        }
    }
    for ev in t.finish(Instant::now()) {
        stab.ingest(ev);
    }
    let elapsed = started.elapsed().as_secs_f64();

    let words = stab.display_words(Instant::now(), None);
    let text = words.iter().map(|w| w.text.as_str()).collect::<Vec<_>>().join(" ");
    println!("{text}\n");
    println!("audio {audio_secs:.1} s, processing {elapsed:.1} s, RTF {:.2}", elapsed / audio_secs);
    println!("windows {}, failed {}", window_times.len(), t.failed_windows);

    if let Some(png) = args.opt("--png") {
        let format = CaptionFormat::lower_third();
        let tail: Vec<&str> = words.iter().map(|w| w.text.as_str()).collect();
        let lines = format.wrap(tail);
        let mut r = CaptionRenderer::new(1920, 1080);
        let frame = r.render(&lines, format.font_px);
        save_bgra_png(1920, 1080, &frame, &PathBuf::from(png))?;
        println!("wrote {png}");
    }
    Ok(())
}

fn run(args: &Args) -> Res<()> {
    let in_name = args.req("--in")?.to_string();
    let out_name = args.req("--out")?.to_string();
    let model = args.req("--model")?.to_string();
    let lang = args.opt("--lang").unwrap_or("en").to_string();
    let fps: u32 = args.num("--fps", 25)?;
    let (width, height): (u32, u32) = (args.num("--width", 1920)?, args.num("--height", 1080)?);
    let format = CaptionFormat::lower_third();

    let ndi = Ndi::load()?;
    let stab = Arc::new(Mutex::new(Stabilizer::new(Duration::from_millis(400))));
    let (tx, rx) = mpsc::sync_channel::<Vec<f32>>(64);

    std::thread::scope(|scope| -> Res<()> {
        // Audio in -> 16 kHz mono chunks.
        let mut receiver = ndi.audio_receiver(&in_name)?;
        scope.spawn(move || {
            let mut resampler: Option<(u32, Resampler)> = None;
            loop {
                match receiver.next(Duration::from_millis(500)) {
                    Ok(Some(chunk)) => {
                        let refs: Vec<&[f32]> = chunk.channels.iter().map(Vec::as_slice).collect();
                        let mono = mix_planar_to_mono(&refs);
                        if resampler.as_ref().map(|(r, _)| *r) != Some(chunk.sample_rate) {
                            resampler = Some((chunk.sample_rate, Resampler::new(chunk.sample_rate, 16_000)));
                        }
                        let out = resampler.as_mut().unwrap().1.process(&mono);
                        // Never block audio capture: drop if the model has fallen behind.
                        let _ = tx.try_send(out);
                    }
                    Ok(None) => {}
                    Err(e) => {
                        eprintln!("{e}");
                        std::thread::sleep(Duration::from_secs(1));
                    }
                }
            }
        });

        // Speech: model load happens on this thread, then windows run.
        let stab_t = Arc::clone(&stab);
        scope.spawn(move || {
            let engine = match make_engine(&model, &lang) {
                Ok(e) => e,
                Err(e) => {
                    eprintln!("{e}");
                    std::process::exit(1);
                }
            };
            eprintln!("model loaded, listening");
            let mut t = StreamingTranscriber::new(engine, prompt());
            while let Ok(chunk) = rx.recv() {
                let events: Vec<TranscriptEvent> = t.push(&chunk, Instant::now());
                let mut s = stab_t.lock().unwrap();
                for ev in events {
                    s.ingest(ev);
                }
            }
        });

        // Video out: re-render only when the text changes; the sender paces to fps.
        let mut sender = ndi.video_sender(&out_name, fps)?;
        let mut renderer = CaptionRenderer::new(width, height);
        let mut last_text = String::from("\u{0}");
        let mut frame = renderer.render(&[], format.font_px);
        eprintln!("sending NDI '{out_name}' {width}x{height} @ {fps} fps");
        loop {
            let lines = {
                let s = stab.lock().unwrap();
                let words = s.display_words(Instant::now(), Some(60));
                format.wrap(words.iter().map(|w| w.text.as_str()))
            };
            let text = lines.join("\n");
            if text != last_text {
                frame = renderer.render(&lines, format.font_px);
                last_text = text;
            }
            sender.send_bgra(width, height, &frame);
        }
    })
}
