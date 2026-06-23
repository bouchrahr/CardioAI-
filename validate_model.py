"""
Validation du modèle InceptionTime+SE sur le vrai test set PTB-XL
(X_test/y_test générés depuis le notebook Kaggle, jamais vus à l'entraînement)
"""
import numpy as np
import torch
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

from app.services.ai_service import load_model

CLASS_NAMES = ['Normal', 'AFib', 'PVC', 'Other']

# --- Chargement des données de test (déjà preprocessées par le notebook) ---
X_test = np.load('test_data/X_test.npy')   # shape (2195, 1000)
y_test = np.load('test_data/y_test.npy')   # shape (2195,)

print(f"X_test: {X_test.shape}, y_test: {y_test.shape}")

# --- Chargement du modèle réel (même code que la prod) ---
model = load_model()

# --- Inférence en batch ---
X_tensor = torch.FloatTensor(X_test).unsqueeze(1)  # (2195, 1, 1000)

y_pred = []
with torch.no_grad():
    batch_size = 64
    for i in range(0, len(X_tensor), batch_size):
        batch = X_tensor[i:i+batch_size]
        out = model(batch)
        preds = torch.argmax(out, dim=1).tolist()
        y_pred.extend(preds)

y_pred = np.array(y_pred)

# --- Résultats ---
acc = accuracy_score(y_test, y_pred)
print(f"\n{'='*50}")
print(f"ACCURACY GLOBALE : {acc:.4f} ({acc*100:.2f}%)")
print(f"{'='*50}\n")

print("Classification Report :")
print(classification_report(y_test, y_pred, target_names=CLASS_NAMES, digits=4))

print("Matrice de confusion :")
print("Lignes = vrai label, Colonnes = prédiction")
cm = confusion_matrix(y_test, y_pred)
print(f"{'':10}" + "".join(f"{n:>10}" for n in CLASS_NAMES))
for i, row in enumerate(cm):
    print(f"{CLASS_NAMES[i]:10}" + "".join(f"{v:>10}" for v in row))