// Prevents an extra console window on Windows in release. Mac only, but this
// keeps `cargo check` quiet everywhere.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    destiny_subtitles_lib::run()
}
