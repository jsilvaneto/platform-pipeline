package com.wallet.app.di

import com.wallet.app.data.repository.MasterDataRepositoryImpl
import com.wallet.app.data.repository.PlanningRepositoryImpl
import com.wallet.app.data.repository.TransactionRepositoryImpl
import com.wallet.app.domain.repository.MasterDataRepository
import com.wallet.app.domain.repository.PlanningRepository
import com.wallet.app.domain.repository.TransactionRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindTransactionRepository(
        transactionRepositoryImpl: TransactionRepositoryImpl
    ): TransactionRepository

    @Binds
    @Singleton
    abstract fun bindMasterDataRepository(
        masterDataRepositoryImpl: MasterDataRepositoryImpl
    ): MasterDataRepository

    @Binds
    @Singleton
    abstract fun bindPlanningRepository(
        planningRepositoryImpl: PlanningRepositoryImpl
    ): PlanningRepository
}
