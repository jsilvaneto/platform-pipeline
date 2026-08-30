package com.wallet.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wallet.app.data.local.dao.TransactionDao
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class AppViewModel @Inject constructor(
    private val transactionDao: TransactionDao
) : ViewModel() {

    private val _activeProfile = MutableStateFlow("PESSOAL")
    val activeProfile = _activeProfile.asStateFlow()

    val pendingSyncCount = _activeProfile.flatMapLatest { profile ->
        // This is a placeholder. In a real DAO we would have a query for this.
        flowOf(0) 
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    fun toggleProfile() {
        _activeProfile.value = if (_activeProfile.value == "PESSOAL") "EMPRESA" else "PESSOAL"
    }

    fun setProfile(profile: String) {
        _activeProfile.value = profile
    }
}
