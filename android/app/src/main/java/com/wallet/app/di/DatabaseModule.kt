package com.wallet.app.di

import android.content.Context
import androidx.room.Room
import com.wallet.app.data.local.WalletDatabase
import com.wallet.app.data.local.dao.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): WalletDatabase {
        return Room.databaseBuilder(
            context,
            WalletDatabase::class.java,
            "wallet_local.db"
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    fun provideTransactionDao(db: WalletDatabase): TransactionDao = db.transactionDao()

    @Provides
    fun provideCategoryDao(db: WalletDatabase): CategoryDao = db.categoryDao()

    @Provides
    fun provideAccountDao(db: WalletDatabase): AccountDao = db.accountDao()

    @Provides
    fun providePaymentMethodDao(db: WalletDatabase): PaymentMethodDao = db.paymentMethodDao()

    @Provides
    fun provideCreditCardDao(db: WalletDatabase): CreditCardDao = db.creditCardDao()

    @Provides
    fun provideGoalDao(db: WalletDatabase): GoalDao = db.goalDao()
}
