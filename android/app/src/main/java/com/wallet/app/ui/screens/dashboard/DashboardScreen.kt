package com.wallet.app.ui.screens.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wallet.app.ui.theme.EmeraldPrimary
import com.wallet.app.ui.theme.RoseExpense
import com.wallet.app.ui.utils.FormatUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel = hiltViewModel(),
    activeProfile: String
) {
    val uiState by viewModel.dashboardData.collectAsState()

    LaunchedEffect(activeProfile) {
        viewModel.setProfile(activeProfile)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Resumo Financeiro", fontWeight = FontWeight.Bold) }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(paddingValues).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { Spacer(modifier = Modifier.height(8.dp)) }

            item {
                KpiCard(
                    title = "Saldo Atual",
                    valueCents = uiState.balanceCents,
                    icon = Icons.Default.AccountBalanceWallet,
                    color = if (uiState.balanceCents >= 0) EmeraldPrimary else RoseExpense
                )
            }

            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    KpiCard(
                        modifier = Modifier.weight(1f),
                        title = "Receitas",
                        valueCents = uiState.totalIncomeCents,
                        icon = Icons.Default.TrendingUp,
                        color = EmeraldPrimary
                    )
                    KpiCard(
                        modifier = Modifier.weight(1f),
                        title = "Despesas",
                        valueCents = uiState.totalExpenseCents,
                        icon = Icons.Default.TrendingDown,
                        color = RoseExpense
                    )
                }
            }

            // More widgets can be added here (e.g., 50-30-20, Category charts)

            item { Spacer(modifier = Modifier.height(16.dp)) }
        }
    }
}

@Composable
fun KpiCard(
    modifier: Modifier = Modifier,
    title: String,
    valueCents: Long,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = title, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color.Gray)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = FormatUtils.formatCurrency(valueCents),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}
