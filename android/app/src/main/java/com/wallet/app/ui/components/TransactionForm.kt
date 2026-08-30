package com.wallet.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.wallet.app.data.local.entity.*
import com.wallet.app.ui.utils.FormatUtils
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionForm(
    profile: String,
    categories: List<CategoryEntity>,
    accounts: List<AccountEntity>,
    paymentMethods: List<PaymentMethodEntity>,
    creditCards: List<CreditCardEntity>,
    contacts: List<ContactEntity>,
    onSave: (TransactionEntity) -> Unit,
    onCancel: () -> Unit
) {
    var type by remember { mutableStateOf("DESPESA") }
    var description by remember { mutableStateOf("") }
    var amountStr by remember { mutableStateOf("") }
    var dueDate by remember { mutableStateOf(FormatUtils.getTodayISO()) }
    var categoryId by remember { mutableStateOf<String?>(null) }
    var accountId by remember { mutableStateOf<String?>(null) }
    var paymentMethodId by remember { mutableStateOf<String?>(null) }
    var creditCardId by remember { mutableStateOf<String?>(null) }
    var contactId by remember { mutableStateOf<String?>(null) }
    var notes by remember { mutableStateOf("") }

    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "Novo Lançamento",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )

        // Type Selector
        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
            SegmentedButton(
                selected = type == "DESPESA",
                onClick = { type = "DESPESA" },
                shape = SegmentedButtonDefaults.itemShape(index = 0, count = 3)
            ) {
                Text("Despesa")
            }
            SegmentedButton(
                selected = type == "RECEITA",
                onClick = { type = "RECEITA" },
                shape = SegmentedButtonDefaults.itemShape(index = 1, count = 3)
            ) {
                Text("Receita")
            }
            SegmentedButton(
                selected = type == "TRANSFERENCIA",
                onClick = { type = "TRANSFERENCIA" },
                shape = SegmentedButtonDefaults.itemShape(index = 2, count = 3)
            ) {
                Text("Transf.")
            }
        }

        OutlinedTextField(
            value = description,
            onValueChange = { description = it },
            label = { Text("Descrição") },
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(
            value = amountStr,
            onValueChange = { amountStr = it },
            label = { Text("Valor (R$)") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("0,00") }
        )

        // Due Date (Simplistic for now)
        OutlinedTextField(
            value = dueDate,
            onValueChange = { dueDate = it },
            label = { Text("Data (YYYY-MM-DD)") },
            modifier = Modifier.fillMaxWidth(),
            trailingIcon = { Icon(Icons.Default.CalendarToday, null) }
        )

        // Dropdowns (Category, Account, Card, Contact)
        // I'll implement a simple reusable Dropdown component later
        
        DropdownField(
            label = "Categoria",
            options = categories.map { it.id to it.name },
            selectedId = categoryId,
            onSelected = { categoryId = it }
        )

        DropdownField(
            label = "Conta / Carteira",
            options = accounts.map { it.id to it.name },
            selectedId = accountId,
            onSelected = { accountId = it }
        )

        if (type == "DESPESA") {
            DropdownField(
                label = "Cartão de Crédito",
                options = creditCards.map { it.id to it.name },
                selectedId = creditCardId,
                onSelected = { creditCardId = it }
            )
        }

        DropdownField(
            label = "Meio de Pagamento",
            options = paymentMethods.map { it.id to it.name },
            selectedId = paymentMethodId,
            onSelected = { paymentMethodId = it }
        )

        DropdownField(
            label = "Contato",
            options = contacts.map { it.id to it.name },
            selectedId = contactId,
            onSelected = { contactId = it }
        )

        OutlinedTextField(
            value = notes,
            onValueChange = { notes = it },
            label = { Text("Observações") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 2
        )

        Spacer(modifier = Modifier.height(8.dp))

        Button(
            onClick = {
                val amountCents = (amountStr.replace(",", ".").toDoubleOrNull() ?: 0.0 * 100).toLong()
                val transaction = TransactionEntity(
                    id = UUID.randomUUID().toString(),
                    profile = profile,
                    type = type,
                    description = description,
                    amountCents = amountCents,
                    dueDate = dueDate,
                    categoryId = categoryId,
                    categoryName = categories.find { it.id == categoryId }?.name,
                    accountId = accountId,
                    accountName = accounts.find { it.id == accountId }?.name,
                    paymentMethodId = paymentMethodId,
                    paymentMethodName = paymentMethods.find { it.id == paymentMethodId }?.name,
                    creditCardId = creditCardId,
                    creditCardName = creditCards.find { it.id == creditCardId }?.name,
                    contactId = contactId,
                    contactName = contacts.find { it.id == contactId }?.name,
                    notes = notes,
                    status = "PENDENTE",
                    syncStatus = "PENDENTE"
                )
                onSave(transaction)
            },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("Salvar Lançamento")
        }

        TextButton(
            onClick = onCancel,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Cancelar")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DropdownField(
    label: String,
    options: List<Pair<String, String>>,
    selectedId: String?,
    onSelected: (String?) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedName = options.find { it.first == selectedId }?.second ?: ""

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded }
    ) {
        OutlinedTextField(
            value = selectedName,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
            modifier = Modifier.menuAnchor().fillMaxWidth()
        )

        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            DropdownMenuItem(
                text = { Text("Nenhum") },
                onClick = {
                    onSelected(null)
                    expanded = false
                }
            )
            options.forEach { (id, name) ->
                DropdownMenuItem(
                    text = { Text(name) },
                    onClick = {
                        onSelected(id)
                        expanded = false
                    }
                )
            }
        }
    }
}
