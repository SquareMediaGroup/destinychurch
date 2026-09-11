import Foundation

/// Publishes the live caption as an NDI video source with alpha, so a switcher
/// (ATEM, vMix, OBS) can key it straight over program video without the Mac
/// needing a physical output feed.
///
/// NDI receivers expect a continuous stream at a stable frame rate, not frames
/// only when the text changes — a source that goes quiet reads as dropped.
/// So a dedicated thread sends continuously at `frameRate`, re-sending the
/// last rendered frame, while re-rasterisation happens only when the caption
/// text actually changes (rendering 1920x1080 thirty times a second to draw
/// the same sentence would be pure waste).
///
/// `@unchecked Sendable`: the pixel buffers are shared between the caller's
/// thread and the send thread, guarded by `lock` — an invariant the compiler
/// can't verify but which every access below honours.
final class NDIOutputPublisher: @unchecked Sendable {
    private let renderer: CaptionFrameRenderer
    private let sourceName: String
    private let groups: String
    private let frameRate: Int

    private var sender: NDIlib_send_instance_t?
    private var sendThread: Thread?
    /// Guarded by `lock` — read by the send thread every frame, written by
    /// whichever thread calls `stop()`.
    private var isRunning = false
    /// Signalled by the send loop as it exits, so `stop()` can wait for the
    /// thread to stop touching the pixel buffers before freeing them.
    private let sendThreadDidExit = DispatchSemaphore(value: 0)

    private let lock = NSLock()
    /// Written by `update(text:)`, consumed by the send thread.
    private var pendingPixels: UnsafeMutableRawPointer?
    private var hasPendingFrame = false
    /// Owned by the send thread; only ever written while holding `lock`.
    private var sendPixels: UnsafeMutableRawPointer?

    /// Serialises rasterisation off the main thread — CoreText layout of a
    /// full-width caption is milliseconds, not microseconds, and the caller is
    /// the MainActor.
    private let renderQueue = DispatchQueue(label: "uk.destinytees.livecaption.ndi-render", qos: .userInitiated)

    convenience init(configuration: NDIOutputConfiguration, frameRate: Int = 30) {
        self.init(
            sourceName: configuration.name,
            width: configuration.width,
            height: configuration.height,
            fontSize: configuration.fontSize,
            groups: configuration.groups,
            frameRate: frameRate
        )
    }

    init(sourceName: String, width: Int, height: Int, fontSize: CGFloat, groups: String = "", frameRate: Int = 30) {
        self.sourceName = sourceName
        self.groups = groups
        self.frameRate = frameRate
        self.renderer = CaptionFrameRenderer(width: width, height: height, fontSize: fontSize)
    }

    deinit {
        stop()
    }

    func start() throws {
        guard !isRunning else { return }

        let sourceNamePointer: UnsafeMutablePointer<CChar>? = sourceName.withCString { strdup($0) }
        defer { sourceNamePointer.map { free($0) } }

        // NULL groups means NDI's default group. An empty string is not the
        // same thing — it would publish into a group literally named "".
        let trimmedGroups = groups.trimmingCharacters(in: .whitespaces)
        let groupsPointer: UnsafeMutablePointer<CChar>? = trimmedGroups.isEmpty
            ? nil
            : trimmedGroups.withCString { strdup($0) }
        defer { groupsPointer.map { free($0) } }

        var createSettings = NDIlib_send_create_t()
        createSettings.p_ndi_name = UnsafePointer(sourceNamePointer)
        createSettings.p_groups = groupsPointer.map { UnsafePointer($0) }
        // Let NDI pace the send thread to `frameRate` rather than spinning a
        // timer ourselves and drifting against it.
        createSettings.clock_video = true
        createSettings.clock_audio = false

        guard let sender = NDIlib_send_create(&createSettings) else {
            throw NDIOutputError.senderCreationFailed
        }
        self.sender = sender

        pendingPixels = .allocate(byteCount: renderer.byteCount, alignment: 16)
        sendPixels = .allocate(byteCount: renderer.byteCount, alignment: 16)
        memset(pendingPixels!, 0, renderer.byteCount)
        memset(sendPixels!, 0, renderer.byteCount)

        lock.lock()
        isRunning = true
        lock.unlock()

        let thread = Thread { [weak self] in self?.sendLoop() }
        thread.name = "NDIOutputPublisher.send"
        thread.qualityOfService = .userInitiated
        sendThread = thread
        thread.start()
    }

    func stop() {
        lock.lock()
        guard isRunning else {
            lock.unlock()
            return
        }
        isRunning = false
        lock.unlock()

        // The send thread uses the pixel buffers and the sender handle
        // *outside* the lock while NDI encodes a frame, so freeing either one
        // on a timer would be a use-after-free whenever a send overran. Wait
        // for the thread to actually exit. The timeout is a backstop against
        // a wedged SDK call, not the expected path — a send is one frame
        // period.
        _ = sendThreadDidExit.wait(timeout: .now() + 2.0)
        sendThread = nil

        if let sender {
            NDIlib_send_destroy(sender)
            self.sender = nil
        }

        lock.lock()
        pendingPixels?.deallocate()
        sendPixels?.deallocate()
        pendingPixels = nil
        sendPixels = nil
        lock.unlock()
    }

    /// Re-rasterises the caption. Safe to call as often as the text changes;
    /// only the most recent text is ever sent.
    func update(text: String) {
        renderQueue.async { [weak self] in
            guard let self else { return }
            self.lock.lock()
            defer { self.lock.unlock() }
            // Re-checked under the lock: `stop()` may have run between this
            // being queued and it executing, freeing the buffer.
            guard self.isRunning, let pendingPixels = self.pendingPixels else { return }
            self.renderer.render(text: text, into: pendingPixels)
            self.hasPendingFrame = true
        }
    }

    private func sendLoop() {
        defer { sendThreadDidExit.signal() }
        guard let sender else { return }

        var frame = NDIlib_video_frame_v2_t()
        frame.xres = Int32(renderer.width)
        frame.yres = Int32(renderer.height)
        frame.FourCC = NDIlib_FourCC_video_type_BGRA
        frame.frame_rate_N = Int32(frameRate)
        frame.frame_rate_D = 1
        frame.picture_aspect_ratio = 0 // square pixels
        frame.frame_format_type = NDIlib_frame_format_type_progressive
        frame.line_stride_in_bytes = Int32(renderer.bytesPerRow)
        frame.p_metadata = nil

        while true {
            lock.lock()
            guard isRunning, let sendPixels else {
                lock.unlock()
                return
            }
            if hasPendingFrame, let pendingPixels {
                memcpy(sendPixels, pendingPixels, renderer.byteCount)
                hasPendingFrame = false
            }
            lock.unlock()

            frame.p_data = sendPixels.assumingMemoryBound(to: UInt8.self)
            // Synchronous send: the SDK is done with `p_data` when this
            // returns, so the buffer can be safely rewritten on the next pass.
            // `clock_video` makes this block to pace the stream.
            NDIlib_send_send_video_v2(sender, &frame)
        }
    }
}

enum NDIOutputError: Error {
    case senderCreationFailed
}
