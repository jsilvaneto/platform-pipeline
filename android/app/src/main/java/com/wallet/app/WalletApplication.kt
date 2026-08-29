package com.wallet.app

import android.app.Application
import androidx.room.Room
import com.wallet.app.data.local.WalletDatabase

class WalletApplication : Application() {

    lateinit var database: WalletDatabase
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        database = Room.databaseBuilder(
            applicationContext,
            WalletDatabase::class.java,
            "wallet_local.db"
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    companion object {
        lateinit var instance: WalletApplication
            private set
    }
}
