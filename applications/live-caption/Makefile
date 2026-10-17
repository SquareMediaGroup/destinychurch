# Live Caption — build entry points. Mirrors ../../mobile/Makefile's shape.
#
# whisper.cpp and the NDI SDK are not vendored in git (see README.md) — run
# `make whisper-build` and `make ndi-setup` once, on each machine, before the
# first `make build`.
#
# DerivedData location is a plain local default here (no external SSD is
# assumed) — override with `make build DD=/path/to/somewhere` if the target
# Mac is tight on internal disk space, same concern noted in mobile/Makefile.

DD          ?= $(HOME)/Library/Developer/Xcode/DerivedData/LiveCaption
PROJECT     := LiveCaption.xcodeproj
SCHEME      := LiveCaption
BUNDLE_ID   := uk.destinytees.livecaption
WHISPER_DIR := Vendor/whisper.cpp
WHISPER_TAG := v1.7.6

.PHONY: project build test run clean whisper-submodule whisper-build ndi-setup app-path

project:
	xcodegen generate

build: project
	xcodebuild -project $(PROJECT) -scheme $(SCHEME) \
		-configuration Debug \
		-derivedDataPath "$(DD)" \
		build

test: project
	xcodebuild -project $(PROJECT) -scheme $(SCHEME) \
		-configuration Debug \
		-derivedDataPath "$(DD)" \
		test

run: build
	open "$(DD)/Build/Products/Debug/Live Caption.app"

app-path:
	@echo "$(DD)/Build/Products/Debug/Live Caption.app"

# --- whisper.cpp -------------------------------------------------------

whisper-submodule:
	git submodule update --init --recursive $(WHISPER_DIR)
	cd $(WHISPER_DIR) && git checkout $(WHISPER_TAG)

whisper-build: whisper-submodule
	cmake -S $(WHISPER_DIR) -B $(WHISPER_DIR)/build \
		-DGGML_METAL=ON -DBUILD_SHARED_LIBS=OFF -DCMAKE_BUILD_TYPE=Release
	cmake --build $(WHISPER_DIR)/build -j --config Release
	@echo "whisper.cpp built. Fetch a model next: ./Scripts/fetch-whisper-model.sh large-v3-turbo"

# --- NDI SDK -------------------------------------------------------------
# License-gated — cannot be scripted end-to-end. See Vendor/NDI/README.md.

NDI_INSTALL := /Library/NDI SDK for Apple

ndi-setup:
	@test -d "$(NDI_INSTALL)" || (echo "NDI SDK not found at '$(NDI_INSTALL)'. Install it first — see Vendor/NDI/README.md" && exit 1)
	mkdir -p Vendor/NDI/include Vendor/NDI/lib/macOS
	cp -R "$(NDI_INSTALL)/include/." Vendor/NDI/include/
	cp "$(NDI_INSTALL)/lib/macOS/libndi.dylib" Vendor/NDI/lib/macOS/
	@echo "NDI SDK linked into Vendor/NDI/."

clean:
	rm -rf "$(DD)" $(PROJECT) $(WHISPER_DIR)/build
