// D1 Admin — the native shell around the web UI in ../src.
//
// The shell does only what a web page can't:
//   - keeps the Supabase session in the macOS Keychain (keychain_* commands)
//   - asks for Touch ID (authenticate)
//   - a menu bar item with a popover window (the "menubar" window), and a
//     count beside the icon (set_tray_count)
//   - closing the main window hides it, so notifications keep coming while
//     the app sits in the menu bar; Quit is in the popover and the app menu
//
// Everything else (data, rules, notifications) is the web UI, through the
// Tauri plugins listed in capabilities/default.json.

mod touch_id;

use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition, RunEvent, WindowEvent,
};

const KEYCHAIN_SERVICE: &str = "uk.destinychurch.d1admin";
const TRAY_ID: &str = "d1-tray";

fn entry(key: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYCHAIN_SERVICE, key).map_err(|e| e.to_string())
}

#[tauri::command]
fn keychain_get(key: String) -> Result<Option<String>, String> {
    match entry(&key)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn keychain_set(key: String, value: String) -> Result<(), String> {
    entry(&key)?.set_password(&value).map_err(|e| e.to_string())
}

#[tauri::command]
fn keychain_delete(key: String) -> Result<(), String> {
    match entry(&key)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn authenticate(reason: String) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || touch_id::authenticate(&reason))
        .await
        .map_err(|e| e.to_string())?
}

/// The number beside the menu bar icon: things needing attention plus unread chats. 0 hides it.
#[tauri::command]
fn set_tray_count(app: AppHandle, count: u32) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let title = if count == 0 { None } else { Some(count.to_string()) };
        tray.set_title(title).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn show_main(app: AppHandle) {
    show_main_window(&app);
}

#[tauri::command]
fn hide_menubar(app: AppHandle) {
    if let Some(w) = app.get_webview_window("menubar") {
        let _ = w.hide();
    }
}

#[tauri::command]
fn quit(app: AppHandle) {
    app.exit(0);
}

fn show_main_window(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
    if let Some(w) = app.get_webview_window("menubar") {
        let _ = w.hide();
    }
}

/// Opens the popover under the menu bar icon, or closes it if it's open.
fn toggle_menubar(app: &AppHandle, icon_x: f64, icon_y: f64, icon_w: f64, icon_h: f64) {
    let Some(w) = app.get_webview_window("menubar") else { return };
    if w.is_visible().unwrap_or(false) {
        let _ = w.hide();
        return;
    }
    if let Ok(size) = w.outer_size() {
        let x = icon_x + icon_w / 2.0 - size.width as f64 / 2.0;
        let y = icon_y + icon_h + 4.0;
        let _ = w.set_position(PhysicalPosition::new(x.max(0.0), y));
    }
    let _ = w.show();
    let _ = w.set_focus();
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main_window(app)))
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .invoke_handler(tauri::generate_handler![
            keychain_get,
            keychain_set,
            keychain_delete,
            authenticate,
            set_tray_count,
            show_main,
            hide_menubar,
            quit
        ])
        .setup(|app| {
            // Opened at login: start in the menu bar, not with a window in the way.
            if std::env::args().any(|a| a == "--hidden") {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }

            let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray.png"))?;
            TrayIconBuilder::with_id(TRAY_ID)
                .icon(icon)
                .icon_as_template(true)
                .tooltip("D1 Admin")
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        rect,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        let scale = app
                            .get_webview_window("menubar")
                            .and_then(|w| w.scale_factor().ok())
                            .unwrap_or(1.0);
                        let pos = rect.position.to_physical::<f64>(scale);
                        let size = rect.size.to_physical::<f64>(scale);
                        toggle_menubar(app, pos.x, pos.y, size.width, size.height);
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| match event {
            // Closing the main window keeps D1 Admin running in the menu bar.
            WindowEvent::CloseRequested { api, .. } if window.label() == "main" => {
                api.prevent_close();
                let _ = window.hide();
            }
            // The popover behaves like a menu: clicking elsewhere closes it.
            WindowEvent::Focused(false) if window.label() == "menubar" => {
                let _ = window.hide();
            }
            _ => {}
        })
        .build(tauri::generate_context!())
        .expect("error while building D1 Admin");

    app.run(|app, event| {
        // Clicking the Dock icon brings the window back.
        #[cfg(target_os = "macos")]
        if let RunEvent::Reopen { .. } = event {
            show_main_window(app);
        }
        #[cfg(not(target_os = "macos"))]
        let _ = (app, event);
    });
}
