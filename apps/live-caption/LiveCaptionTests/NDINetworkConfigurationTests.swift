import Foundation
import Testing
@testable import LiveCaption

struct NDINetworkConfigurationTests {
    @Test func defaultWritesNothing() {
        let configuration = NDINetworkConfiguration()
        #expect(configuration.isDefault)
        let ndi = configuration.configJSON()["ndi"] as? [String: Any]
        #expect(ndi?.isEmpty == true)
    }

    @Test func writesDiscoveryAdaptersAndMulticast() {
        var configuration = NDINetworkConfiguration()
        configuration.discoveryServers = "192.168.10.5, 192.168.10.6:5959"
        configuration.extraSourceIPs = "192.168.20.40"
        configuration.allowedAdapters = "192.168.10.20"
        configuration.multicastEnabled = true

        let ndi = configuration.configJSON()["ndi"] as? [String: Any]
        let networks = ndi?["networks"] as? [String: Any]
        #expect(networks?["discovery"] as? String == "192.168.10.5,192.168.10.6:5959")
        #expect(networks?["ips"] as? String == "192.168.20.40")
        #expect((ndi?["adapters"] as? [String: Any])?["allowed"] as? [String] == ["192.168.10.20"])

        let send = (ndi?["multicast"] as? [String: Any])?["send"] as? [String: Any]
        #expect(send?["enable"] as? Bool == true)
        #expect(send?["netprefix"] as? String == "239.255.0.0")
        #expect(send?["ttl"] as? Int == 1)
    }

    @Test func rejectsAdapterThisMacDoesNotHave() {
        var configuration = NDINetworkConfiguration()
        configuration.allowedAdapters = "192.168.10.20"
        #expect(!configuration.validationErrors(localAddresses: ["10.0.0.4"]).isEmpty)
        #expect(configuration.validationErrors(localAddresses: ["192.168.10.20"]).isEmpty)
    }

    @Test func rejectsMalformedAddresses() {
        var configuration = NDINetworkConfiguration()
        configuration.discoveryServers = "ndi-server.local"
        configuration.extraSourceIPs = "192.168.1.300"
        #expect(configuration.validationErrors(localAddresses: []).count == 2)
    }

    @Test func ipv4Parsing() {
        #expect(NDINetworkConfiguration.isIPv4("239.255.0.0"))
        #expect(!NDINetworkConfiguration.isIPv4("1.2.3"))
        #expect(!NDINetworkConfiguration.isIPv4("1.2.3.4.5"))
        #expect(!NDINetworkConfiguration.isIPv4("a.b.c.d"))
    }
}
