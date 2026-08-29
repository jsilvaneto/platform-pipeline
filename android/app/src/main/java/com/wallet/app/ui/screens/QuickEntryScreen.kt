package com.wallet.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wallet.app.data.local.entity.TransactionEntity
import com.wallet.app.ui.theme.EmeraldPrimary
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickEntryScreen(
    profile: String,
    onBack: () -> Unit,
    onSave: (TransactionEntity) -> Unit
) {
    var description by remember { mutableStateOf("") }
    var amountStr by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("DESPESA") }
    val todayIso = remember {
        SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Novo Lançamento Rápido", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Voltar")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Seletor Tipo (Despesa / Receita)
            Row(modifier = Modifier.fillMaxWidth()) {
                Button(
                    onClick = { type = "DESPESA" },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (type == "DESPESA") MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.surfaceVariant
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Despesa")
                }
                Spacer(modifier = Modifier.width(8.dp))
                Button(
                    onClick = { type = "RECEITA" },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (type == "RECEITA") EmeraldPrimary else MaterialTheme.colorScheme.surfaceVariant
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Receita")
                }
            }

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Descrição") },
                placeholder = { Text("Ex: Almoço, Café, Gasolina") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp)
            )

            OutlinedTextField(
                value = amountStr,
                onValueChange = { amountStr = it },
                label = { Text("Valor (R$)") },
                placeholder = { Text("0,00") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp)
            )

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = {
                    val amountClean = amountStr.replace(",", ".").toDoubleOrNull() ?: 0.0
                    val amountCents = (amountClean * 100).toLong()
                    if (description.isNotBlank() && amountCents > 0) {
                        val trans = TransactionEntity(
                            profile = profile,
                            type = type,
                            description = description.trim(),
                            amountCents = amountCents,
                            dueDate = todayIso,
                            status = "PENDENTE",
                            syncStatus = "PENDENTE"
                        )
                        onSave(trans)
                    }
                },
                enabled = description.isNotBlank() && amountStr.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = EmeraldPrimary)
            ) {
                Text(
                    text = "Gravar no Dispositivo (Offline)",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = Color.White
                )
            }
        }
    }
}
