import Foundation

/// Where NDI traffic goes on the network — which interface it leaves from,
/// which machines and discovery servers it talks to, and whether video is
/// sent multicast. These are process-wide in the NDI SDK (the standard SDK has
/// no per-sender override; that's the Advanced SDK's `p_config_json`), so they
/// live here once rather than on each `NDIOutputConfiguration`, and apply to
/// the NDI input as well as every NDI output.
///
/// NDI is pull-based: a receiver (ATEM, vMix, OBS, ProPresenter) connects to
/// this Mac, not the other way round. So "send to these IPs" in NDI terms is
/// done by (a) binding to the right network interface, (b) registering with a
/// Discovery Server the receivers also use, or (c) multicast to a chosen
/// address range. Ports are fixed by the SDK (see `README.md` > NDI network)
/// and are not configurable in the standard SDK.
struct NDINetworkConfiguration: Codable, Hashable, Sendable {
    /// Comma-separated NDI Discovery Server addresses (`ip` or `ip:port`).
    /// Needed when receivers are on another subnet or mDNS is blocked.
    var discoveryServers: String = ""
    /// Comma-separated IPs of machines to query directly for NDI sources,
    /// without mDNS — e.g. the sound desk's Dante/NDI bridge on another VLAN.
    var extraSourceIPs: String = ""
    /// Comma-separated local IP addresses NDI may use. Empty means every
    /// interface. Set this when the Mac has Wi-Fi and a wired AV network, so
    /// captions don't go out (or get advertised) on the wrong one. Listing an
    /// address this Mac doesn't have stops NDI working, so it's validated
    /// before being written.
    var allowedAdapters: String = ""
    var multicastEnabled: Bool = false
    /// First address of the multicast range NDI picks stream groups from.
    var multicastPrefix: String = "239.255.0.0"
    var multicastNetmask: String = "255.255.0.0"
    /// Router hops multicast may cross. 1 keeps it on the local subnet.
    var multicastTTL: Int = 1

    /// True when every field is at its default, i.e. there's nothing to
    /// override and NDI should keep using the machine-wide config (written by
    /// NDI Tools / Access Manager) untouched.
    var isDefault: Bool { self == NDINetworkConfiguration() }

    static func list(_ commaSeparated: String) -> [String] {
        commaSeparated
            .split(whereSeparator: { $0 == "," || $0 == " " || $0 == "\n" })
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }

    /// The `ndi-config.v1.json` body the NDI SDK reads at start-up. Only keys
    /// with a non-default value are written, so anything left alone keeps the
    /// SDK's own default rather than one guessed here.
    func configJSON() -> [String: Any] {
        var ndi: [String: Any] = [:]

        var networks: [String: Any] = [:]
        let discovery = Self.list(discoveryServers)
        if !discovery.isEmpty { networks["discovery"] = discovery.joined(separator: ",") }
        let ips = Self.list(extraSourceIPs)
        if !ips.isEmpty { networks["ips"] = ips.joined(separator: ",") }
        if !networks.isEmpty { ndi["networks"] = networks }

        let adapters = Self.list(allowedAdapters)
        if !adapters.isEmpty { ndi["adapters"] = ["allowed": adapters] }

        if multicastEnabled {
            ndi["multicast"] = [
                "send": [
                    "enable": true,
                    "netprefix": multicastPrefix.trimmingCharacters(in: .whitespaces),
                    "netmask": multicastNetmask.trimmingCharacters(in: .whitespaces),
                    "ttl": max(1, multicastTTL),
                ] as [String: Any],
            ]
        }

        return ["ndi": ndi]
    }

