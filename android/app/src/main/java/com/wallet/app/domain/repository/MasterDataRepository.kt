package com.wallet.app.domain.repository

import com.wallet.app.data.local.entity.*
import kotlinx.coroutines.flow.Flow

interface MasterDataRepository {
    fun getCategoriesFlow(profile: String): Flow<List<CategoryEntity>>
    fun getAccountsFlow(profile: String): Flow<List<AccountEntity>>
    fun getPaymentMethodsFlow(profile: String): Flow<List<PaymentMethodEntity>>
    fun getContactsFlow(profile: String): Flow<List<ContactEntity>>
    fun getCreditCardsFlow(profile: String): Flow<List<CreditCardEntity>>
    fun getItemsFlow(profile: String): Flow<List<ItemEntity>>
    
    suspend fun saveCategory(category: CategoryEntity)
    suspend fun saveAccount(account: AccountEntity)
    suspend fun savePaymentMethod(pm: PaymentMethodEntity)
    suspend fun saveContact(contact: ContactEntity)
    suspend fun saveCreditCard(card: CreditCardEntity)
    suspend fun saveItem(item: ItemEntity)
}
