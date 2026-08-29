package com.wallet.app.domain.repository

import com.wallet.app.data.local.entity.TransactionEntity
import kotlinx.coroutines.flow.Flow

interface TransactionRepository {
    fun getTransactionsByProfileFlow(profile: String): Flow<List<TransactionEntity>>
    suspend fun saveTransaction(transaction: TransactionEntity)
    suspend fun deleteTransaction(id: String)
    suspend fun syncTransactions(profile: String)
}
