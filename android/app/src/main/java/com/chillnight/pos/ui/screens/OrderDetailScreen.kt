package com.chillnight.pos.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chillnight.pos.ui.theme.*
import com.chillnight.pos.viewmodel.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailScreen(
    orderId: String,
    viewModel: AppViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val order by viewModel.currentOrderDetail.collectAsState()

    var showPaymentDialog by remember { mutableStateOf(false) }
    var showCancelDialog by remember { mutableStateOf(false) }

    LaunchedEffect(orderId) {
        viewModel.loadOrderDetail(orderId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = if (order != null) "Order #${order!!.orderNumber}" else "Order Details",
                        fontWeight = FontWeight.Bold,
                        color = TextLight
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = TextLight)
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadOrderDetail(orderId) }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = OrangePrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSlate800)
            )
        },
        containerColor = DarkSlate900
    ) { padding ->
        val current = order
        if (current == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = OrangePrimary)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // WhatsApp Share Banner
                item {
                    Button(
                        onClick = { viewModel.shareOrderOnWhatsApp(context, current) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = GreenSuccess),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Send, contentDescription = null, tint = Color.White)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Share Live Tracking on WhatsApp",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 15.sp,
                            color = Color.White
                        )
                    }
                }

                // Tracking Link Copy Card
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = DarkSlate800),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Customer Tracking URL", fontSize = 11.sp, color = TextMuted)
                                Text(
                                    text = current.trackingUrl ?: "Token: ${current.trackingToken}",
                                    fontSize = 12.sp,
                                    color = Color(0xFF38BDF8),
                                    maxLines = 1
                                )
                            }
                            IconButton(
                                onClick = {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    val clip = ClipData.newPlainText("Tracking Link", current.trackingUrl ?: "")
                                    clipboard.setPrimaryClip(clip)
                                    Toast.makeText(context, "Tracking URL copied!", Toast.LENGTH_SHORT).show()
                                }
                            ) {
                                Icon(Icons.Default.ContentCopy, contentDescription = "Copy", tint = OrangePrimary)
                            }
                        }
                    }
                }

                // Order Status Controls
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = DarkSlate800),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Order Status", fontWeight = FontWeight.Bold, color = TextLight, fontSize = 15.sp)
                                StatusBadge(status = current.status)
                            }

                            val statuses = if (current.orderType == "DELIVERY") {
                                listOf("CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED")
                            } else {
                                listOf("CONFIRMED", "PREPARING", "READY", "DELIVERED")
                            }

                            Text("Tap to update live customer status:", fontSize = 12.sp, color = TextMuted)

                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                statuses.chunked(2).forEach { rowStatuses ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        rowStatuses.forEach { st ->
                                            val isSelected = current.status == st
                                            Button(
                                                onClick = { viewModel.updateOrderStatus(current.id, st) },
                                                modifier = Modifier.weight(1f),
                                                colors = ButtonDefaults.buttonColors(
                                                    containerColor = if (isSelected) OrangePrimary else DarkSlate700
                                                ),
                                                shape = RoundedCornerShape(8.dp)
                                            ) {
                                                Text(
                                                    text = st.replace("_", " "),
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                OutlinedButton(
                                    onClick = {
                                        viewModel.addEstimateMinutes(current.id, 10)
                                        Toast.makeText(context, "Added +10 mins to customer countdown", Toast.LENGTH_SHORT).show()
                                    },
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Icon(Icons.Default.MoreTime, contentDescription = null, tint = OrangePrimary, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("+10m Estimate", fontSize = 12.sp, color = TextLight)
                                }

                                if (current.status != "CANCELLED" && current.status != "DELIVERED") {
                                    TextButton(onClick = { showCancelDialog = true }) {
                                        Text("Cancel Order", color = RedDanger, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }

                // Customer Information
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = DarkSlate800),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text("Customer Info (${current.orderType})", fontWeight = FontWeight.Bold, color = OrangePrimary, fontSize = 13.sp)
                            Text("Name: ${current.customerName}", color = TextLight, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                            Text("Phone: ${current.customerPhone}", color = TextMuted, fontSize = 13.sp)
                            if (current.deliveryAddress != null) {
                                Text("Address: ${current.deliveryAddress}", color = TextLight, fontSize = 13.sp)
                            }
                        }
                    }
                }

                // Order Items Snapshot
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = DarkSlate800),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text("Ordered Items", fontWeight = FontWeight.Bold, color = OrangePrimary, fontSize = 13.sp)
                            val itemsList = current.items ?: emptyList()
                            itemsList.forEach { item ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = "${item.quantity}x ${item.name}",
                                        color = TextLight,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                    Text(
                                        text = "Rs. ${item.subtotal.toInt()}",
                                        color = TextLight,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }

                // Payment & Bill Card
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = DarkSlate800),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Bill & Payment", fontWeight = FontWeight.Bold, color = OrangePrimary, fontSize = 13.sp)
                                TextButton(onClick = { showPaymentDialog = true }) {
                                    Text("Update Payment", color = GreenSuccess, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Subtotal", color = TextMuted, fontSize = 13.sp)
                                Text("Rs. ${current.subtotal.toInt()}", color = TextLight, fontSize = 13.sp)
                            }
                            if (current.orderType == "DELIVERY") {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Delivery Fee", color = TextMuted, fontSize = 13.sp)
                                    Text("Rs. ${current.deliveryFee.toInt()}", color = TextLight, fontSize = 13.sp)
                                }
                            }
                            Divider(color = DarkSlate700, modifier = Modifier.padding(vertical = 4.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Total Bill", color = TextLight, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Text("Rs. ${current.totalAmount.toInt()}", color = OrangePrimary, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Amount Paid (${current.paymentMethod})", color = TextMuted, fontSize = 13.sp)
                                Text("Rs. ${current.amountPaid.toInt()}", color = GreenSuccess, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Remaining Balance", color = TextMuted, fontSize = 13.sp)
                                Text("Rs. ${current.remainingAmount.toInt()}", color = if (current.remainingAmount > 0) RedDanger else TextMuted, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }

                            if (current.paymentStatus != "PAID") {
                                Spacer(modifier = Modifier.height(6.dp))
                                Button(
                                    onClick = {
                                        viewModel.updateOrderPayment(current.id, current.paymentMethod, current.totalAmount)
                                        Toast.makeText(context, "Order marked as Full PAID!", Toast.LENGTH_SHORT).show()
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = ButtonDefaults.buttonColors(containerColor = GreenSuccess),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text("Mark Full Bill Paid (Rs. ${current.totalAmount.toInt()})", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }

                item { Spacer(modifier = Modifier.height(40.dp)) }
            }

            // Update Payment Dialog
            if (showPaymentDialog) {
                var paidInput by remember { mutableStateOf(current.amountPaid.toInt().toString()) }
                var methodInput by remember { mutableStateOf(current.paymentMethod) }

                AlertDialog(
                    onDismissRequest = { showPaymentDialog = false },
                    containerColor = DarkSlate800,
                    title = { Text("Update Payment", color = TextLight, fontWeight = FontWeight.Bold) },
                    text = {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf("CASH", "CARD", "ONLINE").forEach { m ->
                                    FilterChip(
                                        selected = methodInput == m,
                                        onClick = { methodInput = m },
                                        label = { Text(m, fontSize = 11.sp) }
                                    )
                                }
                            }
                            OutlinedTextField(
                                value = paidInput,
                                onValueChange = { paidInput = it },
                                label = { Text("Amount Paid (Total: Rs. ${current.totalAmount.toInt()})") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                val paidVal = paidInput.toDoubleOrNull() ?: 0.0
                                viewModel.updateOrderPayment(current.id, methodInput, paidVal)
                                showPaymentDialog = false
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary)
                        ) {
                            Text("Save")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showPaymentDialog = false }) {
                            Text("Cancel", color = TextMuted)
                        }
                    }
                )
            }

            // Cancel Order Dialog
            if (showCancelDialog) {
                var reason by remember { mutableStateOf("") }
                AlertDialog(
                    onDismissRequest = { showCancelDialog = false },
                    containerColor = DarkSlate800,
                    title = { Text("Cancel Order #${current.orderNumber}?", color = RedDanger, fontWeight = FontWeight.Bold) },
                    text = {
                        OutlinedTextField(
                            value = reason,
                            onValueChange = { reason = it },
                            label = { Text("Reason for cancellation") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                viewModel.updateOrderStatus(current.id, "CANCELLED", reason.ifBlank { "Cancelled by restaurant" })
                                showCancelDialog = false
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = RedDanger)
                        ) {
                            Text("Confirm Cancel")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showCancelDialog = false }) {
                            Text("Back", color = TextMuted)
                        }
                    }
                )
            }
        }
    }
}
