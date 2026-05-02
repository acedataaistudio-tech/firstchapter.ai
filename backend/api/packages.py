"""
Packages API - Fetch institutional packages
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

router = APIRouter()

@router.get("/packages")
async def get_packages(type: Optional[str] = Query(None)):
    """
    Get packages, optionally filtered by type.
    
    Query params:
    - type: 'individual' or 'institution'
    
    Example: /api/packages?type=institution
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        query = db.table("packages").select("*").eq("is_active", True)
        
        # Filter by type if provided
        if type:
            query = query.eq("type", type)
        
        result = query.order("price_yearly").execute()
        
        return {
            "packages": result.data or [],
            "count": len(result.data or [])
        }
    
    except Exception as e:
        print(f"Error fetching packages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/packages/{package_id}")
async def get_package_by_id(package_id: str):
    """Get single package details by ID"""
    from database.crud import get_db
    db = get_db()
    
    try:
        result = db.table("packages")\
            .select("*")\
            .eq("id", package_id)\
            .single()\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Package not found")
        
        return result.data
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
