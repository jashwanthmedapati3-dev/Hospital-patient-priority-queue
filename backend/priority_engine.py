"""
Clinical Priority Scoring Engine.

Computes a triage priority score (1–100) based on:
  - Emergency level base score
  - Vital sign modifiers
  - Age risk factor
  - Critical symptom indicators

Also generates a human-readable score explanation string.
"""


def calculate_priority_score(emergency_level: str, age: int,
                             vitals: dict, symptoms: list[str]) -> tuple[int, str]:
    """
    Calculate priority score and return (score, explanation_string).

    Parameters
    ----------
    emergency_level : str
        One of CRITICAL, HIGH, MEDIUM, LOW
    age : int
        Patient age in years
    vitals : dict
        Keys: heart_rate, spo2, bp_systolic, bp_diastolic, temperature
    symptoms : list[str]
        List of symptom keywords
    """
    explanation_parts = []

    # ── 1. Base score by emergency level ─────────────────────────────────
    base_ranges = {
        "CRITICAL": (85, 95),
        "HIGH": (65, 75),
        "MEDIUM": (45, 55),
        "LOW": (15, 30),
    }
    low, high = base_ranges.get(emergency_level.upper(), (15, 30))
    base_score = (low + high) // 2
    explanation_parts.append(f"Base ({emergency_level}): {base_score}")

    total = base_score

    # ── 2. Vital sign modifiers ──────────────────────────────────────────
    hr = vitals.get("heart_rate", 80)
    spo2 = vitals.get("spo2", 98)
    bp_sys = vitals.get("bp_systolic", 120)
    bp_dia = vitals.get("bp_diastolic", 80)
    temp = vitals.get("temperature", 37.0)

    # Heart Rate
    if hr < 50 or hr > 120:
        bonus = 8
        total += bonus
        if hr < 50:
            explanation_parts.append(f"HR Bradycardia ({hr} bpm) (+{bonus})")
        else:
            explanation_parts.append(f"HR Tachycardia ({hr} bpm) (+{bonus})")

    # SpO2
    if spo2 < 90:
        bonus = 10
        total += bonus
        explanation_parts.append(f"SpO2 Critical ({spo2}%) (+{bonus})")
    elif spo2 < 94:
        bonus = 5
        total += bonus
        explanation_parts.append(f"SpO2 Low ({spo2}%) (+{bonus})")

    # Blood Pressure
    if bp_sys > 180 or bp_sys < 90:
        bonus = 7
        total += bonus
        if bp_sys > 180:
            explanation_parts.append(f"BP Hypertensive Crisis ({bp_sys}/{bp_dia}) (+{bonus})")
        else:
            explanation_parts.append(f"BP Hypotension ({bp_sys}/{bp_dia}) (+{bonus})")

    # Temperature
    if temp > 39.5:
        bonus = 5
        total += bonus
        explanation_parts.append(f"High Fever ({temp}°C) (+{bonus})")
    elif temp > 38.5:
        bonus = 3
        total += bonus
        explanation_parts.append(f"Fever ({temp}°C) (+{bonus})")

    # ── 3. Age risk factor ───────────────────────────────────────────────
    if age < 2:
        bonus = 10
        total += bonus
        explanation_parts.append(f"Infant ({age} yrs) (+{bonus})")
    elif age > 80:
        bonus = 10
        total += bonus
        explanation_parts.append(f"Elderly ({age} yrs) (+{bonus})")
    elif age > 65:
        bonus = 5
        total += bonus
        explanation_parts.append(f"Senior ({age} yrs) (+{bonus})")

    # ── 4. Critical symptom indicators ───────────────────────────────────
    critical_keywords = {
        "chest pain": 8,
        "stroke": 10,
        "hemorrhage": 9,
        "unresponsive": 10,
        "seizure": 7,
        "difficulty breathing": 6,
        "severe bleeding": 8,
        "cardiac arrest": 10,
        "anaphylaxis": 9,
        "head trauma": 7,
        "loss of consciousness": 8,
        "severe burn": 6,
    }

    symptom_lower = [s.lower().strip() for s in symptoms]
    for symptom in symptom_lower:
        for keyword, bonus in critical_keywords.items():
            if keyword in symptom:
                total += bonus
                explanation_parts.append(f"Symptom: {symptom} (+{bonus})")
                break  # one match per symptom

    # ── 5. Clamp to 1–100 ───────────────────────────────────────────────
    total = max(1, min(100, total))

    explanation = " + ".join(explanation_parts) + f" = {total}"
    return total, explanation
