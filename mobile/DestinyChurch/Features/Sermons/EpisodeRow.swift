import SwiftUI

struct EpisodeRow: View {
    let episode: PodcastEpisode

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            AsyncImage(url: episode.imageUrl) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Rectangle().fill(.quaternary)
            }
            .frame(width: 64, height: 64)
            .clipShape(.rect(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 4) {
                Text(episode.title)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)

                if let speaker = episode.speaker {
                    Text(speaker)
                        .font(.caption)
                        .foregroundStyle(Brand.accent)
                }

                HStack(spacing: 6) {
                    Text(episode.publishedAt, format: .dateTime.day().month(.abbreviated).year())
                    Text("·")
                    Text(episode.durationLabel)
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer(minLength: 0)
        }
        .padding(.vertical, 6)
        .accessibilityElement(children: .combine)
    }
}
