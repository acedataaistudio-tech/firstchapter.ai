"""
Packages API Endpoint
Returns subscription packages for frontend
"""

from fastapi import APIRouter, HTTPException, Query
from database.crud import get_db
from typing import Optional, List

router = APIRouter()


@router.get("/packages")
def get_packages(type: Optional[str] = Query(None, description="Package type: individual or institution")):
    """
    Get all packages or filter by type
    
    Query params:
    - type: 'individual' or 'institution' (optional)
    
    Returns list of packages with pricing and features
    """
    try:
        db = get_db()
        
        # Start query
        query = db.table("packages").select("*").eq("is_active", True)
        
        # Filter by type if provided
        if type:
            query = query.eq("type", type)
        
        # Execute and order by price
        response = query.order("price_yearly").execute()
        
        packages = []
        for pkg in (response.data or []):
            # Calculate monthly price if yearly exists
            monthly_price = None
            if pkg.get("price_yearly"):
                # Monthly = (Yearly / 12) * 1.2 (20% discount for yearly)
                monthly_price = int((pkg["price_yearly"] / 12) * 1.2)
            
            package_data = {
                "id": pkg.get("id"),
                "name": pkg.get("name"),
                "type": pkg.get("type"),
                "price_monthly": pkg.get("price_monthly") or monthly_price,
                "price_yearly": pkg.get("price_yearly"),
                "query_limit": pkg.get("query_limit"),
                "token_limit": pkg.get("token_limit"),
                "features": pkg.get("features", []),
                "is_active": pkg.get("is_active", True),
                "popular": pkg.get("name") in ["Premium", "Institution Growth"],  # Mark popular ones
            }
            packages.append(package_data)
        
        return {
            "packages": packages,
            "total": len(packages)
        }
        
    except Exception as e:
        print(f"Error fetching packages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/packages/{package_id}")
def get_package_by_id(package_id: str):
    """Get single package by ID"""
    try:
        db = get_db()
        
        package = db.table("packages")\
            .select("*")\
            .eq("id", package_id)\
            .single()\
            .execute()
        
        if not package.data:
            raise HTTPException(status_code=404, detail="Package not found")
        
        pkg = package.data
        
        # Calculate monthly price if needed
        monthly_price = pkg.get("price_monthly")
        if not monthly_price and pkg.get("price_yearly"):
            monthly_price = int((pkg["price_yearly"] / 12) * 1.2)
        
        return {
            "package": {
                "id": pkg.get("id"),
                "name": pkg.get("name"),
                "type": pkg.get("type"),
                "price_monthly": monthly_price,
                "price_yearly": pkg.get("price_yearly"),
                "query_limit": pkg.get("query_limit"),
                "token_limit": pkg.get("token_limit"),
                "features": pkg.get("features", []),
                "is_active": pkg.get("is_active", True),
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching package: {e}")
        raise HTTPException(status_code=500, detail=str(e))
