package com.wallet.app.ui.screens.transactions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wallet.app.data.local.entity.TransactionEntity
import com.wallet.app.domain.repository.TransactionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TransactionsViewModel @Inject constructor(
    private val transactionRepository: TransactionRepository
) : ViewModel() {

    private val _activeProfile = MutableStateFlow("PESSOAL")
    val activeProfile: StateFlow<String> = _activeProfile.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery = _searchQuery.asStateFlow()

    val transactions: StateFlow<List<TransactionEntity>> = combine(_activeProfile, _searchQuery) { profile, query ->
        profile to query
    }.flatMapLatest { (profile, query) ->
        transactionRepository.getTransactionsByProfileFlow(profile).map { list ->
            if (query.isBlank()) list
            else list.filter { it.description.contains(query, ignoreCase = true) || (it.categoryName ?: "").contains(query, ignoreCase = true) }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setProfile(profile: String) {
        _activeProfile.value = profile
    }

    fun toggleTransactionStatus(transaction: TransactionEntity) {
        viewModelScope.launch {
            val newStatus = if (transaction.status == "CONCLUIDO") "PENDENTE" else "CONCLUIDO"
            // In a real app we would also handle paymentDate
            transactionRepository.saveTransaction(transaction.copy(status = newStatus))
        }
    }

    fun deleteTransaction(id: String) {
        viewModelScope.launch {
            transactionRepository.deleteTransaction(id)
        }
    }
}
