package com.wallet.app.ui.screens.creditcards

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.wallet.app.data.local.entity.CreditCardEntity
import com.wallet.app.data.local.entity.TransactionEntity
import com.wallet.app.ui.screens.transactions.TransactionItem
import com.wallet.app.ui.theme.EmeraldPrimary
import com.wallet.app.ui.utils.FormatUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreditCardsScreen(
    viewModel: CreditCardsViewModel = hiltViewModel(),
    activeProfile: String
) {
    val cards by viewModel.creditCards.collectAsState()
    val selectedCardId by viewModel.selectedCardId.collectAsState()
    val transactions by viewModel.selectedCardTransactions.collectAsState()

    LaunchedEffect(activeProfile) {
        viewModel.setProfile(activeProfile)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Cartões & Faturas", fontWeight = FontWeight.Bold) }
            )
        }
    ) { paddingValues ->
        Column(modifier = Modifier.padding(paddingValues)) {
            if (cards.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Nenhum cartão cadastrado", color = Color.Gray)
                }
            } else {
                // Card Carousel
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(cards) { card ->
                        VirtualCard(
                            card = card,
                            isSelected = card.id == selectedCardId,
                            onClick = { viewModel.selectCard(card.id) }
                        )
                    }
                }

                // Selected Card Info & Invoices
                if (selectedCardId != null) {
                    val selectedCard = cards.find { it.id == selectedCardId }
                    selectedCard?.let { card ->
                        Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                            Text(
                                text = "Fatura Atual",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            
                            if (transactions.isEmpty()) {
                                Text("Nenhuma compra nesta fatura", color = Color.Gray, fontSize = 14.sp)
                            } else {
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    items(transactions) { transaction ->
                                        TransactionItem(
                                            transaction = transaction,
                                            onToggleStatus = {},
                                            onDelete = {}
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun VirtualCard(
    card: CreditCardEntity,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val gradient = Brush.linearGradient(
        colors = listOf(Color(0xFF6A1B9A), Color(0xFF4527A0)) // Simplified purple theme
    )

    Card(
        modifier = Modifier
            .width(260.dp)
            .height(160.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        border = if (isSelected) CardDefaults.outlinedCardBorder().copy(width = 2.dp) else null
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(gradient)
                .padding(16.dp)
        ) {
            Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Icon(Icons.Default.CreditCard, contentDescription = null, tint = Color.White)
                    Text(text = card.brand ?: "VISA", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                
                Column {
                    Text(text = card.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text(text = "Limite: ${FormatUtils.formatCurrency(card.limitCents)}", color = Color.White.copy(alpha = 0.7f), fontSize = 12.sp)
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(text = "Corte: ${card.closingDay}", color = Color.White, fontSize = 12.sp)
                    Text(text = "Vence: ${card.dueDay}", color = Color.White, fontSize = 12.sp)
                }
            }
        }
    }
}
