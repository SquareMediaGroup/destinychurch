# Destiny Church iOS — build entry points.
#
# DerivedData is redirected to the external SSD: the internal volume on this
# machine runs close to full, and DerivedData for an iOS app grows to several GB.

DD          := /Volumes/1TB SSD/DerivedData
PROJECT     := DestinyChurch.xcodeproj
SCHEME      := DestinyChurch
BUNDLE_ID   := uk.destinytees.app
SIM_NAME    := DC-iPhone

# Xcode 26 refuses every destination — including `generic/platform=iOS
# Simulator` — until a simulator runtime is installed, so there is no way to
# compile before the runtime lands. If you see "Found no destinations", run:
#
#     sudo mkdir -p /Library/Developer/CoreSimulator/Images
#     xcodebuild -downloadPlatform iOS
#
# The mkdir matters: the runtime mounts its disk image at Images/mnt/<uuid>,
# and the install fails with "Invalid parent directory for mount point" if
# that directory does not exist.
GENERIC     := generic/platform=iOS Simulator

.PHONY: project build test clean sim install launch app-path

project:
	xcodegen generate

build: project
	xcodebuild -project $(PROJECT) -scheme $(SCHEME) \
		-sdk iphonesimulator -configuration Debug \
		-destination '$(GENERIC)' \
		-derivedDataPath "$(DD)" \
		CODE_SIGNING_ALLOWED=NO \
		build

test: project
	xcodebuild -project $(PROJECT) -scheme $(SCHEME) \
		-sdk iphonesimulator -configuration Debug \
		-destination 'platform=iOS Simulator,name=$(SIM_NAME)' \
		-derivedDataPath "$(DD)" \
		CODE_SIGNING_ALLOWED=NO \
		test

app-path:
	@echo "$(DD)/Build/Products/Debug-iphonesimulator/Destiny Church.app"

install:
	xcrun simctl install booted "$(DD)/Build/Products/Debug-iphonesimulator/Destiny Church.app"

launch: install
	xcrun simctl launch booted $(BUNDLE_ID)

clean:
	rm -rf "$(DD)" $(PROJECT)
