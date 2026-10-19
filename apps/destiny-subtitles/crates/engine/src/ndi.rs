//! NDI audio in / video out, loading `libndi` at runtime so the build needs no
//! SDK headers. The SDK is licence-gated and never committed; install it from
//! ndi.video and the dylib is found at the standard path, `NDI_LIB`, or via
//! the loader.
//!
//! The struct layouts and function names below are hand-written from the NDI
//! 5/6 C API. They have NOT yet been exercised against a real SDK or network
//! source, so treat the first run on the target Mac as the real test.

use std::ffi::{c_char, c_int, c_void, CStr, CString};
use std::ptr;
use std::time::Duration;

use libloading::Library;

const FOURCC_BGRA: u32 = u32::from_le_bytes(*b"BGRA");
const FRAME_FORMAT_PROGRESSIVE: c_int = 1;
const RECV_COLOR_FASTEST: c_int = 100;
const RECV_BANDWIDTH_AUDIO_ONLY: c_int = 10;
const FRAME_TYPE_AUDIO: c_int = 2;
const FRAME_TYPE_ERROR: c_int = 4;
const TIMECODE_SYNTHESIZE: i64 = i64::MAX;

#[repr(C)]
struct Source {
    name: *const c_char,
    url: *const c_char,
}
#[repr(C)]
struct FindCreate {
    show_local_sources: bool,
    groups: *const c_char,
    extra_ips: *const c_char,
}
#[repr(C)]
struct RecvCreateV3 {
    source: Source,
    color_format: c_int,
    bandwidth: c_int,
    allow_video_fields: bool,
    recv_name: *const c_char,
}
#[repr(C)]
struct SendCreate {
    name: *const c_char,
    groups: *const c_char,
    clock_video: bool,
    clock_audio: bool,
}
#[repr(C)]
struct VideoFrameV2 {
    xres: c_int,
    yres: c_int,
    fourcc: u32,
    frame_rate_n: c_int,
    frame_rate_d: c_int,
    picture_aspect_ratio: f32,
    frame_format_type: c_int,
    timecode: i64,
    data: *mut u8,
    line_stride_in_bytes: c_int,
    metadata: *const c_char,
    timestamp: i64,
}
#[repr(C)]
struct AudioFrameV3 {
    sample_rate: c_int,
    no_channels: c_int,
    no_samples: c_int,
    timecode: i64,
    fourcc: u32,
    data: *mut u8,
    channel_stride_in_bytes: c_int,
    metadata: *const c_char,
    timestamp: i64,
}
#[repr(C)]
struct MetadataFrame {
    length: c_int,
    timecode: i64,
    data: *mut c_char,
}

type FindCreateFn = unsafe extern "C" fn(*const FindCreate) -> *mut c_void;
type FindWaitFn = unsafe extern "C" fn(*mut c_void, u32) -> bool;
type FindGetFn = unsafe extern "C" fn(*mut c_void, *mut u32) -> *const Source;
type DestroyFn = unsafe extern "C" fn(*mut c_void);
type RecvCreateFn = unsafe extern "C" fn(*const RecvCreateV3) -> *mut c_void;
type RecvCaptureFn =
    unsafe extern "C" fn(*mut c_void, *mut VideoFrameV2, *mut AudioFrameV3, *mut MetadataFrame, u32) -> c_int;
type RecvFreeAudioFn = unsafe extern "C" fn(*mut c_void, *const AudioFrameV3);
type SendCreateFn = unsafe extern "C" fn(*const SendCreate) -> *mut c_void;
type SendVideoFn = unsafe extern "C" fn(*mut c_void, *const VideoFrameV2);

pub struct Ndi {
    lib: Library,
}

#[derive(Debug)]
pub struct NdiError(pub String);
impl std::fmt::Display for NdiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "NDI: {}", self.0)
    }
}
impl std::error::Error for NdiError {}

