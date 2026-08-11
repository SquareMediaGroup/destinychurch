import SwiftUI

struct EventCard: View {
    let event: EventSeries

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            artwork
            VStack(alignment: .leading, spacing: 6) {
                Text(event.kicker)
                    .destinyEyebrowStyle()

                Text(event.name)
                    .font(.destinyCardTitle)
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)

                if let place = event.location?.name, !place.isEmpty {
                    Label(place, systemImage: "mappin.and.ellipse")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                if event.isSeries {
                    Text("\(event.sessionCount) sessions")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
        }
        .brandCard()
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var artwork: some View {
        if let url = event.thumbnailUrl {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                case .empty:
                    Rectangle().fill(.quaternary).overlay(ProgressView())
                case .failure:
                    dateChipFallback
                @unknown default:
                    dateChipFallback
                }
            }
            .frame(height: 168)
            .clipped()
        } else {
            // No artwork on the event. The website shows a brand-gradient panel
            // with a big date chip rather than a grey box, so do the same —
            // roughly a third of Destiny's events have no image.
            dateChipFallback.frame(height: 168)
        }
    }

    private var dateChipFallback: some View {
        ZStack {
            Brand.gradient
            VStack(spacing: -4) {
                Text(event.dateChip.day)
                    .font(.system(size: 46, weight: .black))
                Text(event.dateChip.month)
                    .font(.system(size: 17, weight: .heavy))
                    .tracking(2)
            }
            .foregroundStyle(.white)
            .shadow(color: .black.opacity(0.25), radius: 6, y: 2)
        }
    }
}
