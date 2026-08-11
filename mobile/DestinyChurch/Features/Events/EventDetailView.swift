import SwiftUI
import MapKit

/// An event in full.
///
/// Deliberately does no networking: the list response carries every series
/// complete, so this screen has no loading state and no way to fail.
struct EventDetailView: View {
    let event: EventSeries

    @State private var showingSignup = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                hero
                VStack(alignment: .leading, spacing: 20) {
                    header
                    if !description.isEmpty {
                        Text(description)
                            .font(.body)
                            .foregroundStyle(.primary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    if event.isSeries { sessions }
                    if let location = event.location { locationSection(location) }
                }
                .padding(.horizontal, 16)
            }
            .padding(.bottom, 32)
        }
        .navigationTitle(event.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: event.webUrl) {
                    Label("Share", systemImage: "square.and.arrow.up")
                }
            }
        }
        .safeAreaInset(edge: .bottom) { actionBar }
        .sheet(isPresented: $showingSignup) {
            if let url = event.signupUrl {
                BrowserView(url: url, title: "Sign Up")
            }
        }
    }

    /// `AttributedString(html:)` genuinely fails on malformed markup, and
    /// ChurchSuite copy is authored by hand — so always fall back to the plain
    /// summary the BFF already computed.
    private var description: String {
        guard !event.descriptionHtml.isEmpty,
              let data = event.descriptionHtml.data(using: .utf8),
              let attributed = try? NSAttributedString(
                data: data,
                options: [
                    .documentType: NSAttributedString.DocumentType.html,
                    .characterEncoding: String.Encoding.utf8.rawValue,
                ],
                documentAttributes: nil
              )
        else { return event.summary }
        let text = attributed.string.trimmingCharacters(in: .whitespacesAndNewlines)
        return text.isEmpty ? event.summary : text
    }

    @ViewBuilder
    private var hero: some View {
        if let url = event.imageUrl {
            AsyncImage(url: url) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Rectangle().fill(.quaternary)
            }
            .frame(height: 220)
            .clipped()
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let category = event.categoryName {
                Text(category).destinyEyebrowStyle()
            }
            Text(event.name)
                .font(.title2.weight(.bold))
                .fixedSize(horizontal: false, vertical: true)
            Label(event.kicker, systemImage: "calendar")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var sessions: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("All \(event.sessionCount) sessions")
                .font(.headline)
            ForEach(event.occurrences) { occurrence in
                HStack {
                    Text(occurrence.startsAt, format: .dateTime.weekday().day().month().hour().minute())
                    Spacer()
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .brandCard()
    }

    @ViewBuilder
    private func locationSection(_ location: EventSeries.Location) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Location").font(.headline)
            if let name = location.name { Text(name).font(.subheadline) }
            if let address = location.address {
                Text(address).font(.subheadline).foregroundStyle(.secondary)
            }
            if let lat = location.latitude, let lon = location.longitude {
                let coordinate = CLLocationCoordinate2D(latitude: lat, longitude: lon)
                Map(initialPosition: .region(
                    MKCoordinateRegion(
                        center: coordinate,
                        span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                    )
                )) {
                    Marker(location.name ?? event.name, coordinate: coordinate)
                        .tint(Brand.accent)
                }
                .frame(height: 160)
                .clipShape(.rect(cornerRadius: 16))
                .allowsHitTesting(false)

                Button {
                    let item = MKMapItem(placemark: MKPlacemark(coordinate: coordinate))
                    item.name = location.name ?? event.name
                    item.openInMaps()
                } label: {
                    Label("Get directions", systemImage: "arrow.triangle.turn.up.right.circle")
                }
                .buttonStyle(.bordered)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .brandCard()
    }

    private var actionBar: some View {
        HStack(spacing: 12) {
            if event.signupUrl != nil {
                Button {
                    showingSignup = true
                } label: {
                    Text("Sign Up").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
            // Sharing the .ics rather than writing to the calendar directly
            // avoids a permission prompt entirely — the Calendar app handles it.
            ShareLink(item: event.icsUrl) {
                Label("Add to Calendar", systemImage: "calendar.badge.plus")
                    .frame(maxWidth: event.signupUrl == nil ? .infinity : nil)
            }
            .buttonStyle(.bordered)
        }
        .padding(16)
        .background(.bar)
    }
}
