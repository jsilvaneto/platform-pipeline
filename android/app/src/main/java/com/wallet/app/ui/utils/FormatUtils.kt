package com.wallet.app.ui.utils

import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

object FormatUtils {
    private val brLocale = Locale("pt", "BR")
    private val currencyFormat = NumberFormat.getCurrencyInstance(brLocale)
    private val isoDateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    private val brDateFormat = SimpleDateFormat("dd/MM/yyyy", brLocale)

    fun formatCurrency(amountCents: Long): String {
        return currencyFormat.format(amountCents / 100.0)
    }

    fun formatDateToBR(isoDate: String): String {
        return try {
            val date = isoDateFormat.parse(isoDate)
            brDateFormat.format(date!!)
        } catch (e: Exception) {
            isoDate
        }
    }

    fun getTodayISO(): String {
        return isoDateFormat.format(Date())
    }
}