impl Ndi {
    /// Load libndi and initialise it (fails on CPUs the SDK does not support).
    pub fn load() -> Result<Self, NdiError> {
        let mut candidates: Vec<String> = Vec::new();
        if let Ok(p) = std::env::var("NDI_LIB") {
            candidates.push(p);
        }
        candidates.extend(
            ["/Library/NDI SDK for Apple/lib/macOS/libndi.dylib", "/usr/local/lib/libndi.dylib", "libndi.dylib", "libndi.so.6", "libndi.so"]
                .map(String::from),
        );
        let lib = candidates
            .iter()
            .find_map(|p| unsafe { Library::new(p).ok() })
            .ok_or_else(|| NdiError("libndi not found. Install the NDI SDK from ndi.video or set NDI_LIB".into()))?;
        let ndi = Ndi { lib };
        let init: unsafe extern "C" fn() -> bool = unsafe { *ndi.sym(b"NDIlib_initialize\0")? };
        if !unsafe { init() } {
            return Err(NdiError("NDIlib_initialize failed (unsupported CPU?)".into()));
        }
        Ok(ndi)
    }

    unsafe fn sym<T>(&self, name: &[u8]) -> Result<libloading::Symbol<'_, T>, NdiError> {
        self.lib.get(name).map_err(|e| NdiError(format!("missing symbol {}: {e}", String::from_utf8_lossy(name))))
    }

    /// Names of NDI sources visible on the network after waiting `wait`.
    pub fn list_sources(&self, wait: Duration) -> Result<Vec<String>, NdiError> {
        unsafe {
            let create: FindCreateFn = *self.sym(b"NDIlib_find_create_v2\0")?;
            let wait_fn: FindWaitFn = *self.sym(b"NDIlib_find_wait_for_sources\0")?;
            let get: FindGetFn = *self.sym(b"NDIlib_find_get_current_sources\0")?;
            let destroy: DestroyFn = *self.sym(b"NDIlib_find_destroy\0")?;
            let cfg = FindCreate { show_local_sources: true, groups: ptr::null(), extra_ips: ptr::null() };
            let finder = create(&cfg);
            if finder.is_null() {
                return Err(NdiError("could not create finder".into()));
            }
            wait_fn(finder, wait.as_millis() as u32);
            let mut n = 0u32;
            let list = get(finder, &mut n);
            let names = (0..n as usize)
                .map(|i| CStr::from_ptr((*list.add(i)).name).to_string_lossy().into_owned())
                .collect();
            destroy(finder);
            Ok(names)
        }
    }

    /// Connect an audio-only receiver to the named source.
    pub fn audio_receiver(&self, source_name: &str) -> Result<AudioReceiver<'_>, NdiError> {
        unsafe {
            let create: RecvCreateFn = *self.sym(b"NDIlib_recv_create_v3\0")?;
            let name = CString::new(source_name).map_err(|e| NdiError(e.to_string()))?;
            let recv_name = CString::new("Destiny Subtitles").unwrap();
            let cfg = RecvCreateV3 {
                source: Source { name: name.as_ptr(), url: ptr::null() },
                color_format: RECV_COLOR_FASTEST,
                bandwidth: RECV_BANDWIDTH_AUDIO_ONLY,
                allow_video_fields: false,
                recv_name: recv_name.as_ptr(),
            };
            let inst = create(&cfg);
            if inst.is_null() {
                return Err(NdiError("could not create receiver".into()));
            }
            Ok(AudioReceiver {
                inst,
                capture: *self.sym(b"NDIlib_recv_capture_v3\0")?,
                free_audio: *self.sym(b"NDIlib_recv_free_audio_v3\0")?,
                destroy: *self.sym(b"NDIlib_recv_destroy\0")?,
                _ndi: self,
            })
        }
    }

    pub fn video_sender(&self, name: &str, fps: u32) -> Result<VideoSender<'_>, NdiError> {
        unsafe {
            let create: SendCreateFn = *self.sym(b"NDIlib_send_create\0")?;
            let cname = CString::new(name).map_err(|e| NdiError(e.to_string()))?;
            let cfg = SendCreate { name: cname.as_ptr(), groups: ptr::null(), clock_video: true, clock_audio: false };
            let inst = create(&cfg);
            if inst.is_null() {
                return Err(NdiError("could not create sender".into()));
            }
            Ok(VideoSender {
                inst,
                fps: fps as c_int,
                send: *self.sym(b"NDIlib_send_send_video_v2\0")?,
                destroy: *self.sym(b"NDIlib_send_destroy\0")?,
                _ndi: self,
            })
        }
    }
}