    /// Problems an operator must fix before these settings are safe to use.
    /// Empty means valid. `localAddresses` is injectable for tests.
    func validationErrors(localAddresses: Set<String> = NDIRuntime.localIPv4Addresses()) -> [String] {
        var errors: [String] = []

        for address in Self.list(discoveryServers) {
            let host = address.split(separator: ":").first.map(String.init) ?? address
            if !Self.isIPv4(host) { errors.append("Discovery server \"\(address)\" is not an IPv4 address.") }
        }
        for address in Self.list(extraSourceIPs) where !Self.isIPv4(address) {
            errors.append("Source IP \"\(address)\" is not an IPv4 address.")
        }
        for address in Self.list(allowedAdapters) {
            if !Self.isIPv4(address) {
                errors.append("Network interface \"\(address)\" is not an IPv4 address.")
            } else if !localAddresses.contains(address) {
                errors.append("This Mac has no network interface with the address \(address).")
            }
        }
        if multicastEnabled {
            if !Self.isIPv4(multicastPrefix) { errors.append("Multicast prefix is not an IPv4 address.") }
            if !Self.isIPv4(multicastNetmask) { errors.append("Multicast netmask is not an IPv4 address.") }
        }
        return errors
    }

    static func isIPv4(_ string: String) -> Bool {
        let parts = string.split(separator: ".", omittingEmptySubsequences: false)
        guard parts.count == 4 else { return false }
        return parts.allSatisfy { part in
            guard !part.isEmpty, part.count <= 3, let value = Int(part) else { return false }
            return (0...255).contains(value)
        }
    }
}

/// One-time NDI library start-up. The SDK reads its network config once, when
/// the library is first used, so this must run before any `NDIlib_*` call —
/// `AppState.init` is the first thing that can make one.
enum NDIRuntime {
    /// Where the app's own `ndi-config.v1.json` lives, when it has one.
    static var configDirectory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("Live Caption/NDI", isDirectory: true)
    }

    /// Writes the app's NDI config (if any setting differs from default) and
    /// points the SDK at it via `NDI_CONFIG_DIR`, then initialises the
    /// library. Returns a message for the operator when the settings were
    /// invalid and were therefore not applied.
    @discardableResult
    static func initialize(with configuration: NDINetworkConfiguration) -> String? {
        var problem: String?

        if !configuration.isDefault {
            let errors = configuration.validationErrors()
            if errors.isEmpty {
                do {
                    try write(configuration)
                    setenv("NDI_CONFIG_DIR", configDirectory.path, 1)
                } catch {
                    problem = "Could not write the NDI network settings: \(error.localizedDescription)"
                }
            } else {
                problem = "NDI network settings were not applied: " + errors.joined(separator: " ")
            }
        }

        // Not strictly required by the SDK, but it's the documented way to
        // load the library up front and it reports an unsupported CPU.
        if !NDIlib_initialize() {
            problem = (problem.map { $0 + " " } ?? "") + "The NDI library could not start on this Mac."
        }
        return problem
    }

    private static func write(_ configuration: NDINetworkConfiguration) throws {
        try FileManager.default.createDirectory(at: configDirectory, withIntermediateDirectories: true)
        let data = try JSONSerialization.data(
            withJSONObject: configuration.configJSON(),
            options: [.prettyPrinted, .sortedKeys]
        )
        try data.write(to: configDirectory.appendingPathComponent("ndi-config.v1.json"), options: .atomic)
    }

    /// IPv4 addresses of this Mac's interfaces that are up, for validating
    /// `allowedAdapters` and showing the operator what to pick from.
    static func localIPv4Addresses() -> Set<String> {
        var addresses = Set<String>()
        var head: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&head) == 0, let first = head else { return addresses }
        defer { freeifaddrs(head) }

        for pointer in sequence(first: first, next: { $0.pointee.ifa_next }) {
            let interface = pointer.pointee
            guard let address = interface.ifa_addr,
                  address.pointee.sa_family == UInt8(AF_INET),
                  (Int32(bitPattern: interface.ifa_flags) & IFF_UP) != 0,
                  (Int32(bitPattern: interface.ifa_flags) & IFF_LOOPBACK) == 0
            else { continue }

            var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            let result = getnameinfo(
                address, socklen_t(address.pointee.sa_len),
                &host, socklen_t(host.count),
                nil, 0, NI_NUMERICHOST
            )
            if result == 0 {
                let bytes = host.prefix { $0 != 0 }.map { UInt8(bitPattern: $0) }
                addresses.insert(String(decoding: bytes, as: UTF8.self))
            }
        }
        return addresses
    }
}
