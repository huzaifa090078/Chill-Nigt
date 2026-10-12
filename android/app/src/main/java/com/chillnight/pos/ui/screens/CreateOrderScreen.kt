package com.chillnight.pos.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import com.chillnight.pos.model.Order
import com.chillnight.pos.ui.theme.*
import com.chillnight.pos.viewmodel.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateOrderScreen(
    viewModel: AppViewModel,
    onOrderCreatedNavigate: (String) -> Unit
) {
    val context = LocalContext.current
    val categories by viewModel.categories.collectAsState()
    val menuItems by viewModel.menuItems.collectAsState()
    val cartItems by viewModel.cartItems.collectAsState()
    val customerName by viewModel.customerName.collectAsState()
    val customerPhone by viewModel.customerPhone.collectAsState()
    val orderType by viewModel.orderType.collectAsState()
    val deliveryAddress by viewModel.deliveryAddress.collectAsState()
    val deliveryFee by viewModel.deliveryFee.collectAsState()
    val prepTime by viewModel.prepTimeMinutes.collectAsState()
    val deliveryTime by viewModel.deliveryTimeMinutes.collectAsState()
    val paymentMethod by viewModel.paymentMethod.collectAsState()
    val amountPaid by viewModel.amountPaid.collectAsState()
    val isSubmitting by viewModel.isSubmittingOrder.collectAsState()

    var selectedCatId by remember { mutableStateOf<String?>(null) }
    var currentStep by remember { mutableStateOf(0) } // 0 = Select Items, 1 = Customer & Checkout
    var createdOrderDialog by remember { mutableStateOf<Order?>(null) }

    LaunchedEffect(Unit) {
        viewModel.loadCategories()
        viewModel.loadMenuItems()
    }

    val availableItems = menuItems.filter {
        it.isAvailable == 1 && (selectedCatId == null || it.categoryId == selectedCatId)
    }

    val subtotal = viewModel.calculateCartSubtotal()
    val totalBill = viewModel.calculateTotalBill()
    val totalItemsCount = cartItems.values.sum()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = if (currentStep == 0) "1. Select Menu Items" else "2. Customer & Bill Details",
                        fontWeight = FontWeight.Bold,
                        color = TextLight
                    )
                },
                actions = {
                    if (cartItems.isNotEmpty()) {
                        TextButton(onClick = { viewModel.clearCart() }) {
                            Text("Clear", color = RedDanger)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSlate800)
            )
        },
        bottomBar = {
            Surface(
                color = DarkSlate800,
                tonalElevation = 8.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "$totalItemsCount items • Subtotal: Rs. ${subtotal.toInt()}",
                            color = TextMuted,
                            fontSize = 12.sp
                        )
                        Text(
                            text = "Total: Rs. ${totalBill.toInt()}",
                            color = OrangePrimary,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                    }

                    if (currentStep == 0) {
                        Button(
                            onClick = {
                                if (cartItems.isEmpty()) {
                                    Toast.makeText(context, "Select at least 1 item", Toast.LENGTH_SHORT).show()
                                } else {
                                    currentStep = 1
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = OrangePrimary),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Next: Checkout", fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.width(6.dp))
                            Icon(Icons.Default.ArrowForward, contentDescription = null, modifier = Modifier.size(16.dp))
                        }
                    } else {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = { currentStep = 0 },
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Back", color = TextLight)
                            }
                            Button(
                                onClick = {
                                    viewModel.submitOrder(
                                        onSuccess = { created ->
                                            createdOrderDialog = created
                                        },
                                        onError = { err ->
                                            Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                                        }
                                    )
                                },
                                enabled = !isSubmitting,
                                colors = ButtonDefaults.buttonColors(containerColor = GreenSuccess),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text(
                                    text = if (isSubmitting) "Saving..." else "Confirm Order",
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }
            }
        },
        containerColor = DarkSlate900
    ) { padding ->
        if (currentStep == 0) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                // Category Filter Bar
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        FilterChip(
                            selected = selectedCatId == null,
                            onClick = { selectedCatId = null },
                            label = { Text("All") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = OrangePrimary,
                                selectedLabelColor = Color.White
                            )
                        )
                    }
                    items(categories) { cat ->
                        FilterChip(
                            selected = selectedCatId == cat.id,
                            onClick = { selectedCatId = cat.id },
                            label = { Text(cat.name) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = OrangePrimary,
                                selectedLabelColor = Color.White
                            )
                        )
                    }
                }

                // Menu Items Selection List
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(availableItems) { item ->
                        val qty = cartItems[item.id] ?: 0
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = if (qty > 0) DarkSlate800.copy(alpha = 0.95f) else DarkSlate800
                            ),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = item.name,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp,
                                        color = TextLight
                                    )
                                    Text(
                                        text = "Rs. ${item.price.toInt()}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = OrangePrimary
                                    )
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    if (qty > 0) {
                                        FilledIconButton(
                                            onClick = { viewModel.removeFromCart(item.id) },
                                            modifier = Modifier.size(34.dp),
                                            colors = IconButtonDefaults.filledIconButtonColors(containerColor = DarkSlate700)
                                        ) {
                                            Icon(Icons.Default.Remove, contentDescription = "Decrease", tint = TextLight)
                                        }
                                        Text(
                                            text = "$qty",
                                            fontWeight = FontWeight.ExtraBold,
                                            fontSize = 16.sp,
                                            color = TextLight
                                        )
                                    }
                                    FilledIconButton(
                                        onClick = { viewModel.addToCart(item.id) },
                                        modifier = Modifier.size(34.dp),
                                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = OrangePrimary)
                                    ) {
                                        Icon(Icons.Default.Add, contentDescription = "Increase", tint = Color.White)
                                    }
                                }
                            }
                        }
                    }
                    item { Spacer(modifier = Modifier.height(30.dp)) }
                }
            }
        } else {
            // Step 1: Customer & Order Form
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Order Type Selector: Takeaway vs Home Delivery
                item {
                    Text("Order Type", fontWeight = FontWeight.Bold, color = TextLight, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        FilterChip(
                            selected = orderType == "TAKEAWAY",
                            onClick = { viewModel.orderType.value = "TAKEAWAY" },
                            label = { Text("Takeaway / Pickup", modifier = Modifier.padding(vertical = 6.dp)) },
                            leadingIcon = { Icon(Icons.Default.ShoppingBag, contentDescription = null) },
                            modifier = Modifier.weight(1f),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = OrangePrimary,
                                selectedLabelColor = Color.White
                            )
                        )
                        FilterChip(
                            selected = orderType == "DELIVERY",
                            onClick = { viewModel.orderType.value = "DELIVERY" },
                            label = { Text("Home Delivery", modifier = Modifier.padding(vertical = 6.dp)) },
                            leadingIcon = { Icon(Icons.Default.DeliveryDining, contentDescription = null) },
                            modifier = Modifier.weight(1f),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = OrangePrimary,
                                selectedLabelColor = Color.White
                            )
                        )
                    }
                }

                // Customer Name & Phone
                item {
                    OutlinedTextField(
                        value = customerName,
                        onValueChange = { viewModel.customerName.value = it },
                        label = { Text("Customer Name *") },
                        leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = OrangePrimary) },
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                item {
                    OutlinedTextField(
                        value = customerPhone,
                        onValueChange = { viewModel.customerPhone.value = it },
                        label = { Text("Customer WhatsApp Phone (e.g. +923001234567) *") },
                        leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null, tint = OrangePrimary) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // Delivery Address & Fee (Only if Home Delivery)
                if (orderType == "DELIVERY") {
                    item {
                        OutlinedTextField(
                            value = deliveryAddress,
                            onValueChange = { viewModel.deliveryAddress.value = it },
                            label = { Text("Full Delivery Address *") },
                            leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null, tint = OrangePrimary) },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedTextField(
                                value = deliveryFee,
                                onValueChange = { viewModel.deliveryFee.value = it },
                                label = { Text("Delivery Fee (Rs.)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = deliveryTime,
                                onValueChange = { viewModel.deliveryTimeMinutes.value = it },
                                label = { Text("Delivery Transit (Mins)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                // Preparation Time
                item {
                    Text("Estimated Preparation Time (Minutes)", fontWeight = FontWeight.Bold, color = TextLight, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("15", "20", "30", "45").forEach { mins ->
                            FilterChip(
                                selected = prepTime == mins,
                                onClick = { viewModel.prepTimeMinutes.value = mins },
                                label = { Text("$mins mins") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = OrangePrimary,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }
                }

                // Payment Method & Amount Paid
                item {
                    Text("Payment Method", fontWeight = FontWeight.Bold, color = TextLight, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("CASH", "CARD", "ONLINE").forEach { method ->
                            FilterChip(
                                selected = paymentMethod == method,
                                onClick = { viewModel.paymentMethod.value = method },
                                label = { Text(method) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = OrangePrimary,
                                    selectedLabelColor = Color.White
                                )
                            )
                        }
                    }
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = amountPaid,
                            onValueChange = { viewModel.amountPaid.value = it },
                            label = { Text("Amount Paid Now (Rs.)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        Button(
                            onClick = { viewModel.amountPaid.value = totalBill.toInt().toString() },
                            colors = ButtonDefaults.buttonColors(containerColor = DarkSlate700)
                        ) {
                            Text("Full Paid", fontSize = 12.sp)
                        }
                    }
                }

                item { Spacer(modifier = Modifier.height(30.dp)) }
            }
        }
    }

    // Order Created Success & WhatsApp Share Dialog
    createdOrderDialog?.let { createdOrder ->
        AlertDialog(
            onDismissRequest = {
                val id = createdOrder.id
                createdOrderDialog = null
                onOrderCreatedNavigate(id)
            },
            containerColor = DarkSlate800,
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = GreenSuccess)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Order #${createdOrder.orderNumber} Confirmed!", color = TextLight, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Customer: ${createdOrder.customerName}", color = TextLight, fontWeight = FontWeight.SemiBold)
                    Text("Total Bill: Rs. ${createdOrder.totalAmount.toInt()} (${createdOrder.paymentStatus})", color = OrangePrimary, fontWeight = FontWeight.Bold)
                    Divider(color = DarkSlate700, modifier = Modifier.padding(vertical = 4.dp))
                    Text("Tracking Link:", color = TextMuted, fontSize = 12.sp)
                    Text(createdOrder.trackingUrl ?: "", color = Color(0xFF38BDF8), fontSize = 12.sp)
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.shareOrderOnWhatsApp(context, createdOrder)
                        val id = createdOrder.id
                        createdOrderDialog = null
                        onOrderCreatedNavigate(id)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = GreenSuccess)
                ) {
                    Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Send on WhatsApp", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        val id = createdOrder.id
                        createdOrderDialog = null
                        onOrderCreatedNavigate(id)
                    }
                ) {
                    Text("View Order", color = TextLight)
                }
            }
        )
    }
}
