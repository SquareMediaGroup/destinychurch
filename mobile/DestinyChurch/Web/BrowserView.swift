import SwiftUI
@preconcurrency import WebKit

/// A ChurchSuite page under native chrome.
///
/// `WKWebView` rather than `SFSafariViewController` on purpose: Safari View
/// Controller brings its own chrome, which would cost us the native nav bar,
/// the branded error state, and any control over the presentation. For the
/// giving flow specifically, App Review expects an external payment page to
/// look plainly like a web page rather than a native-looking form — so a
/// visibly-web screen is the right answer as well as the practical one.
struct BrowserView: View {
    let url: URL
    var title: String

    @State private var progress: Double = 0
    @State private var isLoading = true
    @State private var failure: String?
    @Environment(\.openURL) private var openURL

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                if let failure {
                    ContentUnavailableView {
                        Label("Can't load this page", systemImage: "wifi.exclamationmark")
                    } description: {
                        Text(failure)
                    } actions: {
                        Button("Open in Safari") { openURL(url) }
                            .buttonStyle(.borderedProminent)
                    }
                } else {
                    WebView(
                        url: url,
                        progress: $progress,
                        isLoading: $isLoading,
                        failure: $failure
                    )
                    .ignoresSafeArea(edges: .bottom)

                    if isLoading {
                        ProgressView(value: progress)
                            .progressViewStyle(.linear)
                            .tint(Brand.accent)
                    }
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        openURL(url)
                    } label: {
                        Label("Open in Safari", systemImage: "safari")
                    }
                }
            }
        }
    }
}

private struct WebView: UIViewRepresentable {
    let url: URL
    @Binding var progress: Double
    @Binding var isLoading: Bool
    @Binding var failure: String?

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        context.coordinator.observe(webView)
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        coordinator.stopObserving()
        webView.stopLoading()
        webView.navigationDelegate = nil
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        private let parent: WebView
        private var progressObservation: NSKeyValueObservation?

        init(_ parent: WebView) {
            self.parent = parent
        }

        func observe(_ webView: WKWebView) {
            progressObservation = webView.observe(\.estimatedProgress, options: [.new]) { [parent] _, change in
                guard let value = change.newValue else { return }
                Task { @MainActor in parent.progress = value }
            }
        }

        func stopObserving() {
            progressObservation?.invalidate()
            progressObservation = nil
        }

        @MainActor
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.isLoading = false
        }

        /// Surface a load failure as a native error rather than letting WebKit
        /// show its grey "cannot open page" — during a ChurchSuite outage that
        /// reads to a member as though the app itself is broken.
        @MainActor
        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: any Error
        ) {
            // -999 is "a newer navigation superseded this one", not a failure.
            guard (error as NSError).code != NSURLErrorCancelled else { return }
            parent.isLoading = false
            parent.failure = error.localizedDescription
        }

        @MainActor
        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction
        ) async -> WKNavigationActionPolicy {
            guard let target = navigationAction.request.url,
                  let scheme = target.scheme?.lowercased()
            else { return .allow }

            // Hand mail and phone links to the system; a WebView cannot open them.
            if scheme == "mailto" || scheme == "tel" {
                await UIApplication.shared.open(target)
                return .cancel
            }
            return .allow
        }
    }
}