impl Drop for Ndi {
    fn drop(&mut self) {
        unsafe {
            if let Ok(d) = self.sym::<unsafe extern "C" fn()>(b"NDIlib_destroy\0") {
                d();
            }
        }
    }
}

pub struct AudioChunk {
    pub sample_rate: u32,
    /// One Vec per channel (NDI delivers planar float).
    pub channels: Vec<Vec<f32>>,
}

pub struct AudioReceiver<'a> {
    inst: *mut c_void,
    capture: RecvCaptureFn,
    free_audio: RecvFreeAudioFn,
    destroy: DestroyFn,
    _ndi: &'a Ndi,
}

unsafe impl Send for AudioReceiver<'_> {}

impl AudioReceiver<'_> {
    /// Wait up to `timeout` for audio. `Ok(None)` means nothing arrived.
    pub fn next(&mut self, timeout: Duration) -> Result<Option<AudioChunk>, NdiError> {
        unsafe {
            let mut audio: AudioFrameV3 = std::mem::zeroed();
            let t = (self.capture)(self.inst, ptr::null_mut(), &mut audio, ptr::null_mut(), timeout.as_millis() as u32);
            match t {
                FRAME_TYPE_AUDIO => {
                    let n = audio.no_samples as usize;
                    let stride = audio.channel_stride_in_bytes as usize;
                    let channels = (0..audio.no_channels as usize)
                        .map(|c| {
                            let p = audio.data.add(c * stride) as *const f32;
                            std::slice::from_raw_parts(p, n).to_vec()
                        })
                        .collect();
                    let chunk = AudioChunk { sample_rate: audio.sample_rate as u32, channels };
                    (self.free_audio)(self.inst, &audio);
                    Ok(Some(chunk))
                }
                FRAME_TYPE_ERROR => Err(NdiError("receiver reported an error (source lost?)".into())),
                _ => Ok(None),
            }
        }
    }
}

impl Drop for AudioReceiver<'_> {
    fn drop(&mut self) {
        unsafe { (self.destroy)(self.inst) }
    }
}

pub struct VideoSender<'a> {
    inst: *mut c_void,
    fps: c_int,
    send: SendVideoFn,
    destroy: DestroyFn,
    _ndi: &'a Ndi,
}

unsafe impl Send for VideoSender<'_> {}

impl VideoSender<'_> {
    /// Send one straight-alpha BGRA frame. Blocks to the frame clock.
    pub fn send_bgra(&mut self, width: u32, height: u32, bgra: &[u8]) {
        assert_eq!(bgra.len(), (width * height * 4) as usize);
        let frame = VideoFrameV2 {
            xres: width as c_int,
            yres: height as c_int,
            fourcc: FOURCC_BGRA,
            frame_rate_n: self.fps,
            frame_rate_d: 1,
            picture_aspect_ratio: width as f32 / height as f32,
            frame_format_type: FRAME_FORMAT_PROGRESSIVE,
            timecode: TIMECODE_SYNTHESIZE,
            data: bgra.as_ptr() as *mut u8,
            line_stride_in_bytes: (width * 4) as c_int,
            metadata: ptr::null(),
            timestamp: 0,
        };
        // Synchronous send: NDI copies/compresses before returning, so the
        // borrow of `bgra` is enough.
        unsafe { (self.send)(self.inst, &frame) }
    }
}

impl Drop for VideoSender<'_> {
    fn drop(&mut self) {
        unsafe { (self.destroy)(self.inst) }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn struct_sizes_match_c_abi() {
        // 64-bit layouts from the NDI 5 headers.
        assert_eq!(std::mem::size_of::<Source>(), 16);
        assert_eq!(std::mem::size_of::<VideoFrameV2>(), 72);
        assert_eq!(std::mem::size_of::<AudioFrameV3>(), 64);
        assert_eq!(std::mem::size_of::<RecvCreateV3>(), 40);
        assert_eq!(FOURCC_BGRA, 0x41524742);
    }

    #[test]
    fn missing_sdk_is_a_clear_error() {
        std::env::set_var("NDI_LIB", "/nonexistent/libndi.dylib");
        if let Err(e) = Ndi::load() {
            assert!(e.0.contains("libndi") || e.0.contains("NDIlib"));
        }
    }
}
