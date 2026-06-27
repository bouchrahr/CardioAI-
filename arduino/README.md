# CardioAI — Setup matériel MySignals

## À demander/vérifier avec l'encadrant AVANT de quitter l'école

### Indispensable
- [ ] Bouclier **MySignals HW BLE** (PAS le SW BLE) — confirmer la version
- [ ] Carte **Arduino Uno** + câble USB type A→B
- [ ] **Capteur ECG** MySignals
- [ ] **Électrodes ECG jetables** (au moins 6 — 3 par démo, prévoir un spare)
- [ ] **Librairie MySignals** (fichier `.zip` à importer dans l'IDE Arduino)
- [ ] Documentation MySignals **HW BLE** (PDF ou lien web)

### Optionnel mais utile
- [ ] Capteur **SpO2** MySignals (pour activer les modificateurs IoT dans CardioRisk)
- [ ] Capteur **Tension** MySignals (idem)
- [ ] Bluetooth dongle pour le PC si pas de BLE intégré

### Drivers à installer sur le PC AVANT la première utilisation
- [ ] **IDE Arduino** : https://www.arduino.cc/en/software (installer la version 2.x)
- [ ] **Drivers Arduino Uno** : généralement automatiques sous Windows 10/11
- [ ] **Driver CH340 ou CP2102** SI l'Arduino est un clone (à vérifier en le branchant : s'il apparaît dans le Gestionnaire de périphériques, c'est bon ; sinon il faut le driver)

### Questions à poser à l'encadrant
1. Le capteur ECG sort une valeur en **volts**, **millivolts**, ou **valeur ADC brute 0-1023** ?
2. Quelle est l'**amplitude typique** du signal au repos ? (Important pour debug si jamais on voit des valeurs aberrantes)
3. Y a-t-il un **temps de stabilisation** au démarrage du capteur ? (Combien de secondes ignorer après mise sous tension)
4. Les électrodes sont à placer comment ? (Placement Lead I : RA bras droit, LA bras gauche, RL jambe droite — à confirmer)

## Workflow de test (le jour où je branche)

### Étape 1 — USB + Arduino seul (~15 min)
Brancher l'Arduino. Vérifier dans le Gestionnaire de périphériques Windows qu'un port `COM` apparaît. Noter le numéro (COM3, COM5...).
Ouvrir l'IDE Arduino, sélectionner la carte "Arduino Uno", sélectionner le port COM.
Uploader `cardioai_ecg_test/cardioai_ecg_test.ino`.
Ouvrir le moniteur série (loupe en haut à droite) à **115200 bauds**.
**Résultat attendu** : des floats sinusoïdaux défilent.

### Étape 2 — Passerelle Python en série (~15 min)
Fermer le moniteur série de l'IDE (sinon le port est occupé).
Lancer dans PowerShell :