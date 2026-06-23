from dataclasses import dataclass
from typing import Optional


@dataclass
class PatientRiskData:
    age: int
    sexe: str
    insuffisance_cardiaque: bool
    hypertension: bool
    diabete: bool
    avc_precedent: bool
    maladie_vasculaire: bool
    ecg_class: int
    ecg_probs: list
    spo2: float
    tension_systolique: float
    ef_percent: Optional[float] = None


def compute_chads_vasc(p: PatientRiskData):
    score = 0
    components = {}
    if p.insuffisance_cardiaque:
        score += 1; components['Insuffisance cardiaque'] = 1
    if p.hypertension:
        score += 1; components['Hypertension'] = 1
    if p.age >= 75:
        score += 2; components['Age >= 75'] = 2
    elif p.age >= 65:
        score += 1; components['Age 65-74'] = 1
    if p.diabete:
        score += 1; components['Diabete'] = 1
    if p.avc_precedent:
        score += 2; components['AVC/AIT anterieur'] = 2
    if p.maladie_vasculaire:
        score += 1; components['Maladie vasculaire'] = 1
    if p.sexe == 'F':
        score += 1; components['Sexe feminin'] = 1
    return score, components


def calculate_chadsvasc(age, gender, has_diabetes, has_hypertension,
                         has_vascular_disease, previous_stroke,
                         ecg_class, ecg_probs=None,
                         spo2=98.0, tension_systolique=120.0,
                         ef_percent=None):
    """
    CardioRisk Engine — CHADS-VASc ESC 2023 + modificateurs IoT
    """
    if ecg_probs is None:
        ecg_probs = [0.9, 0.05, 0.03, 0.02]

    class_map = {'Normal': 0, 'AFib': 1, 'PVC': 2, 'Other': 3}
    ecg_idx = class_map.get(ecg_class, 0) if isinstance(ecg_class, str) else ecg_class

    p = PatientRiskData(
        age=age, sexe=gender,
        insuffisance_cardiaque=False,
        hypertension=has_hypertension,
        diabete=has_diabetes,
        avc_precedent=previous_stroke,
        maladie_vasculaire=has_vascular_disease,
        ecg_class=ecg_idx,
        ecg_probs=ecg_probs,
        spo2=spo2,
        tension_systolique=tension_systolique,
        ef_percent=ef_percent
    )

    chads_score, _ = compute_chads_vasc(p)

    if gender == 'F':
        eff = chads_score - 1
        base_level = 0 if eff <= 0 else (1 if eff == 1 else 2)
    else:
        base_level = 0 if chads_score == 0 else (1 if chads_score == 1 else 2)

    risk_level = base_level
    if ecg_idx == 1 and ecg_probs[1] > 0.8:
        risk_level = min(risk_level + 1, 3)
    if spo2 < 90:
        risk_level = min(risk_level + 2, 3)
    elif spo2 < 94:
        risk_level = min(risk_level + 1, 3)
    if tension_systolique >= 180:
        risk_level = min(risk_level + 1, 3)
    if ef_percent is not None and ef_percent < 35:
        risk_level = min(risk_level + 1, 3)
    if ecg_idx == 1 and ef_percent is not None and ef_percent < 40:
        risk_level = 3

    RISK_NAMES = ['Faible', 'Modere', 'Eleve', 'Critique']
    risk_level_name = RISK_NAMES[risk_level]

    CLASS_NAMES_STR = ['Normal', 'AFib', 'PVC', 'Other']
    ecg_class_str = CLASS_NAMES_STR[ecg_idx]
    if ecg_class_str == 'AFib' and risk_level >= 2:
        risk_immediate = 'Critique'
    elif ecg_class_str == 'AFib':
        risk_immediate = 'Urgent'
    elif ecg_class_str == 'PVC':
        risk_immediate = 'Attention'
    else:
        risk_immediate = 'Stable'

    risk_table = {
        0: 0.0, 1: 1.3, 2: 2.2, 3: 3.2,
        4: 4.0, 5: 6.7, 6: 9.8, 7: 9.6,
        8: 6.7, 9: 15.2
    }
    avc_risk = risk_table.get(min(chads_score, 9), 15.2)

    return {
        "chadsvasc_score": chads_score,
        "risk_level": risk_level_name,
        "risk_immediate": risk_immediate,
        "avc_risk_12m": avc_risk
    }