import SwiftUI

/// The banner shown when the server answered but told us an upstream is down.
/// The copy is the server's, verbatim — see `DEGRADED_NOTICE` in lib/appApi.ts.
struct DegradedBanner: View {
    let notice: String

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Image(systemName: "exclamationmark.circle.fill")
                .foregroundStyle(Brand.accent)
                .accessibilityHidden(true)
            Text(notice)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Brand.accent.opacity(0.10), in: .rect(cornerRadius: 14))
        .padding(.horizontal, 16)
        .accessibilityElement(children: .combine)
    }
}

/// Maps a `LoadState` onto the right presentation, so five screens get one
/// consistent set of loading, empty, degraded and error states instead of five
/// hand-rolled ones.
///
/// The degraded case is the interesting one: it renders the content *and* the
/// banner, because partial data plus an honest warning beats either alone.
struct StateContainer<Value: Sendable, Content: View, Empty: View>: View {
    let state: LoadState<Value>
    let isEmpty: (Value) -> Bool
    let retry: () async -> Void
    @ViewBuilder let content: (Value) -> Content
    @ViewBuilder let empty: () -> Empty

    var body: some View {
        switch state {
        case .idle, .loading:
            ProgressView()
                .controlSize(.large)
                .frame(maxWidth: .infinity, maxHeight: .infinity)

        case .loaded(let value):
            if isEmpty(value) { empty() } else { content(value) }

        case .degraded(let value, let notice):
            VStack(spacing: 16) {
                DegradedBanner(notice: notice)
                if let value, !isEmpty(value) {
                    content(value)
                } else {
                    // Nothing survived, so the banner *is* the screen — but the
                    // user still needs a way out.
                    Spacer()
                    RetryButton(retry: retry)
                    Spacer()
                }
            }

        case .failed(let error):
            ContentUnavailableView {
                Label("Can't load this", systemImage: error.systemImage)
            } description: {
                Text(error.userMessage)
            } actions: {
                RetryButton(retry: retry)
            }
        }
    }
}

private struct RetryButton: View {
    let retry: () async -> Void

    var body: some View {
        Button("Try Again") {
            Task { await retry() }
        }
        .buttonStyle(.borderedProminent)
    }
}
