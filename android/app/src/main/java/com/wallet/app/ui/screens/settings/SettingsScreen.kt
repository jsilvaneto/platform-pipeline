package com.wallet.app.ui.screens.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(activeProfile: String) {
    val settingsOptions = listOf(
        SettingItem("Categorias", Icons.Default.Tag),
        SettingItem("Contas & Carteiras", Icons.Default.AccountBalance),
        SettingItem("Formas de Pagamento", Icons.Default.Payment),
        SettingItem("Contatos", Icons.Default.People),
        SettingItem("Dívidas & Passivos", Icons.Default.MoneyOff),
        SettingItem("Orçamentos", Icons.Default.PieChart),
        SettingItem("Sincronização", Icons.Default.Sync),
        SettingItem("Backup", Icons.Default.CloudUpload),
        SettingItem("Usuários", Icons.Default.Person),
        SettingItem("Aparência", Icons.Default.Palette)
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Ajustes & Cadastros", fontWeight = FontWeight.Bold) }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(paddingValues)
        ) {
            item {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Perfil Ativo: $activeProfile",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            items(settingsOptions) { item ->
                ListItem(
                    headlineContent = { Text(item.title) },
                    leadingContent = { Icon(item.icon, contentDescription = null) },
                    trailingContent = { Icon(Icons.Default.ChevronRight, contentDescription = null) },
                    modifier = Modifier.clickable { /* TODO: Navigate to detail */ }
                )
                HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), thickness = 0.5.dp)
            }
        }
    }
}

data class SettingItem(val title: String, val icon: ImageVector)
