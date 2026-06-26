mkdir migrations -Force
@"
# Notes de migrations manuelles

Ce projet n'utilise pas Alembic. Les changements de schéma sont effectués
manuellement via ALTER TABLE et documentés ici pour traçabilité.

## 2026-06-25 — Ajout colonne created_at sur ecg_records

**Motivation :** permettre le filtrage temporel des ECG (KPI 'analyses de la
dernière semaine' dans le dashboard admin).

**Commande SQL appliquée :**
``````sql
ALTER TABLE ecg_records ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
``````

**Impact sur les données existantes :** les 8 ECG préexistants ont reçu la
date du jour de la migration (NOW()). Ce n'est pas leur vraie date de
création. Les nouveaux ECG auront leur vraie date d'insertion.
"@ | Out-File -FilePath migrations\notes.md -Encoding UTF8