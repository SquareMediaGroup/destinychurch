import SwiftUI

/// Third-party credits. Both vendored libraries carry attribution obligations:
/// whisper.cpp's MIT license requires its copyright notice be reproduced, and
/// the NDI SDK license requires the trademark acknowledgement.
struct AboutView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Live Caption")
                        .font(.title2.bold())
                    Text("Real-time local captioning for Destiny Church")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                    if let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String {
                        Text("Version \(version)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Divider()

                credit(
                    title: "whisper.cpp",
                    body: """
                    Speech recognition runs entirely on this Mac using whisper.cpp, \
                    Metal-accelerated. No audio ever leaves the machine.

                    Copyright (c) 2023-2024 The ggml authors. Licensed under the MIT License.
                    """
                )

                credit(
                    title: "NDI",
                    body: """
                    Network audio input and caption output use the NDI SDK.

                    NDI is a registered trademark of Vizrt NDI AB. This application \
                    embeds the NDI runtime library under the terms of the NDI SDK license.
                    """
                )
            }
            .padding(24)
        }
        .frame(width: 460, height: 420)
    }

    private func credit(title: String, body: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.headline)
            Text(body)
                .font(.callout)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
