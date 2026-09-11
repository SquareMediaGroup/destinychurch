import Foundation
import Testing
@testable import LiveCaption

/// The NDI output can't be verified without a receiver on the network, so
/// these cover the part that can be checked locally: that the frame buffer
/// actually gets the pixels an NDI receiver would key on.
struct CaptionFrameRendererTests {
    private let renderer = CaptionFrameRenderer(width: 320, height: 180, fontSize: 28)

    private func withRenderedFrame(text: String, _ body: (UnsafeMutableRawPointer, Int) -> Void) {
        let buffer = UnsafeMutableRawPointer.allocate(byteCount: renderer.byteCount, alignment: 16)
        defer { buffer.deallocate() }
        renderer.render(text: text, into: buffer)
        body(buffer, renderer.byteCount)
    }

    @Test func emptyTextProducesAFullyTransparentFrame() {
        withRenderedFrame(text: "") { buffer, byteCount in
            let bytes = buffer.assumingMemoryBound(to: UInt8.self)
            let hasAnyOpaquePixel = stride(from: 3, to: byteCount, by: 4).contains { bytes[$0] != 0 }
            #expect(!hasAnyOpaquePixel)
        }
    }

    @Test func whitespaceOnlyTextProducesATransparentFrame() {
        withRenderedFrame(text: "   \n  ") { buffer, byteCount in
            let bytes = buffer.assumingMemoryBound(to: UInt8.self)
            let hasAnyOpaquePixel = stride(from: 3, to: byteCount, by: 4).contains { bytes[$0] != 0 }
            #expect(!hasAnyOpaquePixel)
        }
    }

    @Test func textProducesOpaqueGlyphPixelsOnATransparentBackground() {
        withRenderedFrame(text: "Amazing grace") { buffer, byteCount in
            let bytes = buffer.assumingMemoryBound(to: UInt8.self)
            let alphaValues = stride(from: 3, to: byteCount, by: 4).map { bytes[$0] }

            // Glyphs must be drawn...
            #expect(alphaValues.contains { $0 > 0 })
            // ...and the background must stay keyable, not filled in.
            #expect(alphaValues.contains { $0 == 0 })
        }
    }

    @Test func captionSitsInTheLowerPortionOfTheFrame() {
        withRenderedFrame(text: "Amazing grace") { buffer, _ in
            let bytes = buffer.assumingMemoryBound(to: UInt8.self)

            // CoreGraphics origin is bottom-left, but this buffer is handed to
            // NDI top-row-first, so row 0 here is the top of the picture.
            var topHalfOpaqueCount = 0
            var bottomHalfOpaqueCount = 0
            for row in 0..<renderer.height {
                for column in 0..<renderer.width {
                    let alpha = bytes[row * renderer.bytesPerRow + column * 4 + 3]
                    guard alpha > 0 else { continue }
                    if row < renderer.height / 2 {
                        topHalfOpaqueCount += 1
                    } else {
                        bottomHalfOpaqueCount += 1
                    }
                }
            }

            #expect(bottomHalfOpaqueCount > topHalfOpaqueCount)
        }
    }

    @Test func renderingClearsThePreviousFrame() {
        let buffer = UnsafeMutableRawPointer.allocate(byteCount: renderer.byteCount, alignment: 16)
        defer { buffer.deallocate() }

        renderer.render(text: "Amazing grace", into: buffer)
        renderer.render(text: "", into: buffer)

        // A stale caption left on screen after the text clears would be worse
        // than no caption at all.
        let bytes = buffer.assumingMemoryBound(to: UInt8.self)
        let hasAnyOpaquePixel = stride(from: 3, to: renderer.byteCount, by: 4).contains { bytes[$0] != 0 }
        #expect(!hasAnyOpaquePixel)
    }
}
