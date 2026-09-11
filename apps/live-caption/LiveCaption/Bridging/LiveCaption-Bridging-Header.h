//
//  Bridges the two vendored C libraries into Swift. Neither header exists
//  until its vendor step has been run (see ../../README.md):
//
//    whisper.h              -> `make whisper-build`  (git submodule + CMake)
//    Processing.NDI.Lib.h   -> `make ndi-setup`       (license-gated, manual)
//
//  Only WhisperEngine.swift and NDIAudioSource.swift/NDIOutputPublisher.swift
//  should ever import these directly — everywhere else in the app talks to
//  the Swift wrapper types instead.
//

#import "whisper.h"
#import "Processing.NDI.Lib.h"
