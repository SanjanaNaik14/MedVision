from fastapi import APIRouter, HTTPException, status, Header
from typing import Optional, Dict, Any
import firebase_admin
from firebase_admin import firestore

router = APIRouter(tags=["Patients"])


def _get_firestore_db():
    try:
        if firebase_admin._apps:
            return firestore.client()
    except Exception as e:
        print(f"[patient_routes] Firestore client unavailable: {e}")
    return None


@router.delete("/{patient_id}")
async def delete_patient(
    patient_id: str,
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    DELETE /api/patients/{patient_id}
    Locates the patient document by patient_id in Firestore and deletes it.
    Ensures that deletion only affects the patients collection.
    """
    db = _get_firestore_db()
    if not db:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable."
        )

    try:
        # 1. Attempt direct lookup by Firestore document ID
        doc_ref = db.collection("patients").document(patient_id)
        doc_snap = doc_ref.get()

        if doc_snap.exists:
            doc_ref.delete()
            return {
                "status": "success",
                "message": "Patient deleted"
            }

        # 2. Fallback: Search by patientId field if doc ID didn't match directly
        from google.cloud.firestore import FieldFilter
        query_docs = list(db.collection("patients").where(filter=FieldFilter("patientId", "==", patient_id)).limit(1).stream())
        if query_docs:
            for doc in query_docs:
                doc.reference.delete()
            return {
                "status": "success",
                "message": "Patient deleted"
            }

        # 3. Document not found
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found."
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[patient_routes] Error deleting patient {patient_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete patient: {str(e)}"
        )
