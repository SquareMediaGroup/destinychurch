import Testing
import SwiftUI
@testable import Destiny_Church

/// The palette is generated from `packages/shared/src/design/tokens.ts` into
/// the asset catalog, so the failure mode worth guarding is a *missing* or
/// misnamed colorset: `Color("Whatever")` resolves to a placeholder rather
/// than throwing, so a typo in `Brand.swift` is invisible until someone looks
/// at a screenshot. Resolving each colour proves the name matches the catalog.
@MainActor
struct BrandTests {
    @Test("every brand colour resolves from the asset catalog")
    func brandColoursResolve() {
        let colours: [(String, Color)] = [
            ("accent", Brand.accent),
            ("accentPressed", Brand.accentPressed),
            ("ink", Brand.ink),
        ]
        for (name, colour) in colours {
            #expect(
                UIColor(colour) != UIColor.clear,
                "Brand.\(name) did not resolve — is the colorset name right?"
            )
        }
    }

    @Test("every pillar colour resolves")
    func pillarColoursResolve() {
        for pillar in Brand.Pillar.allCases {
            #expect(
                UIColor(pillar.color) != UIColor.clear,
                "Pillar \(pillar.rawValue) did not resolve"
            )
        }
    }

    @Test("the brand gradient wraps back to its first stop so it loops")
    func gradientLoops() {
        let stops = Brand.gradientStops
        #expect(stops.count == 6)
        #expect(UIColor(stops.first!) == UIColor(stops.last!))
    }
}
