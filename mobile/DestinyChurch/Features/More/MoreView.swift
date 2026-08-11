import SwiftUI
import MapKit

/// Everything else — built entirely from `/api/app/v1/config`, so adding,
/// removing or reordering a ChurchSuite form is a server-side JSON edit rather
/// than an App Store release.
struct MoreView: View {
    @Environment(AppConfigStore.self) private var configStore
    @Environment(\.openURL) private var openURL
    @State private var browsing: AppConfig.Form?

    var body: some View {
        NavigationStack {
            List {
                if let config = configStore.config {
                    servicesSection(config)
                    formsSection(config)
                    visitSection(config)
                    linksSection(config)
                }
                aboutSection
            }
            .navigationTitle("More")
            .sheet(item: $browsing) { form in
                BrowserView(url: form.url, title: form.title)
            }
            .task { await configStore.load() }
        }
    }

    private func servicesSection(_ config: AppConfig) -> some View {
        Section("Sundays") {
            ForEach(config.serviceTimes, id: \.self) { service in
                HStack {
                    Text(service.label)
                    Spacer()
                    Text("\(service.day) \(service.start)–\(service.end)")
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }
                .accessibilityElement(children: .combine)
            }
        }
    }

    private func formsSection(_ config: AppConfig) -> some View {
        Section("Get involved") {
            ForEach(config.forms) { form in
                Button {
                    browsing = form
                } label: {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(form.title).foregroundStyle(.primary)
                            Text(form.subtitle)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    } icon: {
                        Image(systemName: form.systemImage)
                            .foregroundStyle(Brand.accent)
                    }
                }
            }
        }
    }

    private func visitSection(_ config: AppConfig) -> some View {
        Section("Visit us") {
            VStack(alignment: .leading, spacing: 6) {
                Text(config.venue.name).font(.subheadline.weight(.semibold))
                Text(config.venue.address)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Button {
                let coordinate = CLLocationCoordinate2D(
                    latitude: config.venue.latitude,
                    longitude: config.venue.longitude
                )
                let item = MKMapItem(placemark: MKPlacemark(coordinate: coordinate))
                item.name = config.venue.name
                item.openInMaps()
            } label: {
                Label("Get directions", systemImage: "arrow.triangle.turn.up.right.circle")
            }
        }
    }

    private func linksSection(_ config: AppConfig) -> some View {
        Section("Follow") {
            Button { openURL(config.links.youtube) } label: {
                Label("YouTube", systemImage: "play.rectangle")
            }
            Button { openURL(config.links.website) } label: {
                Label("Website", systemImage: "globe")
            }
            Button { openURL(config.links.privacy) } label: {
                Label("Privacy", systemImage: "hand.raised")
            }
            Button { openURL(config.links.safeguarding) } label: {
                Label("Safeguarding", systemImage: "shield")
            }
        }
    }

    private var aboutSection: some View {
        Section {
            HStack {
                Text("Version")
                Spacer()
                Text(Self.versionLabel)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }
        }
    }

    private static var versionLabel: String {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "—"
        return "\(version) (\(build))"
    }
}

#Preview {
    MoreView()
        .environment(AppConfigStore())
        .tint(Brand.accent)
}
