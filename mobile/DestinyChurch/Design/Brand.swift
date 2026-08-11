import SwiftUI

/// The Destiny Church palette.
///
/// Every colour resolves from the asset catalog, and those colorsets are
/// generated from `packages/shared/src/design/tokens.ts` by
/// `scripts/generate-ios-assets.mjs`. That is deliberate: the web app and the
/// iOS app read one source of truth, so the brand cannot drift between them.
/// Do not hardcode a hex value here — change the token and regenerate.
enum Brand {
    /// Orange — the brand's preferred accent. Also the app's global tint.
    static let accent = Color("BrandAccent")
    /// Pressed/hover shade of the accent.
    static let accentPressed = Color("BrandAccentPressed")
    /// "Bluish Grey" — the brand's dark neutral, and the web foreground colour.
    static let ink = Color("BrandInk")

    /// The Five Pillars. Each maps to one logo colour and one meaning.
    enum Pillar: String, CaseIterable {
        case magnify, mission, ministry, membership, maturity

        var color: Color {
            switch self {
            case .magnify: Color("PillarMagnify")
            case .mission: Color("PillarMission")
            case .ministry: Color("PillarMinistry")
            case .membership: Color("PillarMembership")
            case .maturity: Color("PillarMaturity")
            }
        }

        var label: String { rawValue.capitalized }
    }

    /// The rainbow brand gradient used on the logo mark and across the web.
    /// Ordered stops, wrapping back to orange so it loops seamlessly.
    static let gradientStops: [Color] = [
        Color("PillarMembership"), // orange
        Color("PillarMagnify"),    // red
        Color("PillarMinistry"),   // purple
        Color("PillarMission"),    // blue
        Color("PillarMaturity"),   // green
        Color("PillarMembership"),
    ]

    static let gradient = LinearGradient(
        colors: gradientStops,
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
