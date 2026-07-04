# Demo Accounts (Seed Data)

These accounts are created by `app/backend/seed.py`. **Every account shares the same password:**

```
Password123!
```

All data is fictional. Names are Romanian; there is no real personal data.

> Run the seed with `python seed.py` (from `app/backend`) or, in Docker,
> `docker compose --profile seed run --rm seed`. See README for details.

---

## Admin

| Email | Role |
|-------|------|
| `admin@healthmonitor.ro` | ADMIN — user management + specialist verification |

## Specialists (all verification status = APPROVED)

| Email | Name | Role | Specialization |
|-------|------|------|----------------|
| `andrei.popescu@medic.ro` | Dr. Andrei Popescu | DOCTOR | Cardiologie |
| `elena.ionescu@medic.ro` | Dr. Elena Ionescu | DOCTOR | Endocrinologie |
| `mihai.dumitrescu@medic.ro` | Dr. Mihai Dumitrescu | DOCTOR | Nefrologie |
| `ioana.munteanu@medic.ro` | Dr. Ioana Munteanu | DOCTOR | Hematologie |
| `gabriela.stoica@medic.ro` | Gabriela Stoica | NUTRITIONIST | Nutriționist |
| `cristina.marin@medic.ro` | Cristina Marin | NUTRITIONIST | Nutriționist |
| `bogdan.stan@medic.ro` | Bogdan Stan | COACH | Antrenor Personal |
| `raluca.florea@medic.ro` | Raluca Florea | COACH | Antrenor Personal |

## Patients (each has 10–12 records with real ML predictions)

| Email | Name | Health profile |
|-------|------|----------------|
| `maria.popa@email.ro` | Maria Popa | Healthy |
| `stefan.gheorghe@email.ro` | Ștefan Gheorghe | Metabolic risk (glycemic, lipids) |
| `andreea.constantin@email.ro` | Andreea Constantin | Anemia |
| `cristian.nistor@email.ro` | Cristian Nistor | Cardiovascular risk |
| `alexandra.mateescu@email.ro` | Alexandra Mateescu | Healthy |
| `vlad.stoica@email.ro` | Vlad Stoica | Renal risk |
| `diana.radu@email.ro` | Diana Radu | Metabolic risk |
| `gabriel.dumitru@email.ro` | Gabriel Dumitru | Cardiovascular risk |
| `bianca.marin@email.ro` | Bianca Marin | Anemia |
| `radu.florescu@email.ro` | Radu Florescu | Healthy |

---

## What to look at

- **Patient view** — log in as `maria.popa@email.ro`: medical history with trends, ML predictions,
  Health Score, her specialists, and chat.
- **Specialist + ABE** — log in as `andrei.popescu@medic.ro` (cardiologist): his patients' records show
  cardiology + universal markers **decrypted by default**, two extra markers unlocked via **granted consent**,
  and the rest **locked** with a "request access" action.
- **Pending consent** — `dr. Ioana Munteanu` (hematologist) and `Dr. Andrei Popescu` each have a patient
  with a **pending** access request awaiting the patient's approval.
- **Plans** — nutritionists have sent a meal plan; coaches a workout plan (see the patient's "My Plans").
- **Red flags** — high-risk patients (cardiovascular / metabolic / renal / anemia) generate `SYSTEM_RED_FLAG`
  alerts visible in their specialists' chat.
- **Relation states** — the data includes APPROVED, PENDING, REJECTED and REVOKED relations.
