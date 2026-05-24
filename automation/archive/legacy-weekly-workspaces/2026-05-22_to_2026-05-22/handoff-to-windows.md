# Windows Handoff

weekId: 2026-05-22_to_2026-05-22
copy source: automation/weekly/2026-05-22_to_2026-05-22/podcast_jobs/pending/
windows target: D:\AI-Podcast\jobs\pending\2026-05-22_to_2026-05-22\

Copy the card package below to the Windows target path before starting TTS generation:

```text
automation/weekly/2026-05-22_to_2026-05-22/podcast_jobs/pending/2026-05-22-post-station-network/
```

The package must include:

- `script.md`
- `script.srt`
- `podcast.meta.json`

After Windows TTS generation, copy the finished package back to:

```text
automation/weekly/2026-05-22_to_2026-05-22/podcast_jobs/done/2026-05-22-post-station-network/
```

The done package must include:

- `script.md`
- `script.srt`
- `transcript.md`
- `podcast.meta.json`
- `2026-05-22-post-station-network-podcast-v1.mp3`
