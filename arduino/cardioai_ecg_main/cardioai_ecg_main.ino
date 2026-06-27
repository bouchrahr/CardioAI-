/*
 * cardioai_ecg_main.ino
 * Sketch principal CardioAI : lit l'ECG depuis MySignals HW à 100 Hz
 * et l'imprime sur le port série, un float par ligne.
 *
 * Hardware requis :
 *   - Arduino Uno
 *   - Bouclier MySignals HW BLE
 *   - Capteur ECG MySignals + électrodes
 *
 * Librairie requise :
 *   - MySignals.h (à importer depuis le .zip fourni par l'encadrant)
 *
 * Usage : uploader, brancher les électrodes (RA / LA / RL classique),
 * ouvrir le moniteur série à 115200 bauds. On doit voir des floats
 * qui ressemblent à un ECG.
 */

#include <MySignals.h>
#include "Wire.h"
#include "SPI.h"

unsigned long lastSample = 0;

void setup() {
  Serial.begin(115200);
  MySignals.begin();
  delay(500);  // stabilisation
  
  // Marqueur de démarrage : la passerelle Python pourra l'utiliser pour
  // détecter un reboot du capteur (utile en debug, pas obligatoire)
  Serial.println("# CardioAI MySignals ready");
}

void loop() {
  unsigned long now = micros();
  // Échantillonnage à 100 Hz (aligné PTB-XL)
  if (now - lastSample >= 10000) {
    lastSample = now;
    
    float ecg = MySignals.getECG(VOLTAGE);
    Serial.println(ecg, 4);  // 4 décimales, séparateur '\n'
  }
}