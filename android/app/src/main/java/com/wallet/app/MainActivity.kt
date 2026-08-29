package com.wallet.app

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.lifecycle.lifecycleScope
import com.wallet.app.data.local.entity.TransactionEntity
import com.wallet.app.ui.screens.HomeScreen
import com.wallet.app.ui.screens.QuickEntryScreen
import com.wallet.app.ui.theme.WalletTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val dao = (application as WalletApplication).database.transactionDao()

        setContent {
            WalletTheme {
                var currentScreen by remember { mutableStateOf("HOME") }
                var activeProfile by remember { mutableStateOf("PESSOAL") }

                val transactions by dao.getTransactionsByProfileFlow(activeProfile)
                    .collectAsState(initial = emptyList())

                if (currentScreen == "HOME") {
                    HomeScreen(
                        transactions = transactions,
                        activeProfile = activeProfile,
                        onProfileChanged = { activeProfile = it },
                        onQuickEntryClick = { currentScreen = "QUICK_ENTRY" },
                        onSyncClick = {
                            Toast.makeText(this, "Sincronização acionada em segundo plano", Toast.LENGTH_SHORT).show()
                        }
                    )
                } else {
                    QuickEntryScreen(
                        profile = activeProfile,
                        onBack = { currentScreen = "HOME" },
                        onSave = { newTrans ->
                            lifecycleScope.launch {
                                dao.insertOrReplace(newTrans)
                                Toast.makeText(this@MainActivity, "Salvo offline no aparelho!", Toast.LENGTH_SHORT).show()
                                currentScreen = "HOME"
                            }
                        }
                    )
                }
            }
        }
    }
}
