package com.wallet.app.ui.screens.creditcards

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wallet.app.data.local.entity.CreditCardEntity
import com.wallet.app.data.local.entity.TransactionEntity
import com.wallet.app.domain.repository.MasterDataRepository
import com.wallet.app.domain.repository.TransactionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import javax.inject.Inject

@HiltViewModel
class CreditCardsViewModel @Inject constructor(
    private val masterDataRepository: MasterDataRepository,
    private val transactionRepository: TransactionRepository
) : ViewModel() {

    private val _profile = MutableStateFlow("PESSOAL")
    
    val creditCards = _profile.flatMapLatest { masterDataRepository.getCreditCardsFlow(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _selectedCardId = MutableStateFlow<String?>(null)
    val selectedCardId = _selectedCardId.asStateFlow()

    val selectedCardTransactions = combine(_selectedCardId, _profile) { cardId, profile ->
        cardId to profile
    }.flatMapLatest { (cardId, profile) ->
        if (cardId == null) flowOf(emptyList<TransactionEntity>())
        else transactionRepository.getTransactionsByProfileFlow(profile)
            .map { list -> list.filter { it.creditCardId == cardId } }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setProfile(profile: String) {
        _profile.value = profile
    }

    fun selectCard(id: String?) {
        _selectedCardId.value = id
    }
}
