import SwiftUI

/// Type styles.
///
/// The website ships Roboto for body and Arial for headings. On iOS the right
/// native substitution for both is San Francisco — it is what users' Dynamic
/// Type settings, optical sizing and accessibility features are tuned for, and
/// `packages/shared/src/design/tokens.ts` already says as much. So the only
/// custom face we bundle is Anton, the display/hero font.
///
/// Anton is always registered with `relativeTo:` so it still scales with
/// Dynamic Type. A fixed-size custom font is an accessibility bug.
extension Font {
    /// Display/hero — Anton. Used sparingly: hero headers only, per the brand
    /// rules. Everywhere else use a heavy system weight, never Anton.
    ///
    /// Anton is not yet bundled (see the TODO in Info.plist), so this currently
    /// resolves to a heavy system face. `Font.custom` falls back silently on a
    /// missing family, but going through this one accessor means adding the
    /// font later is a one-line change rather than a hunt through the views.
    static func destinyDisplay(_ size: CGFloat, relativeTo style: TextStyle = .largeTitle) -> Font {
        .system(size: size, weight: .black, design: .default)
    }

    /// Section eyebrow — the small uppercase label above a heading.
    static var destinyEyebrow: Font {
        .system(.caption, design: .default, weight: .bold)
    }

    /// Card title.
    static var destinyCardTitle: Font {
        .system(.headline, design: .default, weight: .semibold)
    }
}

extension Text {
    /// The brand's eyebrow treatment: small, bold, uppercase, wide-tracked,
    /// accent-coloured. Mirrors `EYEBROW` in `components/blocks/tokens.ts`.
    func destinyEyebrowStyle() -> some View {
        self
            .font(.destinyEyebrow)
            .textCase(.uppercase)
            .tracking(1.2)
            .foregroundStyle(Brand.accent)
    }
}
