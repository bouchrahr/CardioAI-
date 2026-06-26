from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.user import User
from app.models.ecg_record import ECGRecord
from app.models.prediction import Prediction
from app.models.patient import Patient
from app.models.alert import Alert
from app.services.ai_service import predict_ecg
from app.services.risk_engine import calculate_chadsvasc
from app.services.llm_service import generate_medical_report
from app.core.dependencies import require_doctor


from app.services.logging_service import log_action
import os
import shutil
import numpy as np

router = APIRouter(prefix="/api/ecg", tags=["ECG"])

UPLOAD_DIR = "./uploads/ecg_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload/{patient_id}")
def upload_ecg(
    patient_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    # 1. Vérifie que le patient appartient à CE médecin
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.doctor_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient non trouvé")

    # 2. Sauvegarde le fichier ECG
    file_path = f"{UPLOAD_DIR}/patient_{patient_id}_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 3. Sauvegarde l'enregistrement ECG
    ecg_record = ECGRecord(
        patient_id=patient_id,
        doctor_id=current_user.id,
        file_path=file_path,
        duration=10.0,
        source="upload"
    )
    db.add(ecg_record)
    db.commit()
    db.refresh(ecg_record)

    # 4. Lire le fichier ECG et analyser avec le vrai modèle
    ecg_signal = []
    with open(file_path, 'r') as f:
        for line in f:
            values = [float(v) for v in line.strip().split(',') if v.strip()]
            ecg_signal.extend(values)

    ecg_result = predict_ecg(ecg_signal, source_hz=100)

    # 5. Calcule le score CHADS-VASc
    risk_data = calculate_chadsvasc(
        age=patient.age,
        gender=patient.gender,
        has_diabetes=patient.has_diabetes,
        has_hypertension=patient.has_hypertension,
        has_vascular_disease=patient.has_vascular_disease,
        previous_stroke=patient.previous_stroke,
        ecg_class=ecg_result['predicted_class']
    )

    # 6. Génère le rapport médical
    patient_info = {
        "age": patient.age,
        "gender": patient.gender,
        "has_diabetes": patient.has_diabetes,
        "has_hypertension": patient.has_hypertension,
        "has_vascular_disease": patient.has_vascular_disease,
        "previous_stroke": patient.previous_stroke
    }
    llm_report = generate_medical_report(ecg_result, risk_data, patient_info)

    # 7. Sauvegarde la prédiction
    prediction = Prediction(
        ecg_record_id=ecg_record.id,
        predicted_class=ecg_result['predicted_class'],
        confidence=ecg_result['confidence'],
        probabilities=ecg_result['probabilities'],
        chadsvasc_score=risk_data['chadsvasc_score'],
        risk_level=risk_data['risk_level'],
        risk_immediate=risk_data['risk_immediate'],
        avc_risk_12m=risk_data['avc_risk_12m'],
        llm_report=llm_report,
        attention_map={"data": ecg_result['attention_map']}
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    # 8. Crée une alerte si nécessaire
    if ecg_result['predicted_class'] == 'AFib' or risk_data['risk_level'] == 'Critique':
        alert = Alert(
            prediction_id=prediction.id,
            patient_id=patient_id,
            doctor_id=current_user.id,
            alert_type='AFib_Detected' if ecg_result['predicted_class'] == 'AFib' else 'Critical_Risk',
            severity='Critical' if risk_data['risk_level'] == 'Critique' else 'High',
            message=f"Patient {patient_id} — {ecg_result['predicted_class']} detecte. Score CHADS-VASc: {risk_data['chadsvasc_score']}/9",
            is_read=False,
            email_sent=False
        )
        db.add(alert)
        db.commit()
   

   
# Log de l'action (après tout le pipeline, sans planter même si ça échoue)
    log_action(
        db=db,
        action="ECG_UPLOAD",
        user_email=current_user.email,
        user_role=current_user.role,
        details=f"Analyse ECG patient #{patient_id} → {ecg_result['predicted_class']} (confiance {ecg_result['confidence']}, risque {risk_data['risk_level']})",    )
    # 9. Retourne le résultat complet
    return {
        "ecg_record_id": ecg_record.id,
        "prediction": {
            "predicted_class": ecg_result['predicted_class'],
            "confidence": ecg_result['confidence'],
            "probabilities": ecg_result['probabilities'],
            "chadsvasc_score": risk_data['chadsvasc_score'],
            "risk_level": risk_data['risk_level'],
            "risk_immediate": risk_data['risk_immediate'],
            "avc_risk_12m": risk_data['avc_risk_12m'],
            "llm_report": llm_report,
            "attention_map": ecg_result['attention_map']
        }
    }


@router.get("/{ecg_id}")
def get_ecg(
    ecg_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    record = db.query(ECGRecord).filter(
        ECGRecord.id == ecg_id,
        ECGRecord.doctor_id == current_user.id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Enregistrement non trouvé")

    prediction = db.query(Prediction).filter(
        Prediction.ecg_record_id == ecg_id
    ).first()

    return {
        "ecg_record": record,
        "prediction": prediction
    }