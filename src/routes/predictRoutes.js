const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');

router.post('/predict', (req, res) => {
  const demandeData = req.body; // données envoyées par le frontend

  const inputJson = JSON.stringify(demandeData);

  const pyProcess = spawn('python', ['ai/predict_model.py', inputJson]); 

  let output = '';
  pyProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  pyProcess.stderr.on('data', (data) => {
    console.error('Erreur Python:', data.toString());
  });

  pyProcess.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: 'Erreur lors de la prédiction' });
    }
    try {
      const predictionResult = JSON.parse(output);
      res.json(predictionResult);
    } catch (err) {
      res.status(500).json({ error: 'Erreur parsing résultat prédiction' });
    }
  });
});

module.exports = router;