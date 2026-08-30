package com.wallet.app.ui.screens

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.wallet.app.ui.navigation.Screen
import com.wallet.app.ui.navigation.bottomNavItems

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen() {
    val navController = rememberNavController()
    var activeProfile by remember { mutableStateOf("PESSOAL") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Wallet") },
                actions = {
                    SuggestionChip(
                        onClick = { activeProfile = if (activeProfile == "PESSOAL") "EMPRESA" else "PESSOAL" },
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
                // For now, reuse the existing HomeScreen as Dashboard
                // We'll refactor it later
                Text("Dashboard Screen (Work in Progress)")
            }
            composable(Screen.Transactions.route) {
                Text("Transactions Screen (Work in Progress)")
            }
            composable(Screen.CreditCards.route) {
                Text("Credit Cards Screen (Work in Progress)")
            }
            composable(Screen.Planning.route) {
                Text("Planning Screen (Work in Progress)")
            }
            composable(Screen.Settings.route) {
                Text("Settings Screen (Work in Progress)")
            }
        }
    }
}
