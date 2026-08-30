package com.wallet.app.ui.screens.planning

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wallet.app.data.local.entity.GoalEntity
import com.wallet.app.data.local.entity.ScheduleEntity
import com.wallet.app.domain.repository.PlanningRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PlanningViewModel @Inject constructor(
    private val planningRepository: PlanningRepository
) : ViewModel() {

    private val _profile = MutableStateFlow("PESSOAL")

    val goals = _profile.flatMapLatest { planningRepository.getGoalsFlow(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val schedules = _profile.flatMapLatest { planningRepository.getSchedulesFlow(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setProfile(profile: String) {
        _profile.value = profile
    }

    fun deleteGoal(id: String) {
        viewModelScope.launch {
            planningRepository.deleteGoal(id)
        }
    }

    fun deleteSchedule(id: String) {
        viewModelScope.launch {
            planningRepository.deleteSchedule(id)
        }
    }
}
