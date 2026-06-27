/*
 * cardioai_ecg_test.ino
 * Sketch de validation : produit un signal sinusoïdal à 100 Hz pour
 * tester la chaîne complète Arduino → USB → passerelle Python → MQTT → backend
 * SANS dépendre de MySignals. Permet d'isoler les problèmes de matériel
 * vs problèmes de logiciel.
 *
 * Usage : uploader sur l'Arduino Uno, ouvrir le moniteur série à 115200 bauds.
 * On doit voir des floats défiler (un par ligne, format X.XXXX).
 */

unsigned long lastSample = 0;
unsigned long t = 0;  // compteur de samples (incrémenté à chaque envoi)

void setup() {
  Serial.begin(115200);
  // Petit délai pour stabiliser la liaison série
  delay(500);
}

void loop() {
  unsigned long now = micros();
  // Échantillonnage régulier à 100 Hz = 10 ms entre samples = 10000 µs
  if (now - lastSample >= 10000) {
    lastSample = now;
    
    // Signal de test : sinusoïde à 1.2 Hz (ressemble vaguement à un rythme cardiaque)
    // amplitude ~1.0, période ~83 samples
    float val = sin(2.0 * 3.14159 * 1.2 * t / 100.0);
    Serial.println(val, 4);  // 4 décimales
    t++;
  }
}