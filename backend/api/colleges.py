"""
Colleges API Endpoint - Optimized for Your Database
Uses actual columns: id, name, location, code, is_client, institution_type
"""

from fastapi import APIRouter, HTTPException
from database.crud import get_db
from typing import Optional

router = APIRouter()


@router.get("/colleges")
def get_all_colleges(search: Optional[str] = None):
    """
    Get all colleges from database
    
    Query params:
    - search: Search by name or location (optional)
    
    Returns list of colleges with:
    - id, name, location, code, is_client, institution_type
    - has_subscription (derived from is_client)
    - state (extracted from location)
    """
    try:
        db = get_db()
        
        # Start query
        query = db.table("colleges").select("*")
        
        # Search by name or location if provided
        if search:
            query = query.or_(f"name.ilike.%{search}%,location.ilike.%{search}%")
        
        # Execute and order by name
        response = query.order("name").limit(1000).execute()
        
        # Transform data for frontend
        colleges = []
        for college in (response.data or []):
            # Extract state from location (format: "City, State")
            location = college.get("location", "")
            state = ""
            if location and "," in location:
                state = location.split(",")[-1].strip()
            
            college_data = {
                "id": college.get("id"),
                "name": college.get("name", "Unknown"),
                "location": location,
                "state": state,
                "code": college.get("code", ""),
                "type": college.get("institution_type", "unknown"),
                "has_subscription": college.get("is_client", False),
                "website": college.get("website"),
                "contact_email": college.get("contact_email"),
            }
            colleges.append(college_data)
        
        return {
            "colleges": colleges,
            "total": len(colleges)
        }
        
    except Exception as e:
        print(f"Error fetching colleges: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/colleges/{college_id}")
def get_college_by_id(college_id: str):
    """Get single college by ID with subscription details"""
    try:
        db = get_db()
        
        college = db.table("colleges")\
            .select("*")\
            .eq("id", college_id)\
            .single()\
            .execute()
        
        if not college.data:
            raise HTTPException(status_code=404, detail="College not found")
        
        # Get subscription details if is_client is True
        subscription = None
        if college.data.get("is_client"):
            sub_response = db.table("subscriptions")\
                .select("id, package_id, start_date, end_date, is_active")\
                .eq("institution_id", college_id)\
                .eq("is_active", True)\
                .execute()
            
            if sub_response.data:
                subscription = sub_response.data[0]
        
        # Extract state from location
        location = college.data.get("location", "")
        state = ""
        if location and "," in location:
            state = location.split(",")[-1].strip()
        
        return {
            "college": {
                "id": college.data.get("id"),
                "name": college.data.get("name"),
                "location": location,
                "state": state,
                "code": college.data.get("code"),
                "type": college.data.get("institution_type"),
                "has_subscription": college.data.get("is_client", False),
                "website": college.data.get("website"),
                "contact_email": college.data.get("contact_email"),
                "subscription": subscription
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching college: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/states")
def get_all_states():
    """Get list of all states (extracted from location field)"""
    try:
        db = get_db()
        
        response = db.table("colleges")\
            .select("location")\
            .execute()
        
        # Extract unique states from location field
        states = set()
        for college in (response.data or []):
            location = college.get("location", "")
            if location and "," in location:
                state = location.split(",")[-1].strip()
                if state:
                    states.add(state)
        
        states_list = sorted(list(states))
        
        return {
            "states": states_list,
            "total": len(states_list)
        }
        
    except Exception as e:
        print(f"Error fetching states: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/colleges/search/{query}")
def search_colleges(query: str):
    """
    Dedicated search endpoint
    Searches by name, location, or code
    """
    try:
        db = get_db()
        
        response = db.table("colleges")\
            .select("*")\
            .or_(f"name.ilike.%{query}%,location.ilike.%{query}%,code.ilike.%{query}%")\
            .order("name")\
            .limit(50)\
            .execute()
        
        # Transform results
        colleges = []
        for college in (response.data or []):
            location = college.get("location", "")
            state = location.split(",")[-1].strip() if location and "," in location else ""
            
            colleges.append({
                "id": college.get("id"),
                "name": college.get("name"),
                "location": location,
                "state": state,
                "code": college.get("code"),
                "type": college.get("institution_type"),
                "has_subscription": college.get("is_client", False),
            })
        
        return {
            "colleges": colleges,
            "total": len(colleges),
            "query": query
        }
        
    except Exception as e:
        print(f"Error searching colleges: {e}")
        raise HTTPException(status_code=500, detail=str(e))
