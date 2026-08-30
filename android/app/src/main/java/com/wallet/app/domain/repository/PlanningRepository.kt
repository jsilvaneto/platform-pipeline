package com.wallet.app.domain.repository

import com.wallet.app.data.local.entity.GoalEntity
import com.wallet.app.data.local.entity.ScheduleEntity
import kotlinx.coroutines.flow.Flow

interface PlanningRepository {
    fun getGoalsFlow(profile: String): Flow<List<GoalEntity>>
    fun getSchedulesFlow(profile: String): Flow<List<ScheduleEntity>>
    
    suspend fun saveGoal(goal: GoalEntity)
    suspend fun deleteGoal(id: String)
    
    suspend fun saveSchedule(schedule: ScheduleEntity)
    suspend fun deleteSchedule(id: String)
}
