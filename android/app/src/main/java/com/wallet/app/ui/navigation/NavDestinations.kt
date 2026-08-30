package com.wallet.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    object Dashboard : Screen("dashboard", "Dashboard", Icons.Default.Dashboard)
    object Transactions : Screen("transactions", "Lançamentos", Icons.Default.ReceiptLong)
    object CreditCards : Screen("credit_cards", "Cartões", Icons.Default.CreditCard)
    object Planning : Screen("planning", "Planejamento", Icons.Default.TrendingUp)
    object Settings : Screen("settings", "Ajustes", Icons.Default.Settings)
}

val bottomNavItems = listOf(
    Screen.Dashboard,
    Screen.Transactions,
    Screen.CreditCards,
    Screen.Planning,
    Screen.Settings
)
