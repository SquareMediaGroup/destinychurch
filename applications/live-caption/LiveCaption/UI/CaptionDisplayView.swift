import SwiftUI

/// The caption itself, as shown both in the operator's preview and on the
/// full-screen output display.
struct CaptionDisplayView: View {
    let text: String
    let fontSize: Double
    let backgroundOpacity: Double
    /// The preview pane is small and sits inside a normal window; the
    /// full-screen display is not. Only the latter should letterbox itself in
    /// black and reserve the lower third.
    var isFullScreen = false

    var body: some View {
        ZStack(alignment: .bottom) {
            if isFullScreen {
                Color.black.ignoresSafeArea()
            }

            if !text.isEmpty {
                captionPlate
                    .padding(.horizontal, isFullScreen ? 64 : 16)
                    .padding(.bottom, isFullScreen ? 72 : 16)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        .animation(.easeOut(duration: 0.18), value: text)
    }

    private var captionPlate: some View {
        Text(text)
            .font(.system(size: fontSize, weight: .semibold, design: .rounded))
            .foregroundStyle(.white)
            // Captions are read at a distance and often over a bright stage
            // wash; the shadow keeps them legible without a fully opaque plate.
            .shadow(color: .black.opacity(0.8), radius: 4, x: 0, y: 2)
            .multilineTextAlignment(.center)
            .lineSpacing(fontSize * 0.16)
            .frame(maxWidth: .infinity)
            .padding(.vertical, fontSize * 0.5)
            .padding(.horizontal, fontSize * 0.7)
            .captionGlassBackground(opacity: backgroundOpacity, cornerRadius: fontSize * 0.45)
            .fixedSize(horizontal: false, vertical: true)
    }
}

private extension View {
    /// Real Liquid Glass on macOS 26, falling back to a material below it.
    ///
    /// `glassEffect()` is macOS 26-only and the app deploys back to 14.0, so
    /// the fallback isn't optional — without it the caption plate would be
    /// entirely invisible on an older OS.
    @ViewBuilder
    func captionGlassBackground(opacity: Double, cornerRadius: Double) -> some View {
        if #available(macOS 26.0, *) {
            self.glassEffect(.regular.tint(.black.opacity(opacity)), in: .rect(cornerRadius: cornerRadius))
        } else {
            self.background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .fill(.black.opacity(opacity))
                    )
            )
        }
    }
}
