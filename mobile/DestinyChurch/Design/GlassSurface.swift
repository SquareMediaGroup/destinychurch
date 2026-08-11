import SwiftUI

/// The single place the codebase reaches for iOS 26's Liquid Glass directly.
///
/// The app is built against the iOS 26 SDK but deploys to iOS 18, which means
/// every *standard* component — `TabView`, `NavigationStack`, toolbars, sheets,
/// `.searchable` — adopts the new material automatically on 26 and renders the
/// 18 look below, for free. Only bespoke glass needs an availability check, so
/// it is confined here: one gate in the whole app rather than one per view.
struct GlassSurface: ViewModifier {
    var cornerRadius: CGFloat = 20

    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content.glassEffect(
                .regular,
                in: .rect(cornerRadius: cornerRadius)
            )
        } else {
            content
                .background(.thinMaterial, in: .rect(cornerRadius: cornerRadius))
                .overlay(
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .strokeBorder(.white.opacity(0.18), lineWidth: 1)
                )
        }
    }
}

/// The standard opaque card: 20pt radius and the two-layer elevation the web
/// uses (`CARD_SHELL` in `components/blocks/tokens.ts`).
struct BrandCard: ViewModifier {
    var cornerRadius: CGFloat = 20

    func body(content: Content) -> some View {
        content
            .background(.background, in: .rect(cornerRadius: cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .strokeBorder(Color.primary.opacity(0.07), lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.04), radius: 1, y: 1)
            .shadow(color: .black.opacity(0.10), radius: 12, y: 8)
    }
}

extension View {
    func glassSurface(cornerRadius: CGFloat = 20) -> some View {
        modifier(GlassSurface(cornerRadius: cornerRadius))
    }

    func brandCard(cornerRadius: CGFloat = 20) -> some View {
        modifier(BrandCard(cornerRadius: cornerRadius))
    }
}
