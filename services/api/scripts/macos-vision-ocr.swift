import AppKit
import Foundation
import Vision

guard CommandLine.arguments.count > 1 else {
  FileHandle.standardError.write(Data("Image path is required\n".utf8))
  exit(2)
}

let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let image = NSImage(contentsOf: url),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
  FileHandle.standardError.write(Data("Image could not be decoded\n".utf8))
  exit(3)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
request.recognitionLanguages = ["en-US"]

do {
  try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
  let rows = (request.results ?? []).compactMap { observation -> [String: Any]? in
    guard let candidate = observation.topCandidates(1).first else { return nil }
    return [
      "text": candidate.string,
      "confidence": candidate.confidence,
      "x": observation.boundingBox.origin.x,
      "y": observation.boundingBox.origin.y,
      "width": observation.boundingBox.width,
      "height": observation.boundingBox.height
    ]
  }
  let data = try JSONSerialization.data(withJSONObject: rows)
  print(String(data: data, encoding: .utf8) ?? "[]")
} catch {
  FileHandle.standardError.write(Data("Vision OCR failed: \(error)\n".utf8))
  exit(4)
}
