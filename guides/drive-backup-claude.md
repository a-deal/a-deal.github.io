# Google Drive Backup - Claude Code Instructions

Use this file to guide a user through backing up their Google Drive to an external SSD.

## Context
The user wants to back up their entire Google Drive to an external drive and optionally clean up storage. Walk them through each step interactively. Ask before doing anything destructive.

## Steps

### 1. Check the external drive
- Run `ls /Volumes/` to find it
- Run `diskutil list external` to confirm
- If not formatted for Mac (APFS), ask the user if they want to format it. Warn that formatting erases everything.
- Format command: `diskutil eraseDisk APFS "Backup" /dev/diskN`

### 2. Check for Google Drive API credentials
- Look for `credentials.json` in `~/drive-backup/`
- If not found, walk them through:
  1. Go to https://console.cloud.google.com
  2. Create a project
  3. Enable Google Drive API (APIs & Services > Library)
  4. Create OAuth credentials (Desktop app type)
  5. Download the JSON, rename to credentials.json
  6. They may need to configure OAuth consent screen (External, add themselves as test user)

### 3. Set up the tool
```bash
mkdir -p ~/drive-backup
cd ~/drive-backup
python3 -m venv .venv
.venv/bin/pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

### 4. Download the backup script
Fetch the backup script from: https://andrewdeal.info/guides/drive_backup.py
Save it to ~/drive-backup/drive_backup.py

### 5. Authenticate
- Run `cd ~/drive-backup && .venv/bin/python3 drive_backup.py "/Volumes/DRIVENAME/Google Drive Backup"`
- A browser will open for Google OAuth. User signs in with their Google account.
- This only happens once.

### 6. Run the backup
- Same command as above. It will download everything.
- Safe to interrupt (Ctrl+C) and restart. It skips already-downloaded files.
- Google Docs export as PDF, Sheets as Excel.

### 7. Verify
- Check file count: `wc -l "/Volumes/DRIVENAME/Google Drive Backup/_backup_log.jsonl"`
- Check size: `du -sh "/Volumes/DRIVENAME/Google Drive Backup/"`
- A few errors are normal (restricted shared files, Google Forms)

### 8. Clean up Drive (only if user asks)
- ALWAYS confirm before deleting anything
- Recommend going to drive.google.com > Storage to review by size first
- Never delete shared folders where user is owner without warning them
- Never delete Google Forms without warning about response data
