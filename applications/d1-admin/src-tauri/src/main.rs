// Prevents an extra console window on Windows in release. D1 Admin is Mac
// only, but this keeps `cargo check` quiet everywhere.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    d1_admin_lib::run()
}
