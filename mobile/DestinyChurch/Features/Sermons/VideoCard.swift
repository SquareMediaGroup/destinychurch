import SwiftUI

struct VideoCard: View {
    let sermon: Sermon

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .bottomTrailing) {
                AsyncImage(url: sermon.thumbnailUrl) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Rectangle().fill(.quaternary)
                }
                .aspectRatio(16 / 9, contentMode: .fill)
                .clipped()

                if let duration = sermon.durationLabel {
                    Text(duration)
                        .font(.caption2.weight(.semibold).monospacedDigit())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(.black.opacity(0.75), in: .rect(cornerRadius: 6))
                        .padding(8)
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(sermon.title)
                    .font(.destinyCardTitle)
                    .multilineTextAlignment(.leading)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)

                HStack(spacing: 6) {
                    Text(sermon.publishedAt, format: .dateTime.day().month(.abbreviated).year())
                    if let views = sermon.viewsLabel {
                        Text("·")
                        Text(views)
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
        }
        .brandCard()
        .accessibilityElement(children: .combine)
    }
}
