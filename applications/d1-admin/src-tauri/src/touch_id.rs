// Touch ID (or the Mac's password) before the app shows anything.
//
// D1 Admin shows safeguarding reports and people's ages, so when "Require
// Touch ID" is on (the default) it asks on launch and after waking. Uses
// LocalAuthentication's DeviceOwnerAuthentication policy: Touch ID where the
// Mac has it, the login password where it doesn't, so nobody is locked out.

#[cfg(target_os = "macos")]
pub fn authenticate(reason: &str) -> Result<bool, String> {
    use block2::RcBlock;
    use objc2::runtime::Bool;
    use objc2_foundation::{NSError, NSString};
    use objc2_local_authentication::{LAContext, LAPolicy};
    use std::sync::mpsc;

    let context = unsafe { LAContext::new() };
    let policy = LAPolicy::DeviceOwnerAuthentication;
    // No Touch ID and no password set: nothing to ask, so don't lock them out.
    if unsafe { context.canEvaluatePolicy_error(policy) }.is_err() {
        return Ok(true);
    }

    let (tx, rx) = mpsc::channel::<bool>();
    let reply = RcBlock::new(move |success: Bool, _error: *mut NSError| {
        let _ = tx.send(success.as_bool());
    });
    let reason = NSString::from_str(reason);
    unsafe { context.evaluatePolicy_localizedReason_reply(policy, &reason, &reply) };
    rx.recv().map_err(|e| e.to_string())
}

#[cfg(not(target_os = "macos"))]
pub fn authenticate(_reason: &str) -> Result<bool, String> {
    Ok(true)
}
