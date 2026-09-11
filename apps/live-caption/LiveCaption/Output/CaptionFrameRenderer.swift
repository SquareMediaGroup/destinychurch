import AppKit
import CoreGraphics
import CoreText
import Foundation

/// Rasterises caption text into a BGRA frame for the NDI output.
///
/// The background is left fully transparent on purpose: downstream (ATEM,
/// vMix, OBS) keys this over program video, so anything opaque here would
/// punch a black box into the broadcast. Legibility over unknown video
/// instead comes from stroking the glyphs — white fill, black outline — which
/// survives being composited over both a bright stage wash and a dark set.
struct CaptionFrameRenderer {
    let width: Int
    let height: Int
    let fontSize: CGFloat

    var bytesPerRow: Int { width * 4 }
    var byteCount: Int { bytesPerRow * height }

    /// Fraction of the frame height, measured from the bottom, that the
    /// caption block is allowed to occupy. Keeps captions in the lower third
    /// where broadcast convention puts them.
    private let captionRegionHeight = 0.3
    private let horizontalMarginFraction = 0.08

    /// Draws `text` into `pixels`, which must be at least `byteCount` bytes.
    /// Clears to transparent first, so an empty string yields a fully
    /// transparent frame rather than a stale one.
    func render(text: String, into pixels: UnsafeMutableRawPointer) {
        memset(pixels, 0, byteCount)

        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        guard let context = CGContext(
            data: pixels,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
        ) else { return }

        draw(text: trimmed, in: context)

        // CoreGraphics can only produce premultiplied alpha, but NDI's BGRA is
        // straight (unassociated) alpha. Left premultiplied, every antialiased
        // glyph edge would composite a dark fringe downstream.
        unpremultiply(pixels)
    }

    private func draw(text: String, in context: CGContext) {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.alignment = .center
        paragraphStyle.lineBreakMode = .byWordWrapping

        let attributes: [NSAttributedString.Key: Any] = [
            .font: CTFontCreateWithName("Helvetica-Bold" as CFString, fontSize, nil),
            .foregroundColor: CGColor(red: 1, green: 1, blue: 1, alpha: 1),
            .strokeColor: CGColor(red: 0, green: 0, blue: 0, alpha: 1),
            // Negative stroke width means "fill *and* stroke" in CoreText —
            // a positive value would render outline-only, hollow glyphs.
            .strokeWidth: -6.0,
            .paragraphStyle: paragraphStyle,
        ]

        let attributed = NSAttributedString(string: text, attributes: attributes)
        let framesetter = CTFramesetterCreateWithAttributedString(attributed)

        let horizontalMargin = Double(width) * horizontalMarginFraction
        let availableWidth = Double(width) - (horizontalMargin * 2)
        let availableHeight = Double(height) * captionRegionHeight

        let suggestedSize = CTFramesetterSuggestFrameSizeWithConstraints(
            framesetter,
            CFRange(location: 0, length: 0),
            nil,
            CGSize(width: availableWidth, height: availableHeight),
            nil
        )

        // Bottom-anchored: the block grows upward as it wraps to more lines,
        // so its baseline stays put instead of the whole caption sliding.
        let bottomInset = Double(height) * 0.06
        let textRect = CGRect(
            x: horizontalMargin,
            y: bottomInset,
            width: availableWidth,
            height: min(suggestedSize.height, availableHeight)
        )

        let path = CGPath(rect: textRect, transform: nil)
        let frame = CTFramesetterCreateFrame(framesetter, CFRange(location: 0, length: 0), path, nil)

        context.setLineJoin(.round)
        context.textMatrix = .identity
        CTFrameDraw(frame, context)
    }

    private func unpremultiply(_ pixels: UnsafeMutableRawPointer) {
        let bytes = pixels.assumingMemoryBound(to: UInt8.self)
        for pixelIndex in stride(from: 0, to: byteCount, by: 4) {
            let alpha = bytes[pixelIndex + 3]
            guard alpha > 0, alpha < 255 else { continue }
            for component in 0..<3 {
                let value = Int(bytes[pixelIndex + component]) * 255 / Int(alpha)
                bytes[pixelIndex + component] = UInt8(min(255, value))
            }
        }
    }
}
