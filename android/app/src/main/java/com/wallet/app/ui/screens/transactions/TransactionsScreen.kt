package com.wallet.app.ui.screens.transactions

import androidx.compose.foundation.background
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
import com.wallet.app.data.local.entity.TransactionEntity
import com.wallet.app.ui.components.TransactionForm
import com.wallet.app.ui.theme.EmeraldPrimary
import com.wallet.app.ui.theme.RoseExpense
import com.wallet.app.ui.utils.FormatUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionsScreen(
    viewModel: TransactionsViewModel = hiltViewModel(),
    formViewModel: TransactionFormViewModel = hiltViewModel(),
    activeProfile: String
) {
    val transactions by viewModel.transactions.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val categories by formViewModel.categories.collectAsState()
    val accounts by formViewModel.accounts.collectAsState()
    val paymentMethods by formViewModel.paymentMethods.collectAsState()
    val creditCards by formViewModel.creditCards.collectAsState()
    val contacts by formViewModel.contacts.collectAsState()

    var showForm by remember { mutableStateOf(false) }

    LaunchedEffect(activeProfile) {
        viewModel.setProfile(activeProfile)
        formViewModel.setProfile(activeProfile)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Lançamentos", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { /* TODO: Filter */ }) {
                        Icon(Icons.Default.FilterList, contentDescription = "Filtrar")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showForm = true },
                containerColor = EmeraldPrimary,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Novo")
            }
        }
    ) { paddingValues ->
        if (showForm) {
            ModalBottomSheet(
                onDismissRequest = { showForm = false },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
            ) {
                TransactionForm(
                    profile = activeProfile,
                    categories = categories,
                    accounts = accounts,
                    paymentMethods = paymentMethods,
                    creditCards = creditCards,
                    contacts = contacts,
                    onSave = { 
                        formViewModel.saveTransaction(it)
                        showForm = false
                    },
                    onCancel = { showForm = false }
                )
            }
        }

        Column(modifier = Modifier.padding(paddingValues)) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { viewModel.setSearchQuery(it) },
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                placeholder = { Text("Buscar lançamentos...") },
                leadingIcon = { Icon(Icons.Default.Search, null) },
                shape = RoundedCornerShape(12.dp)
            )

            if (transactions.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Nenhum lançamento encontrado", color = Color.Gray)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item { Spacer(modifier = Modifier.height(8.dp)) }
                    items(transactions) { transaction ->
                        TransactionItem(
                            transaction = transaction,
                            onToggleStatus = { viewModel.toggleTransactionStatus(transaction) },
                            onDelete = { viewModel.deleteTransaction(transaction.id) }
                        )
                    }
                    item { Spacer(modifier = Modifier.height(16.dp)) }
                }
            }
        }
    }
}

@Composable
fun TransactionItem(
    transaction: TransactionEntity,
    onToggleStatus: () -> Unit,
    onDelete: () -> Unit
) {
    val isExpense = transaction.type == "DESPESA"
    val isCompleted = transaction.status == "CONCLUIDO"

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon based on type
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(
                        color = if (isExpense) RoseExpense.copy(alpha = 0.1f) else EmeraldPrimary.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(10.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isExpense) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                    contentDescription = null,
                    tint = if (isExpense) RoseExpense else EmeraldPrimary,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = transaction.description,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    maxLines = 1
                )
                Text(
                    text = "${FormatUtils.formatDateToBR(transaction.dueDate)} • ${transaction.categoryName ?: "Sem categoria"}",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = (if (isExpense) "- " else "+ ") + FormatUtils.formatCurrency(transaction.amountCents),
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = if (isExpense) RoseExpense else EmeraldPrimary
                )
                
                IconButton(
                    onClick = onToggleStatus,
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        imageVector = if (isCompleted) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                        contentDescription = null,
                        tint = if (isCompleted) EmeraldPrimary else Color.Gray,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}
