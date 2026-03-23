#!/usr/bin/env python3
"""Download entire Google Drive to local storage."""

import io
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

# Google Workspace MIME types and their export formats
EXPORT_FORMATS = {
    "application/vnd.google-apps.document": ("application/pdf", ".pdf"),
    "application/vnd.google-apps.spreadsheet": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"),
    "application/vnd.google-apps.presentation": ("application/pdf", ".pdf"),
    "application/vnd.google-apps.drawing": ("application/pdf", ".pdf"),
    "application/vnd.google-apps.jam": (None, None),  # FigJam, skip
    "application/vnd.google-apps.form": (None, None),  # Forms, skip
    "application/vnd.google-apps.map": (None, None),  # skip
    "application/vnd.google-apps.site": (None, None),  # skip
    "application/vnd.google-apps.script": ("application/vnd.google-apps.script+json", ".json"),
}

SKIP_MIMES = {
    "application/vnd.google-apps.shortcut",
    "application/vnd.google-apps.folder",
}


def main():
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/Volumes/Crucial X9/Google Drive Backup")
    dest.mkdir(parents=True, exist_ok=True)
    log_path = dest / "_backup_log.jsonl"

    print(f"Backing up Google Drive to: {dest}")
    print(f"Log: {log_path}\n")

    creds = Credentials.from_authorized_user_file("token_drive.json")
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())

    service = build("drive", "v3", credentials=creds)

    # Build folder tree
    print("Building folder tree...")
    folders = _get_all_folders(service)
    folder_paths = _build_folder_paths(folders)
    print(f"  {len(folders)} folders found\n")

    # Get all files
    print("Listing all files...")
    files = _get_all_files(service)
    print(f"  {len(files)} files found\n")

    # Download
    total = len(files)
    downloaded = 0
    skipped = 0
    errors = 0
    total_bytes = 0

    for i, f in enumerate(files, 1):
        name = f["name"]
        mime = f.get("mimeType", "")
        file_id = f["id"]
        size = int(f.get("size", 0))

        # Build path
        parent_id = f.get("parents", ["root"])[0] if f.get("parents") else "root"
        parent_path = folder_paths.get(parent_id, "")
        local_dir = dest / parent_path
        local_dir.mkdir(parents=True, exist_ok=True)

        # Skip unsupported types
        if mime in SKIP_MIMES:
            skipped += 1
            continue

        # Handle Google Workspace files (export)
        if mime in EXPORT_FORMATS:
            export_mime, ext = EXPORT_FORMATS[mime]
            if export_mime is None:
                skipped += 1
                continue
            safe_name = _safe_filename(name) + ext
            local_path = local_dir / safe_name

            if local_path.exists():
                skipped += 1
                continue

            print(f"  [{i}/{total}] EXPORT {parent_path}/{safe_name}")
            try:
                request = service.files().export_media(fileId=file_id, mimeType=export_mime)
                _download_to_file(request, local_path)
                fsize = local_path.stat().st_size
                total_bytes += fsize
                downloaded += 1
                _log(log_path, f, str(local_path), fsize, "exported")
            except Exception as e:
                print(f"    ERROR: {e}")
                errors += 1
                _log(log_path, f, str(local_path), 0, f"error: {e}")

        else:
            # Regular file download
            safe_name = _safe_filename(name)
            local_path = local_dir / safe_name

            if local_path.exists() and local_path.stat().st_size == size:
                skipped += 1
                continue

            size_mb = size / (1024 * 1024)
            print(f"  [{i}/{total}] {size_mb:>7.1f} MB  {parent_path}/{safe_name}")
            try:
                request = service.files().get_media(fileId=file_id)
                _download_to_file(request, local_path)
                total_bytes += size
                downloaded += 1
                _log(log_path, f, str(local_path), size, "downloaded")
            except Exception as e:
                print(f"    ERROR: {e}")
                errors += 1
                _log(log_path, f, str(local_path), 0, f"error: {e}")

    print(f"\n{'=' * 50}")
    print(f"BACKUP COMPLETE")
    print(f"  Downloaded: {downloaded}")
    print(f"  Skipped: {skipped}")
    print(f"  Errors: {errors}")
    print(f"  Total size: {total_bytes / (1024**3):.2f} GB")
    print(f"  Location: {dest}")


def _get_all_folders(service):
    folders = {}
    page_token = None
    while True:
        results = service.files().list(
            q="mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields="nextPageToken, files(id, name, parents)",
            pageSize=1000,
            pageToken=page_token,
        ).execute()
        for f in results.get("files", []):
            folders[f["id"]] = f
        page_token = results.get("nextPageToken")
        if not page_token:
            break
    return folders


def _build_folder_paths(folders):
    paths = {}

    def _resolve(folder_id):
        if folder_id in paths:
            return paths[folder_id]
        if folder_id not in folders:
            paths[folder_id] = ""
            return ""
        folder = folders[folder_id]
        parent_id = folder.get("parents", [None])[0] if folder.get("parents") else None
        if parent_id and parent_id in folders:
            parent_path = _resolve(parent_id)
            path = os.path.join(parent_path, _safe_filename(folder["name"])) if parent_path else _safe_filename(folder["name"])
        else:
            path = _safe_filename(folder["name"])
        paths[folder_id] = path
        return path

    for fid in folders:
        _resolve(fid)
    return paths


def _get_all_files(service):
    files = []
    page_token = None
    while True:
        results = service.files().list(
            q="mimeType!='application/vnd.google-apps.folder' and trashed=false",
            fields="nextPageToken, files(id, name, mimeType, size, parents, modifiedTime)",
            pageSize=1000,
            pageToken=page_token,
        ).execute()
        files.extend(results.get("files", []))
        page_token = results.get("nextPageToken")
        if not page_token:
            break
    return files


def _download_to_file(request, local_path):
    fh = io.FileIO(str(local_path), "wb")
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while not done:
        status, done = downloader.next_chunk()
    fh.close()


def _safe_filename(name):
    # Replace problematic characters
    for ch in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']:
        name = name.replace(ch, '_')
    return name.strip()


def _log(log_path, file_meta, local_path, size, status):
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "id": file_meta["id"],
        "name": file_meta["name"],
        "mime": file_meta.get("mimeType", ""),
        "local_path": local_path,
        "size": size,
        "status": status,
    }
    with open(log_path, "a") as f:
        f.write(json.dumps(entry) + "\n")


if __name__ == "__main__":
    main()
