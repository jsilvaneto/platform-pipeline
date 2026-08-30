package com.wallet.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.wallet.app.ui.navigation.Screen
import com.wallet.app.ui.navigation.bottomNavItems
import com.wallet.app.ui.screens.dashboard.DashboardScreen
import com.wallet.app.ui.screens.creditcards.CreditCardsScreen
import com.wallet.app.ui.screens.planning.PlanningScreen
import com.wallet.app.ui.screens.settings.SettingsScreen
import com.wallet.app.ui.screens.transactions.TransactionsScreen
import com.wallet.app.ui.viewmodel.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(viewModel: AppViewModel = hiltViewModel()) {
    val navController = rememberNavController()
    val activeProfile by viewModel.activeProfile.collectAsState()
    val pendingSync by viewModel.pendingSyncCount.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Wallet", fontWeight = FontWeight.Bold)
                        if (pendingSync > 0) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Badge { Text(pendingSync.toString()) }
                        }
                    }
                },
                actions = {
                    SuggestionChip(
                        onClick = { viewModel.toggleProfile() },
                        label = { Text(activeProfile) }
                    )
                }
            )
        },
        bottomBar = {
            NavigationBar {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                bottomNavItems.forEach { screen ->
                    NavigationBarItem(
                        icon = { Icon(screen.icon, contentDescription = null) },
                        label = { Text(screen.title) },
                        selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Dashboard.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Dashboard.route) {
                DashboardScreen(activeProfile = activeProfile)
            }
            composable(Screen.Transactions.route) {
                TransactionsScreen(activeProfile = activeProfile)
            }
            composable(Screen.CreditCards.route) {
                CreditCardsScreen(activeProfile = activeProfile)
            }
            composable(Screen.Planning.route) {
                PlanningScreen(activeProfile = activeProfile)
            }
            composable(Screen.Settings.route) {
                SettingsScreen(activeProfile = activeProfile)
            }
        }
    }
}
