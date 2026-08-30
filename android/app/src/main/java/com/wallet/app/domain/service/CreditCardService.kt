package com.wallet.app.domain.service

import com.wallet.app.data.local.entity.TransactionEntity
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CreditCardService @Inject constructor() {

    data class InvoiceDateInfo(
        val month: Int,
        val year: Int,
        val dueDate: String
    )

    fun calculateInvoiceInfo(
        date: String, // YYYY-MM-DD
        closingDay: Int,
        dueDay: Int
    ): InvoiceDateInfo {
        val cal = Calendar.getInstance()
        val parts = date.split("-").map { it.toInt() }
        cal.set(parts[0], parts[1] - 1, parts[2])

        val day = cal.get(Calendar.DAY_OF_MONTH)
        var month = cal.get(Calendar.MONTH) + 1
        var year = cal.get(Calendar.YEAR)

        if (day >= closingDay) {
            month++
            if (month > 12) {
                month = 1
                year++
            }
        }

        var dueMonth = month
        var dueYear = year
        if (dueDay < closingDay) {
            dueMonth++
            if (dueMonth > 12) {
                dueMonth = 1
                dueYear++
            }
        }

        val dueCal = Calendar.getInstance()
        dueCal.set(dueYear, dueMonth - 1, 1)
        val maxDay = dueCal.getActualMaximum(Calendar.DAY_OF_MONTH)
        val finalDueDay = dueDay.coerceAtMost(maxDay)
        
        val dueDateStr = String.format(Locale.US, "%04d-%02d-%02d", dueYear, dueMonth, finalDueDay)

        return InvoiceDateInfo(month, year, dueDateStr)
    }
}
