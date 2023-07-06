const express = require('express');
const app = express();
const { spawn } = require('child_process');

const PORT = 8080;

// Flux audio à transcoder
const audioStreams = [
  { name: 'franceinfo', url: 'http://icecast.radiofrance.fr/franceinfo-hifi.aac' },
  { name: 'NRJ', url: 'http://cdn.nrjaudio.fm/adwz2/fr/30001/mp3_128.mp3' },
  //
];

app.get('/opus-stream/:streamIndex', (req, res) => {
  const streamIndex = req.params.streamIndex;
  if (streamIndex < 0 || streamIndex >= audioStreams.length) {
    return res.status(404).send('Stream not found');
  }

  const audioStream = audioStreams[streamIndex];

  res.set({
    'Content-Type': 'audio/ogg',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache',
  });

  // Arguments FFMPEG transcodage AAC vers OPUS
  const ffmpeg = spawn('ffmpeg', [
    '-i',
    audioStream.url,
    '-c:a',
    'libopus',
    '-ar',
    '48000',
    '-ac',
    '2',
    '-f',
    'ogg',
    '-',
  ]);

  // Pipe sortie FFMPEG à la réponse client
  ffmpeg.stdout.pipe(res);

  // Erreur
  ffmpeg.on('error', (error) => {
    console.error('Erreur lors de l\'exécution de ffmpeg :', error);
    res.status(500).send('Erreur interne du serveur');
  });

  ffmpeg.on('exit', (code, signal) => {
    console.log(`Le processus ffmpeg s'est terminé avec le code ${code} et le signal ${signal}`);
  });

  // Nettoyage
  res.on('close', () => {
    ffmpeg.kill();
  });
});

// Route pour obtenir la liste des flux audio disponibles
app.get('/audio-streams', (req, res) => {
  const streamList = audioStreams.map((stream, index) => ({
    name: stream.name,
    url: `/opus-stream/${index}`,
  }));
  res.json(streamList);
});

// Liftoff
app.listen(PORT, () => {
  console.log(`Le serveur est en cours d'exécution sur le port ${PORT}`);
});
