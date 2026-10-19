//! Thin shell: the UI talks to the engine through these commands only.

use std::sync::Mutex;

use engine::CaptionFormat;
use tauri::State;

struct AppState {
    formats: Vec<CaptionFormat>,
    active: Mutex<usize>,
}

#[tauri::command]
fn list_formats(state: State<AppState>) -> Vec<CaptionFormat> {
    state.formats.clone()
}

#[tauri::command]
fn active_format(state: State<AppState>) -> usize {
    *state.active.lock().unwrap()
}

/// Switch the live caption format. Later this also tells the render thread.
#[tauri::command]
fn set_active_format(index: usize, state: State<AppState>) -> Result<(), String> {
    if index >= state.formats.len() {
        return Err(format!("no format at index {index}"));
    }
    *state.active.lock().unwrap() = index;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            formats: vec![CaptionFormat::lower_third(), CaptionFormat::full_screen()],
            active: Mutex::new(0),
        })
        .invoke_handler(tauri::generate_handler![list_formats, active_format, set_active_format])
        .run(tauri::generate_context!())
        .expect("error while running Destiny Subtitles");
}
