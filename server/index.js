const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

app.post('/transcript', (req, res) => {
  const youtubeUrl = req.body.url;
  console.log('Processing URL:', youtubeUrl);

  // Step 1: Try getting transcript using Python
  exec(`python3 python/get_transcript.py "${youtubeUrl}"`, (error, stdout, stderr) => {
    if (error) {
      console.log("Transcript not found. Falling back to Whisper...");

      const downloadCmd = `yt-dlp -f bestaudio -o audio.mp3 "${youtubeUrl}"`;
      exec(downloadCmd, (err1) => {
        if (err1) return res.status(500).json({ error: 'Audio download failed' });

        const whisperCmd = `whisper audio.mp3 --model base --language en --output_format txt`;
        exec(whisperCmd, (err2) => {
          if (err2) return res.status(500).json({ error: 'Whisper transcription failed' });

          const transcript = fs.readFileSync("audio.txt", "utf-8");
          const notes = generateStudyNotes(transcript);
          return res.json({ notes });
        });
      });
    } else {
      const transcript = stdout;
      const notes = generateStudyNotes(transcript);
      return res.json({ notes });
    }
  });
});

function generateStudyNotes(transcript) {
  const lines = transcript.split('. ');
  const summary = lines.slice(0, 10).map((line, index) => `${index + 1}. ${line.trim()}`).join('\n');
  return `Study Notes:\n\n${summary}`;
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
