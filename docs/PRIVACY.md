# Privacy and safety

- New and migrated sets are private by default; API authorization—not UI hiding—enforces access.
- Public sets alone enter Explore/search. Unlisted sets are link-visible but not discoverable.
- Uploaded JPEG/PNG/WebP files are capped at 8 MB, decoded, rotated, resized and re-encoded with Sharp, removing EXIF metadata before MinIO storage.
- Before publishing a room image, users are warned to crop or blur faces, addresses, bills, documents, private screens and valuable possessions.
- Account data can be exported as JSON and deleted locally.
- Reports and moderator actions are stored in permanent audit tables.
