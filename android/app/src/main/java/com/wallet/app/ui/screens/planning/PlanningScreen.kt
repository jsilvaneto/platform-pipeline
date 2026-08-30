package com.wallet.app.ui.screens.planning

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.wallet.app.data.local.entity.GoalEntity
import com.wallet.app.data.local.entity.ScheduleEntity
import com.wallet.app.ui.theme.EmeraldPrimary
import com.wallet.app.ui.utils.FormatUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlanningScreen(
    viewModel: PlanningViewModel = hiltViewModel(),
    activeProfile: String
) {
    val goals by viewModel.goals.collectAsState()
    val schedules by viewModel.schedules.collectAsState()

    LaunchedEffect(activeProfile) {
        viewModel.setProfile(activeProfile)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Planejamento & Futuro", fontWeight = FontWeight.Bold) }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(paddingValues).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { Spacer(modifier = Modifier.height(8.dp)) }

            // Goals Section
            item {
                Text(
                    text = "Metas Financeiras",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            if (goals.isEmpty()) {
                item {
                    Text("Nenhuma meta cadastrada", color = Color.Gray, fontSize = 14.sp)
                }
            } else {
                items(goals) { goal ->
                    GoalItem(goal = goal)
                }
            }

            // Schedules Section
            item {
                Text(
                    text = "Assinaturas & Recorrências",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            if (schedules.isEmpty()) {
                item {
                    Text("Nenhuma assinatura cadastrada", color = Color.Gray, fontSize = 14.sp)
                }
            } else {
                items(schedules) { schedule ->
                    ScheduleItem(schedule = schedule)
                }
            }

            item { Spacer(modifier = Modifier.height(16.dp)) }
        }
    }
}

@Composable
fun GoalItem(goal: GoalEntity) {
    val progress = if (goal.targetAmountCents > 0) {
        goal.currentAmountCents.toFloat() / goal.targetAmountCents.toFloat()
    } else 0f

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = goal.title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth().height(8.dp),
                color = EmeraldPrimary,
                trackColor = Color.LightGray,
                strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(
                    text = FormatUtils.formatCurrency(goal.currentAmountCents),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = EmeraldPrimary
                )
                Text(
                    text = "Alvo: ${FormatUtils.formatCurrency(goal.targetAmountCents)}",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }
        }
    }
}

@Composable
fun ScheduleItem(schedule: ScheduleEntity) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = schedule.description, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(text = "Frequência: ${schedule.frequency}", fontSize = 12.sp, color = Color.Gray)
            }
            Text(
                text = FormatUtils.formatCurrency(schedule.amountCents),
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
        }
    }
}
