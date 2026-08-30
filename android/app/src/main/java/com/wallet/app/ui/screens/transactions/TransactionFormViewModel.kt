package com.wallet.app.ui.screens.transactions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.wallet.app.data.local.entity.*
import com.wallet.app.domain.repository.MasterDataRepository
import com.wallet.app.domain.repository.TransactionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TransactionFormViewModel @Inject constructor(
    private val transactionRepository: TransactionRepository,
    private val masterDataRepository: MasterDataRepository
) : ViewModel() {

    private val _profile = MutableStateFlow("PESSOAL")
    
    val categories = _profile.flatMapLatest { masterDataRepository.getCategoriesFlow(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
        
    val accounts = _profile.flatMapLatest { masterDataRepository.getAccountsFlow(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
        
    val paymentMethods = _profile.flatMapLatest { masterDataRepository.getPaymentMethodsFlow(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
        
    val creditCards = _profile.flatMapLatest { masterDataRepository.getCreditCardsFlow(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
        
    val contacts = _profile.flatMapLatest { masterDataRepository.getContactsFlow(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setProfile(profile: String) {
        _profile.value = profile
    }

    fun saveTransaction(transaction: TransactionEntity) {
        viewModelScope.launch {
            transactionRepository.saveTransaction(transaction)
        }
    }
}
