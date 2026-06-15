"""
Audit script: verifies that a specialist's active ABE key contains all markers
approved through access requests with a given patient.

Usage (from project root, with backend venv active):
    python scripts/check_abe_access.py
"""

import json
import psycopg

DB_URL = "postgresql://postgres:pass@localhost:5432/healthmonitor"

SPECIALIST_NAME = "Teodora Popa"
PATIENT_NAME    = "Ion Ionescu"


def main() -> None:
    with psycopg.connect(DB_URL) as conn:
        # Resolve user IDs by full name — names live in profile tables, not users
        rows = conn.execute(
            """
            SELECT u.id, sp.first_name || ' ' || sp.last_name AS full_name, u.role
            FROM users u
            JOIN specialist_profiles sp ON sp.user_id = u.id
            WHERE sp.first_name || ' ' || sp.last_name = %s
            UNION ALL
            SELECT u.id, pp.first_name || ' ' || pp.last_name AS full_name, u.role
            FROM users u
            JOIN patient_profiles pp ON pp.user_id = u.id
            WHERE pp.first_name || ' ' || pp.last_name = %s
            """,
            (SPECIALIST_NAME, PATIENT_NAME),
        ).fetchall()

        users = {row[1]: row[0] for row in rows}
        roles = {row[1]: row[2] for row in rows}

        if SPECIALIST_NAME not in users:
            print(f"[ERROR] User not found: {SPECIALIST_NAME}")
            return
        if PATIENT_NAME not in users:
            print(f"[ERROR] User not found: {PATIENT_NAME}")
            return

        specialist_id = users[SPECIALIST_NAME]
        patient_id    = users[PATIENT_NAME]

        print(f"\nSpecialist : {SPECIALIST_NAME}  ({specialist_id})  role={roles[SPECIALIST_NAME]}")
        print(f"Patient    : {PATIENT_NAME}  ({patient_id})  role={roles[PATIENT_NAME]}")

        # Fetch all APPROVED access requests between the two
        requests = conn.execute(
            """
            SELECT id, requested_markers, approved_markers, created_at, responded_at
            FROM access_requests
            WHERE specialist_user_id = %s
              AND patient_user_id    = %s
              AND status             = 'APPROVED'
            ORDER BY responded_at
            """,
            (specialist_id, patient_id),
        ).fetchall()

        print(f"\n{'-'*60}")
        print(f"APPROVED access requests: {len(requests)}")
        print(f"{'-'*60}")

        all_approved: set[str] = set()
        for req in requests:
            req_id, requested, approved, created_at, responded_at = req
            approved_list = approved if isinstance(approved, list) else json.loads(approved or "[]")
            requested_list = requested if isinstance(requested, list) else json.loads(requested or "[]")
            all_approved.update(approved_list)
            print(f"\n  Request {req_id}")
            print(f"    Requested : {requested_list}")
            print(f"    Approved  : {approved_list}")
            print(f"    Responded : {responded_at}")

        print(f"\nAll approved markers (union): {sorted(all_approved)}")

        # Fetch the active ABE key for this pair
        key_row = conn.execute(
            """
            SELECT id, marker_attributes, issued_at
            FROM abe_user_keys
            WHERE specialist_user_id = %s
              AND patient_user_id    = %s
              AND revoked_at IS NULL
            """,
            (specialist_id, patient_id),
        ).fetchone()

        print(f"\n{'-'*60}")
        if key_row is None:
            print("[WARN] No active ABE key found for this pair.")
            return

        key_id, marker_attributes, issued_at = key_row
        attrs = marker_attributes if isinstance(marker_attributes, list) else json.loads(marker_attributes or "[]")
        # marker_attributes stores full attribute strings like "marker:creatinine"
        key_markers = {a.removeprefix("marker:") for a in attrs if a.startswith("marker:")}

        print(f"Active ABE key  : {key_id}  (issued {issued_at})")
        print(f"Key marker attrs: {sorted(key_markers)}")

        print(f"\n{'-'*60}")
        print("AUDIT RESULT")
        print(f"{'-'*60}")

        missing = all_approved - key_markers
        extra   = key_markers - all_approved

        if not missing and not extra:
            print("[OK] Key marker attributes match all approved requests exactly.")
        else:
            if missing:
                print(f"[FAIL] Markers approved but MISSING from key : {sorted(missing)}")
            if extra:
                print(f"[INFO] Markers in key but not from requests   : {sorted(extra)}")
                print("       (These may come from a previous approval cycle before clean-slate revoke.)")


if __name__ == "__main__":
    main()
