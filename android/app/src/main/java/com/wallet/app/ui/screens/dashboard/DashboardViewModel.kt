package com.wallet.app.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wallet.app.domain.repository.TransactionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val transactionRepository: TransactionRepository
) : ViewModel() {

    private val _profile = MutableStateFlow("PESSOAL")

    val dashboardData = _profile.flatMapLatest { profile ->
        transactionRepository.getTransactionsByProfileFlow(profile).map { transactions ->
            val income = transactions.filter { it.type == "RECEITA" }.sumOf { it.amountCents }
            val expense = transactions.filter { it.type == "DESPESA" }.sumOf { it.amountCents }
            DashboardUiState(
                totalIncomeCents = income,
                totalExpenseCents = expense,
                balanceCents = income - expense
            )
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DashboardUiState())

    fun setProfile(profile: String) {
        _profile.value = profile
    }
}

data class DashboardUiState(
    val totalIncomeCents: Long = 0,
    val totalExpenseCents: Long = 0,
    val balanceCents: Long = 0
)
