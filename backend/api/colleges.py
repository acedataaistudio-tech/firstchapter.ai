"""
Colleges API - Serves your 422 colleges
Matches your exact table structure:
- name, location, code, institution_type
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

router = APIRouter()

@router.get("/colleges")
async def get_colleges():
    """
    Get all colleges for dropdown/selection.
    Used by frontend InstitutionOnboarding.
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        # Fetch all colleges
        colleges = db.table("colleges")\
            .select("id, name, location, code, institution_type")\
            .order("name")\
            .execute()
        
        if not colleges.data:
            return {"colleges": []}
        
        # Return simple list for frontend
        return {
            "colleges": [
                {
                    "id": c["id"],
                    "name": c["name"],
                    "location": c.get("location", ""),
                    "code": c.get("code", ""),
                    "type": c.get("institution_type", ""),
                    "display_name": f"{c['name']}, {c.get('location', '')}"
                }
                for c in colleges.data
            ]
        }
    
    except Exception as e:
        print(f"Error fetching colleges: {e}")
        return {"colleges": []}


@router.get("/colleges/list")
async def get_colleges_list():
    """
    Get list of all 422 colleges from database.
    Groups by institution_type (IIT, NIT, University, etc.)
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        # Fetch all colleges
        colleges = db.table("colleges")\
            .select("id, name, location, code, institution_type")\
            .order("institution_type, name")\
            .execute()
        
        if not colleges.data:
            return {
                "colleges": {},
                "total_count": 0
            }
        
        # Group by institution_type (IIT, NIT, University, etc.)
        grouped = {}
        
        for college in colleges.data:
            college_type = college.get("institution_type", "Other")
            
            if college_type not in grouped:
                grouped[college_type] = []
            
            grouped[college_type].append({
                "id": college["id"],
                "name": college["name"],
                "location": college.get("location", ""),  # Already formatted as "City, State"
                "code": college.get("code", ""),
                "display_name": f"{college['name']}, {college.get('location', '')}"
            })
        
        return {
            "colleges": grouped,
            "total_count": len(colleges.data)
        }
    
    except Exception as e:
        print(f"Error fetching colleges: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch colleges: {str(e)}"
        )


@router.get("/colleges/client-list")
async def get_client_colleges_for_readers():
    """
    ✨ NEW: Get all active client colleges for READER registration.
    
    Returns only institutions that:
    - Are approved clients (in client_colleges table)
    - Have active subscriptions
    - Have available token quota
    
    Used for: Reader onboarding at firstchapter.ai/reader-onboarding
    Students can only join institutions that are active clients.
    
    Includes:
    - Master list colleges that became clients
    - Custom "Other" colleges that got approved
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        # Fetch all active client colleges
        client_colleges = db.table("client_colleges")\
            .select("institution_id, institution_name, institution_type, city, state, subscription_id")\
            .eq("is_client", True)\
            .eq("is_active", True)\
            .order("institution_name")\
            .execute()
        
        if not client_colleges.data:
            return {
                "colleges": [],
                "total_count": 0,
                "message": "No active client colleges found"
            }
        
        # Format for dropdown
        colleges_list = []
        for college in client_colleges.data:
            # Build display name with location
            display_parts = [college.get("institution_name", "Unknown")]
            if college.get("city"):
                display_parts.append(college.get("city"))
            if college.get("state"):
                display_parts.append(college.get("state"))
            
            colleges_list.append({
                "institution_id": college["institution_id"],
                "name": college["institution_name"],
                "type": college.get("institution_type", "College"),
                "city": college.get("city"),
                "state": college.get("state"),
                "display_name": ", ".join(display_parts),
                "subscription_id": college.get("subscription_id")
            })
        
        # Optional: Group by type for better UX
        grouped = {}
        for college in colleges_list:
            college_type = college.get("type", "Other")
            if college_type not in grouped:
                grouped[college_type] = []
            grouped[college_type].append(college)
        
        return {
            "colleges": colleges_list,  # Flat list
            "colleges_grouped": grouped,  # Grouped by type
            "total_count": len(colleges_list)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch client colleges: {str(e)}")


@router.get("/colleges/{college_id}")
async def get_college_by_id(college_id: str):
    """Get single college details by ID"""
    from database.crud import get_db
    db = get_db()
    
    try:
        college = db.table("colleges")\
            .select("*")\
            .eq("id", college_id)\
            .single()\
            .execute()
        
        if not college.data:
            raise HTTPException(status_code=404, detail="College not found")
        
        return college.data
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/colleges/search/{query}")
async def search_colleges(query: str, limit: int = 50):
    """
    Search colleges by name or location.
    Example: /api/colleges/search/Chennai
    Example: /api/colleges/search/IIT
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        # Search by name or location
        results = db.table("colleges")\
            .select("id, name, location, code, institution_type")\
            .or_(f"name.ilike.%{query}%,location.ilike.%{query}%,institution_type.ilike.%{query}%")\
            .limit(limit)\
            .execute()
        
        return {
            "results": results.data or [],
            "count": len(results.data or []),
            "query": query
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/colleges/type/{institution_type}")
async def get_colleges_by_type(institution_type: str):
    """
    Get all colleges of a specific type.
    Example: /api/colleges/type/IIT
    Example: /api/colleges/type/NIT
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        colleges = db.table("colleges")\
            .select("id, name, location, code, institution_type")\
            .eq("institution_type", institution_type)\
            .order("name")\
            .execute()
        
        return {
            "colleges": colleges.data or [],
            "count": len(colleges.data or []),
            "type": institution_type
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
