from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.database import get_db
from app.models import Goal, User
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse, GoalContribute
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/goals", tags=["Metas"])

@router.get("", response_model=List[GoalResponse])
async def list_goals(
    profile: Optional[str] = Query(None, description="Filtrar por PESSOAL ou EMPRESA"),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    query = select(Goal)
    if profile:
        query = query.where(Goal.profile == profile)
    if status_filter:
        query = query.where(Goal.status == status_filter)
    query = query.order_by(Goal.created_at.desc())
    result = await db.execute(query)
    goals = result.scalars().all()

    response_list = []
    for g in goals:
        pct = round((g.current_amount_cents / g.target_amount_cents) * 100, 2) if g.target_amount_cents > 0 else 0.0
        response_list.append(GoalResponse(
            id=g.id,
            profile=g.profile, # type: ignore
            title=g.title,
            target_amount_cents=g.target_amount_cents,
            current_amount_cents=g.current_amount_cents,
            target_date=g.target_date,
            status=g.status, # type: ignore
            created_at=g.created_at,
            progress_percentage=pct
        ))

    return response_list

@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal_in: GoalCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    new_goal = Goal(**goal_in.model_dump())
    db.add(new_goal)
    await db.commit()
    await db.refresh(new_goal)

    pct = round((new_goal.current_amount_cents / new_goal.target_amount_cents) * 100, 2) if new_goal.target_amount_cents > 0 else 0.0
    return GoalResponse(
        id=new_goal.id,
        profile=new_goal.profile, # type: ignore
        title=new_goal.title,
        target_amount_cents=new_goal.target_amount_cents,
        current_amount_cents=new_goal.current_amount_cents,
        target_date=new_goal.target_date,
        status=new_goal.status, # type: ignore
        created_at=new_goal.created_at,
        progress_percentage=pct
    )

@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    goal_in: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    goal = await db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meta não encontrada")

    update_data = goal_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)

    if goal.current_amount_cents >= goal.target_amount_cents:
        goal.status = "CONCLUIDA"

    await db.commit()
    await db.refresh(goal)

    pct = round((goal.current_amount_cents / goal.target_amount_cents) * 100, 2) if goal.target_amount_cents > 0 else 0.0
    return GoalResponse(
        id=goal.id,
        profile=goal.profile, # type: ignore
        title=goal.title,
        target_amount_cents=goal.target_amount_cents,
        current_amount_cents=goal.current_amount_cents,
        target_date=goal.target_date,
        status=goal.status, # type: ignore
        created_at=goal.created_at,
        progress_percentage=pct
    )

@router.post("/{goal_id}/contribute", response_model=GoalResponse)
async def contribute_to_goal(
    goal_id: str,
    payload: GoalContribute,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Registra um aporte (depósito) ou resgate em uma meta financeira."""
    goal = await db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meta não encontrada")

    if payload.action == "APORTE":
        goal.current_amount_cents += payload.amount_cents
    elif payload.action == "RESGATE":
        goal.current_amount_cents = max(0, goal.current_amount_cents - payload.amount_cents)

    if goal.current_amount_cents >= goal.target_amount_cents:
        goal.status = "CONCLUIDA"
    elif goal.current_amount_cents < goal.target_amount_cents and goal.status == "CONCLUIDA":
        goal.status = "EM_ANDAMENTO"

    await db.commit()
    await db.refresh(goal)

    pct = round((goal.current_amount_cents / goal.target_amount_cents) * 100, 2) if goal.target_amount_cents > 0 else 0.0
    return GoalResponse(
        id=goal.id,
        profile=goal.profile, # type: ignore
        title=goal.title,
        target_amount_cents=goal.target_amount_cents,
        current_amount_cents=goal.current_amount_cents,
        target_date=goal.target_date,
        status=goal.status, # type: ignore
        created_at=goal.created_at,
        progress_percentage=pct
    )

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user)
):
    goal = await db.get(Goal, goal_id)
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meta não encontrada")
    await db.delete(goal)
    await db.commit()
